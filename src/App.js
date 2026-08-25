import {useCallback, useEffect, useState, useMemo} from "react";
import '../shared.js';
import {
    Provider,
    ActionButton,
    ActionButtonGroup,
    Button,
    ButtonGroup,
    TableView,
    TableHeader,
    TableBody,
    Column,
    Row,
    Cell,
    Accordion,
    Disclosure,
    DisclosureTitle,
    DisclosurePanel,
    ContextualHelp,
    Heading,
    Content,
    Footer,
    Text,
    DialogTrigger,
    AlertDialog,
    Popover,
    TagGroup,
    Tag,
    TextField,
    ToastContainer,
    ToastQueue
} from '@react-spectrum/s2';
import "@react-spectrum/s2/page.css";
import './index.css';
import {style} from "@react-spectrum/s2/style" with { type: "macro" };

const {DEFAULT_IGNORED} = globalThis.RAD;

async function setClipboard(text) {
    const type = "text/plain";
    const blob = new Blob([text], { type });
    const data = [new ClipboardItem({ [type]: blob })];
    await navigator.clipboard.write(data);
}

function renderEmptyState() {
    return (
        <div style={{padding: '16px', textAlign: 'center'}}>
            No domains found. Visit some websites.
        </div>
    );
}

function renderIgnoredEmptyState() {
    return (
        <div style={{padding: '16px', textAlign: 'center'}}>
            No domains ignored yet.
        </div>
    );
}

function renderPausedEmptyState() {
    return (
        <div style={{padding: '16px', textAlign: 'center'}}>
            No domains paused yet.
        </div>
    );
}

export function App() {
    let [domains, setDomains] = useState([]);
    let [ignoredDomains, setIgnoredDomains] = useState([]);
    let [pausedDomains, setPausedDomains] = useState([]);
    let [components, setComponents] = useState({});
    let [newIgnored, setNewIgnored] = useState('');

    let updateStateFromStorage = useCallback(() => {
        // Read-only. The bannedDomains -> ignoredDomains migration and all writes
        // happen in the background worker; the popup only reads and sends messages.
        chrome.storage.local.get(['domains', 'ignoredDomains', 'bannedDomains', 'pausedDomains', 'components']).then(function (entries) {
            setDomains(entries.domains ?? []);
            setIgnoredDomains(entries.ignoredDomains ?? entries.bannedDomains ?? []);
            setPausedDomains(entries.pausedDomains ?? []);
            setComponents(entries.components ?? {});
        }).catch((e) => console.error('react-aria-detector: read storage', e));
    }, []);

    useEffect(() => {
        chrome.storage.onChanged.addListener(function (changes, namespace) {
            updateStateFromStorage();
        });
    }, []);
    useEffect(() => {
        updateStateFromStorage();
    }, []);

    // All mutations go through the background worker (the single serialized
    // storage writer) so concurrent tabs/frames can't clobber each other.
    let deleteDomain = useCallback((domain) => {
        chrome.runtime.sendMessage({type: 'prune', domain});
    }, []);

    let ignoreDomain = useCallback((domain) => {
        chrome.runtime.sendMessage({type: 'ignore', domain});
    }, []);

    let unignoreDomain = useCallback((domain) => {
        chrome.runtime.sendMessage({type: 'unignore', domain});
    }, []);

    let pauseDomain = useCallback((domain) => {
        chrome.runtime.sendMessage({type: 'pause', domain});
    }, []);

    let unpauseDomain = useCallback((domain) => {
        chrome.runtime.sendMessage({type: 'unpause', domain});
    }, []);

    let addIgnored = useCallback(() => {
        let value = (newIgnored || '').trim();
        if (value) {
            chrome.runtime.sendMessage({type: 'ignore', domain: value});
        }
        setNewIgnored('');
    }, [newIgnored]);

    let columns = useMemo(() => [{name: 'Domain', id: 'domain', isRowHeader: true}, {name: 'Actions', id: 'actions'}], []);
    let ignoredColumns = useMemo(() => [{name: 'Ignored domains', id: 'domain', isRowHeader: true}, {name: 'Actions', id: 'actions'}], []);
    let pausedColumns = useMemo(() => [{name: 'Paused domains', id: 'domain', isRowHeader: true}, {name: 'Actions', id: 'actions'}], []);
    let items = useMemo(() => domains.map(domain => ({domain, id: domain})), [domains]);
    let ignoredItems = useMemo(() => ignoredDomains.map(domain => ({domain, id: domain})), [ignoredDomains]);
    let pausedItems = useMemo(() => pausedDomains.map(domain => ({domain, id: domain})), [pausedDomains]);

    return (
        <Provider background="base" styles={style({width: '[400px]', height: '[600px]', display: 'flex', flexDirection: 'column', gap: 8, padding: 8, boxSizing: 'border-box'})}>
            <div className={style({display: 'flex', justifyContent: 'space-between'})}>
                <h1 id="table-title" className={style({flexGrow: 0, flexShrink: 0, font: 'heading-lg', marginBottom: 4, marginTop: 4})}>React Aria Detector</h1>
                <ContextualHelp>
                    <Heading>How to use</Heading>
                    <Content>
                        <Text>
                            <p>
                                This extension detects websites using React Aria and lets you manage the list of domains and generate a report.
                            </p>
                            <p>
                                Click a domain to see which React Aria components were detected on it.
                            </p>
                            <p>
                                Ignoring a domain removes it, keeps it out of the report, and stops it from being detected again. Some domains (localhost, our staging servers, etc.) are always ignored.
                            </p>
                            <p>
                                Pausing a domain disconnects the mutation observer and will not look for React Aria again until it is unpaused and the page is refreshed.
                            </p>
                            <p>
                                Reset storage clears everything in the entire extension.
                            </p>
                        </Text>
                    </Content>
                    <Footer>
                    </Footer>
                </ContextualHelp>
            </div>
            <Accordion allowsMultipleExpanded defaultExpandedKeys={['react-aria-fans']}>
                <Disclosure id="react-aria-fans">
                    <DisclosureTitle level={2}>Domains using React Aria ({domains.length})</DisclosureTitle>
                    <DisclosurePanel>
                        <DomainTable
                            items={items}
                            columns={columns}
                            components={components}
                            aria-label="Domains using React Aria"
                            actions={[
                                {name: 'Delete', onAction: deleteDomain},
                                {name: 'Ignore', onAction: ignoreDomain},
                                {name: 'Pause', onAction: pauseDomain}
                            ]}
                            renderEmptyState={renderEmptyState}
                        />
                    </DisclosurePanel>
                </Disclosure>
                <Disclosure id="ignored-domains">
                    <DisclosureTitle level={2}>Ignored ({ignoredDomains.length})</DisclosureTitle>
                    <DisclosurePanel>
                        <div className={style({display: 'flex', gap: 8, marginBottom: 8, alignItems: 'end'})}>
                            <TextField
                                aria-label="Add a domain to ignore"
                                placeholder="example.com"
                                value={newIgnored}
                                onChange={setNewIgnored}
                                onKeyDown={(e) => { if (e.key === 'Enter') { addIgnored(); } }}
                                styles={style({flexGrow: 1})}
                            />
                            <Button variant="secondary" onPress={addIgnored}>Add</Button>
                        </div>
                        <DomainTable
                            items={ignoredItems}
                            columns={ignoredColumns}
                            aria-label="Ignored domains"
                            actions={[{name: 'Unignore', onAction: unignoreDomain}]}
                            renderEmptyState={renderIgnoredEmptyState}
                        />
                        <Text styles={style({font: 'ui-sm', color: 'gray-600'})}>
                            Always ignored: {DEFAULT_IGNORED.join(', ')}
                        </Text>
                    </DisclosurePanel>
                </Disclosure>
                <Disclosure id="paused-domains">
                    <DisclosureTitle level={2}>Paused ({pausedDomains.length})</DisclosureTitle>
                    <DisclosurePanel>
                        <DomainTable
                            items={pausedItems}
                            columns={pausedColumns}
                            aria-label="Paused domains"
                            actions={[{name: 'Unpause', onAction: unpauseDomain}]}
                            renderEmptyState={renderPausedEmptyState}
                        />
                    </DisclosurePanel>
                </Disclosure>
            </Accordion>
            <ButtonGroup styles={style({flexGrow: 0, flexShrink: 0})}>
                <DialogTrigger>
                    <Button variant="negative">Reset storage</Button>
                    <AlertDialog
                        title="Reset storage"
                        variant="destructive"
                        primaryActionLabel="Reset"
                        cancelLabel="Cancel"
                        onPrimaryAction={() => {
                            chrome.storage.local.clear();
                        }}>
                        Are you sure you want to reset all storage? This will delete all domains and settings.
                    </AlertDialog>
                </DialogTrigger>
                <Button variant="secondary" onPress={() => {
                    chrome.tabs.query({active: true, currentWindow: true}, function(tabs){
                        if (tabs[0]) {
                            chrome.tabs.sendMessage(tabs[0].id, {action: "pause"});
                        }
                    });
                }}>Pause domain</Button>
                <Button variant="accent" onPress={() => {
                    setClipboard(`😎 Report generated by RAD 😎\nSites using React Aria: ${domains.join(', ')}`);
                    ToastQueue.positive('Report copied', {timeout: 3000});
                }}>Copy</Button>
            </ButtonGroup>
            <ToastContainer />
        </Provider>
    );
}

function DomainTable(props) {
    let {
        items,
        columns,
        'aria-label': ariaLabel,
        actions,
        renderEmptyState,
        components
    } = props;
    return (
        <TableView styles={style({height: 256})} aria-label={ariaLabel} overflowMode="wrap">
            <TableHeader columns={columns}>
                {(column) => (
                    <Column isRowHeader={column.isRowHeader}>{column.name}</Column>
                )}
            </TableHeader>
            <TableBody items={items} renderEmptyState={renderEmptyState}>
                {item => (
                    <Row columns={columns}>
                        {(column) => {
                            let domain = item.domain;
                            if (column.id === 'domain') {
                                if (components) {
                                    let comps = components[domain] ?? [];
                                    return (
                                        <Cell>
                                            <DialogTrigger>
                                                <ActionButton isQuiet aria-label={`Components used on ${domain}`}>{domain}</ActionButton>
                                                <Popover>
                                                    <div className={style({padding: 12, maxWidth: '[320px]'})}>
                                                        {comps.length > 0 ? (
                                                            <TagGroup aria-label={`Components used on ${domain}`}>
                                                                {comps.map((c) => <Tag key={c} id={c}>{c}</Tag>)}
                                                            </TagGroup>
                                                        ) : (
                                                            <Text>No components recorded.</Text>
                                                        )}
                                                    </div>
                                                </Popover>
                                            </DialogTrigger>
                                        </Cell>
                                    );
                                }
                                return <Cell>{domain}</Cell>;
                            } else {
                                return (
                                    <Cell>
                                        <ActionButtonGroup density="compact" size="S">
                                            {actions.map(({name, onAction}) => (
                                                <ActionButton key={name} onPress={() => onAction(domain)}>{name}</ActionButton>
                                            ))}
                                        </ActionButtonGroup>
                                    </Cell>
                                );
                            }
                        }}
                    </Row>
                )}
            </TableBody>
        </TableView>
    );
}
