console.log('react-aria-detector background script started!');

chrome.runtime.onConnect.addListener(function(port) {
    if (port.name === 'react-aria-detector') {
        port.onMessage.addListener(function(msg) {
            console.log(msg)
            if (msg.reactAria) {
                chrome.action.setBadgeText(
                    {
                        text: 'fan',
                        tabId: port.sender.tab.id
                    }
                );
                chrome.action.setBadgeBackgroundColor(
                    {
                        color: 'green',
                        tabId: port.sender.tab.id
                    }
                );
                console.log('React Aria found!');
            }
        })
    }
})

