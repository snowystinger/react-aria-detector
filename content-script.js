var selector = '[id^=react-aria]';

var port = chrome.runtime.connect({name: "react-aria-detector"});

function foundReactAria() {
  port.postMessage({reactAria: true});
  let domain = window.location.hostname;
  chrome.storage.local.get('domains').then(function (entries) {
    let domains = entries.domains ?? [];
    domains.push(domain);
    chrome.storage.local.set({domains: domains});
  });
}

function checkForReactAria() {
  let domain = window.location.hostname;
  let observer;
  chrome.storage.onChanged.addListener(function (changes, namespace) {
    chrome.storage.local.get('pausedDomains').then(function (entries) {
      let pausedDomains = entries.pausedDomains || [];
      if (pausedDomains.includes(domain) && observer) {
        console.log('React Aria detection paused on this domain. Disconnected observer.')
        observer.disconnect();
      }
    });
  });
  chrome.storage.local.get('pausedDomains').then(function (entries) {
    let pausedDomains = entries.pausedDomains || [];
    if (pausedDomains.includes(domain)) {
        console.log('React Aria detection paused on domain: ', domain);
        return;
    }

    chrome.storage.local.get('domains').then(function (entries) {
      let result = (entries.domains ?? []).includes(domain);
      if (result) {
        console.log('React Aria already found on this domain!');
        foundReactAria();
      } else {
        console.log('Checking for React Aria...');
        var reactAriaElements = document.querySelectorAll(selector);
        // check SSR
        if (reactAriaElements.length > 0) {
          foundReactAria();
        } else {
          // check for delayed react rendering
          let promise = new Promise(function (resolve, reject) {
            setTimeout(() => {
              console.log('Checking for React Aria after load...');
              // wait for react to potentially load, then check again.
              reactAriaElements = document.querySelectorAll(selector);
              if (reactAriaElements.length > 0) {
                foundReactAria();
                resolve();
              } else {
                reject();
              }
            });
          });
          // catch any later renders
          promise.catch(() => {
            console.log('Checking for React Aria in MutationObserver...');
            observer = new MutationObserver(function (mutations) {
              mutations.forEach(function (mutation) {
                if (mutation.addedNodes) {
                  for (let i = 0; i < mutation.addedNodes.length; i++) {
                    if (mutation.addedNodes[i].matches?.(selector)) {
                      foundReactAria();
                      observer.disconnect();
                      break;
                    }
                  }
                }
              });
            });
            observer.observe(document.body, {
              childList: true,
              subtree: true
            });
          });
        }
      }
    });
  });
}

chrome.runtime.onMessage.addListener( (message, sender, sendResponse) => {
  chrome.storage.local.get('pausedDomains').then(function (entries) {
    let pausedDomains = entries.pausedDomains || [];
    if (!pausedDomains.includes(window.location.hostname)) {
      pausedDomains.push(window.location.hostname);
      chrome.storage.local.set({pausedDomains: pausedDomains});
    }
  }, []);
});

checkForReactAria();
