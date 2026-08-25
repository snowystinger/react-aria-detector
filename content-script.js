var selector = '[id^=react-aria]';

function logError(context) {
  return function (e) {
    console.error('react-aria-detector: ' + context, e);
  };
}

function collectComponents() {
  var els = document.querySelectorAll('[class*="react-aria-"], [id^="react-aria"]');
  var set = new Set();
  els.forEach(function (el) {
    var name = globalThis.RAD.componentNameFor(el);
    if (name) {
      set.add(name);
    }
  });
  return Array.from(set).sort();
}

// All storage writes go through the background worker so concurrent frames/tabs
// can't clobber each other's updates. Content scripts only read and send.
function foundReactAria() {
  chrome.runtime.sendMessage({
    type: 'record',
    domain: window.location.hostname,
    components: collectComponents()
  });
}

// Effective ignore list (defaults + stored). Read-only: the one-time
// bannedDomains -> ignoredDomains migration happens in the background worker.
function getEffectiveIgnored() {
  return chrome.storage.local.get(['ignoredDomains', 'bannedDomains']).then(function (entries) {
    var ignored = entries.ignoredDomains ?? entries.bannedDomains ?? [];
    return globalThis.RAD.DEFAULT_IGNORED.concat(ignored);
  });
}

function checkForReactAria() {
  var domain = window.location.hostname;
  var observer;

  chrome.storage.onChanged.addListener(function (changes, namespace) {
    // Only react to the keys that affect this content script.
    if (!changes || (!changes.ignoredDomains && !changes.bannedDomains && !changes.pausedDomains)) {
      return;
    }
    getEffectiveIgnored().then(function (all) {
      if (globalThis.RAD.isIgnored(domain, all)) {
        if (observer) {
          observer.disconnect();
        }
        // Ask the background worker to remove any recorded data for this domain.
        chrome.runtime.sendMessage({type: 'prune', domain: domain});
      }
    }).catch(logError('ignore check on change'));
    chrome.storage.local.get('pausedDomains').then(function (entries) {
      var pausedDomains = entries.pausedDomains || [];
      if (pausedDomains.includes(domain) && observer) {
        console.log('React Aria detection paused on this domain. Disconnected observer.');
        observer.disconnect();
      }
    }).catch(logError('paused check on change'));
  });

  getEffectiveIgnored().then(function (all) {
    if (globalThis.RAD.isIgnored(domain, all)) {
      chrome.runtime.sendMessage({type: 'prune', domain: domain});
      return;
    }

    chrome.storage.local.get('pausedDomains').then(function (entries) {
      var pausedDomains = entries.pausedDomains || [];
      if (pausedDomains.includes(domain)) {
        console.log('React Aria detection paused on domain: ', domain);
        return;
      }

      chrome.storage.local.get('domains').then(function (entries) {
        var result = (entries.domains ?? []).includes(domain);
        if (result) {
          console.log('React Aria already found on this domain!');
          foundReactAria();
        } else {
          console.log('Checking for React Aria...');
          var reactAriaElements = document.querySelectorAll(selector);
          if (reactAriaElements.length > 0) {
            foundReactAria();
          } else {
            var promise = new Promise(function (resolve, reject) {
              setTimeout(() => {
                console.log('Checking for React Aria after load...');
                reactAriaElements = document.querySelectorAll(selector);
                if (reactAriaElements.length > 0) {
                  foundReactAria();
                  resolve();
                } else {
                  reject();
                }
              });
            });
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
      }).catch(logError('domains read'));
    }).catch(logError('paused read'));
  }).catch(logError('ignore read'));
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.action === 'pause') {
    chrome.runtime.sendMessage({type: 'pause', domain: window.location.hostname});
  }
});

checkForReactAria();
