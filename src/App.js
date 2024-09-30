import {useCallback, useEffect, useState} from "react";
import {ActionButton, Button, ButtonGroup} from '@react-spectrum/s2';
import "@react-spectrum/s2/page.css";

const reservedStorageKeys = ['bannedDomains'];

async function setClipboard(text) {
    const type = "text/plain";
    const blob = new Blob([text], { type });
    const data = [new ClipboardItem({ [type]: blob })];
    await navigator.clipboard.write(data);
}

export function App() {
    let [domains, setDomains] = useState([]);
    let [bannedDomains, setBannedDomains] = useState([]);
    let updateStateFromStorage = useCallback(() => {
        chrome.storage.local.get().then(function (entries) {
            let bannedDomains = entries.bannedDomains || [];
            let allKeys = Object.keys(entries)
                .filter(key => !reservedStorageKeys.includes(key))
                .filter(key => !bannedDomains.includes(key));
            setDomains(allKeys);
            console.log('all keys:', allKeys)
        }, []);
        chrome.storage.local.get('bannedDomains').then(function (entries) {
            let bannedDomains = entries.bannedDomains || [];
            console.log('banned domains:', bannedDomains)
            setBannedDomains(bannedDomains);
        });
    }, []);
    useEffect(() => {
        chrome.storage.onChanged.addListener(function (changes, namespace) {
            updateStateFromStorage();
        });
    }, []);
    useEffect(() => {
        updateStateFromStorage();
    }, []);
    return (
        <div style={{width: '300px', maxHeight: '600px', display: 'flex', flexDirection: 'column', gap: '8px'}}>
            <h1>Domains using React Aria</h1>
            <table>
                <thead>
                    <tr>
                        <th>Domain</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                {domains.map((domain, index) => {
                    return (
                        <tr key={index}>
                            <td>{domain}</td>
                            <td>
                                <div style={{display: 'flex', gap: '4px'}}>
                                    <ActionButton onPress={() => {
                                        chrome.storage.local.remove(domain);
                                    }}>Delete</ActionButton>
                                    <ActionButton onPress={() => {
                                        chrome.storage.local.get('bannedDomains').then(function (entries) {
                                            let bannedDomains = entries.bannedDomains || [];
                                            bannedDomains.push(domain);
                                            chrome.storage.local.set({bannedDomains});
                                        });
                                    }}>Ban</ActionButton>
                                </div>
                            </td>
                        </tr>
                    );
                })}
                </tbody>
            </table>
            {bannedDomains.length > 0 && (
                <table>
                    <thead>
                        <tr>
                            <th>Banned Domains</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bannedDomains.map((domain, index) => {
                            return (
                                <tr key={index}>
                                    <td>{domain}</td>
                                    <td>
                                        <ActionButton onPress={() => {
                                            chrome.storage.local.get('bannedDomains').then(function (entries) {
                                                let bannedDomains = entries.bannedDomains || [];
                                                bannedDomains = bannedDomains.filter(d => d !== domain);
                                                chrome.storage.local.set({bannedDomains});
                                            });
                                        }}>Unban</ActionButton>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
            <ButtonGroup>
                <Button variant="negative" onPress={() => {
                    chrome.storage.local.clear();
                }}>Reset local storage</Button>
                <Button variant="accent" onPress={() => {
                    setClipboard(`🤩 Sites using React Aria: ${JSON.stringify(domains)}`);
                }}>Copy</Button>
            </ButtonGroup>
        </div>
    );
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
