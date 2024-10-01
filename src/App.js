import {useCallback, useEffect, useState, useMemo} from "react";
import {
    ActionButton,
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
    DisclosureHeader,
    DisclosurePanel,
    ContextualHelp,
    Heading,
    Content,
    Footer,
    Text,
    DialogTrigger,
    AlertDialog
} from '@react-spectrum/s2';
import "@react-spectrum/s2/page.css";
import './index.css';
import {style} from "@react-spectrum/s2/style" with { type: "macro" };

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

function renderBannedEmptyState() {
    return (
        <div style={{padding: '16px', textAlign: 'center'}}>
            No domains banned yet.
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
    let [bannedDomains, setBannedDomains] = useState([]);
    let [pausedDomains, setPausedDomains] = useState([]);
    let updateStateFromStorage = useCallback(() => {
        chrome.storage.local.get(['domains', 'bannedDomains', 'pausedDomains']).then(function (entries) {
            let bannedDomains = entries.bannedDomains ?? [];
            let pausedDomains = entries.pausedDomains ?? [];
            let allKeys = entries.domains ?? [];
            setDomains(allKeys);
            setBannedDomains(bannedDomains);
            setPausedDomains(pausedDomains);
        }, []);
    }, []);
    useEffect(() => {
        chrome.storage.onChanged.addListener(function (changes, namespace) {
            updateStateFromStorage();
        });
    }, []);
    useEffect(() => {
        updateStateFromStorage();
    }, []);

    let columns = useMemo(() => [{name: 'Domain', id: 'domain', isRowHeader: true}, {name: 'Actions', id: 'actions'}], []);
    let bannedColumns = useMemo(() => [{name: 'Banned domains', id: 'domain', isRowHeader: true}, {name: 'Actions', id: 'actions'}], []);
    let pausedColumns = useMemo(() => [{name: 'Paused domains', id: 'domain', isRowHeader: true}, {name: 'Actions', id: 'actions'}], []);
    let items = useMemo(() => domains.map(domain => ({domain, id: domain})), [domains]);
    let bannedItems = useMemo(() => bannedDomains.map(domain => ({domain, id: domain})), [bannedDomains]);
    let pausedItems = useMemo(() => pausedDomains.map(domain => ({domain, id: domain})), [pausedDomains]);

    return (
        <div className={style({width: '[400px]', height: '[600px]', display: 'flex', flexDirection: 'column', gap: 8, padding: 8, boxSizing: 'border-box'})}>
            <div className={style({display: 'flex', justifyContent: 'space-between'})}>
                <h1 id="table-title" className={style({flexGrow: 0, flexShrink: 0, font: 'heading-lg', marginBottom: 4, marginTop: 4})}>React Aria Detector</h1>
                <ContextualHelp>
                    <Heading>How to use</Heading>
                    <Content>
                        <Text>
                            <p>
                                This extension detects websites using React Aria and allows you to manage the list of domains as well as generate a report.
                            </p>
                            <p>
                                Excluding domains means that they won't show up in the auto generated report that you can get by clicking the "Copy" button.
                            </p>
                            <p>
                                Pausing for a domain will disconnect the mutation observer and will not try to find React Aria on the domain again until it is unpaused and the page is refreshed.
                            </p>
                            <p>
                                Reset storage will clear everything in the entire extension.
                            </p>
                        </Text>
                    </Content>
                    <Footer>
                    </Footer>
                </ContextualHelp>
            </div>
            <Accordion allowsMultipleExpanded defaultExpandedKeys={['react-aria-fans']}>
                <Disclosure id="react-aria-fans">
                    <DisclosureHeader>
                        <h2 id="table-title" className={style({flexGrow: 0, flexShrink: 0, font: 'heading', margin: 0})}>Domains using React Aria</h2>
                    </DisclosureHeader>
                    <DisclosurePanel>
                        <DomainTable
                            items={items}
                            columns={columns}
                            aria-labelledby="table-title"
                            actions={[
                                {name: 'Delete', onAction: (domain) => {
                                    chrome.storage.local.remove(domain);
                                }}, {name: 'Ban', onAction: (domain) => {
                                    chrome.storage.local.get('bannedDomains').then(function (entries) {
                                        let bannedDomains = entries.bannedDomains || [];
                                        bannedDomains.push(domain);
                                        chrome.storage.local.set({bannedDomains});
                                    });
                                }}, {name: 'Pause', onAction: (domain) => {
                                    chrome.storage.local.get('pausedDomains').then(function (entries) {
                                        let pausedDomains = entries.pausedDomains || [];
                                        pausedDomains.push(domain);
                                        chrome.storage.local.set({pausedDomains});
                                    });
                                }}]}
                                renderEmptyState={renderEmptyState}
                            />
                    </DisclosurePanel>
                </Disclosure>
                <Disclosure id="banned-domains">
                    <DisclosureHeader>
                        <h2 id="banned-table-title" className={style({flexGrow: 0, flexShrink: 0, font: 'heading', margin: 0})}>Domains excluded</h2>
                    </DisclosureHeader>
                    <DisclosurePanel>
                        <DomainTable
                            items={bannedItems}
                            columns={bannedColumns}
                            aria-labelledby="banned-table-title"
                            actions={[
                                {name: 'Unban', onAction: (domain) => {
                                    chrome.storage.local.get('bannedDomains').then(function (entries) {
                                        let bannedDomains = entries.bannedDomains || [];
                                        bannedDomains = bannedDomains.filter(d => d !== domain);
                                        chrome.storage.local.set({bannedDomains});
                                    });
                                }}]}
                            renderEmptyState={renderBannedEmptyState}
                        />
                    </DisclosurePanel>
                </Disclosure>
                <Disclosure id="paused-domains">
                    <DisclosureHeader>
                        <h2 id="paused-table-title" className={style({flexGrow: 0, flexShrink: 0, font: 'heading', margin: 0})}>Domains on pause</h2>
                    </DisclosureHeader>
                    <DisclosurePanel>
                        <DomainTable
                            items={pausedItems}
                            columns={pausedColumns}
                            aria-labelledby="paused-table-title"
                            actions={[
                                {name: 'Unpause', onAction: (domain) => {
                                    chrome.storage.local.get('pausedDomains').then(function (entries) {
                                        let pausedDomains = entries.pausedDomains || [];
                                        pausedDomains = pausedDomains.filter(d => d !== domain);
                                        chrome.storage.local.set({pausedDomains});
                                    });
                                }}]}
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
                        // send message so the content-script can tell us the domain more easily
                        if (tabs[0]) {
                            chrome.tabs.sendMessage(tabs[0].id, {action: "pause"});
                        }
                    });
                }}>Pause domain</Button>
                <Button variant="accent" onPress={() => {
                    setClipboard(`😎 Report generated by RAD 😎\nSites using React Aria: ${domains.join(', ')}`);
                }}>Copy</Button>
            </ButtonGroup>
        </div>
    );
}

function DomainTable(props) {
    let {
        items,
        columns,
        'aria-labelledby': ariaLabelledBy,
        actions,
        renderEmptyState
    } = props;
    return (
        <TableView styles={style({height: 256})} aria-labelledby={ariaLabelledBy} overflowMode="wrap">
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
                            if(column.id === 'domain') {
                                return <Cell id={column.id}>{domain}</Cell>
                            } else {
                                return (
                                    <Cell id={column.id}>
                                        <div style={{display: 'flex', gap: '4px'}}>
                                            {actions.map(({name, onAction}) => (
                                                <ActionButton onPress={() => onAction(domain)}>{name}</ActionButton>
                                            ))}
                                        </div>
                                    </Cell>
                                );
                            }
                        }}
                    </Row>
                )}
            </TableBody>
        </TableView>
    )
}

//
// let [domains, setDomains] = useState([]);
// let [bannedDomains, setBannedDomains] = useState([]);
// useEffect(() => {
//     chrome.storage.local.get().then(function (entries) {
//         let allKeys = Object.keys(entries).filter(key => !reservedStorageKeys.includes(key));
//         setDomains(allKeys);
//         console.log('all keys:', allKeys)
//     }, []);
//     chrome.storage.local.get('bannedDomains').then(function (entries) {
//         let bannedDomains = entries.bannedDomains || [];
//         setBannedDomains(bannedDomains);
//     });
// }, []);
// let columns = useMemo(() => ['Domain', 'Actions'], []);
// let items = useMemo(() => domains.map(domain => ({domain, id: domain})), [domains]);
// return (
//     <div style={{maxWidth: '300px', maxHeight: '600px', display: 'flex', flexDirection: 'column', gap: '8px'}}>
//         <h1 id="table-title">Domains using React Aria</h1>
//         <Table aria-labelledby="table-title">
//             <TableHeader columns={columns}>
//                 {(column) => (
//                     <Column width={150} minWidth={150} isRowHeader={column.isRowHeader}>{column.name}</Column>
//                 )}
//             </TableHeader>
//             <TableBody items={items} renderEmptyState={renderEmptyState}Z>
//                 {item => (
//                     <Row columns={columns}>
//                         <Cell>{item.domain}</Cell>
//                         <Cell>
//                             <div style={{display: 'flex'}}>
//                                 <ActionButton onPress={() => {
//                                     chrome.storage.local.remove(domain);
//                                     setDomains(domains.filter(d => d !== domain));
//                                 }}>Delete</ActionButton>
//                                 <ActionButton onPress={() => {
//                                     chrome.storage.local.get('bannedDomains').then(function (entries) {
//                                         let bannedDomains = entries.bannedDomains || [];
//                                         bannedDomains.push(domain);
//                                         chrome.storage.local.set({bannedDomains});
//                                         setBannedDomains(bannedDomains);
//                                     });
//                                 }}>Ban</ActionButton>
//                             </div>
//                         </Cell>
//                     </Row>
//                 )}
//             </TableBody>
//         </Table>
