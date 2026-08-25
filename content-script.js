var selector = '[id^=react-aria]';

var port = chrome.runtime.connect({name: "react-aria-detector"});

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

function foundReactAria() {
  port.postMessage({reactAria: true});
  var domain = window.location.hostname;
  var found = collectComponents();
  chrome.storage.local.get(['domains', 'components']).then(function (entries) {
    var domains = entries.domains ?? [];
    var components = entries.components ?? {};
    if (!domains.includes(domain)) {
      domains.push(domain);
    }
    var prev = components[domain] ?? [];
    components[domain] = Array.from(new Set(prev.concat(found))).sort();
    chrome.storage.local.set({domains: domains, components: components});
  });
}

// Returns the effective ignore list (defaults + stored), migrating any legacy
// bannedDomains storage key into ignoredDomains once.
function getEffectiveIgnored() {
  return chrome.storage.local.get(['ignoredDomains', 'bannedDomains']).then(function (entries) {
    var ignored = entries.ignoredDomains;
    if (!ignored && entries.bannedDomains) {
      ignored = entries.bannedDomains.slice();
      chrome.storage.local.set({ignoredDomains: ignored});
      chrome.storage.local.remove('bannedDomains');
    }
    ignored = ignored ?? [];
    return globalThis.RAD.DEFAULT_IGNORED.concat(ignored);
  });
}

// If this domain is (now) ignored, remove any recorded data for it.
function pruneIfIgnored(domain) {
  return getEffectiveIgnored().then(function (all) {
    if (!globalThis.RAD.isIgnored(domain, all)) {
      return;
    }
    chrome.storage.local.get(['domains', 'components']).then(function (entries) {
      var domains = (entries.domains ?? []).filter(function (d) { return d !== domain; });
      var components = entries.components ?? {};
      delete components[domain];
      chrome.storage.local.set({domains: domains, components: components});
    });
  });
}

function checkForReactAria() {
  var domain = window.location.hostname;
  var observer;

  chrome.storage.onChanged.addListener(function (changes, namespace) {
    getEffectiveIgnored().then(function (all) {
      if (globalThis.RAD.isIgnored(domain, all)) {
        if (observer) {
          observer.disconnect();
        }
        pruneIfIgnored(domain);
      }
    });
    chrome.storage.local.get('pausedDomains').then(function (entries) {
      var pausedDomains = entries.pausedDomains || [];
      if (pausedDomains.includes(domain) && observer) {
        console.log('React Aria detection paused on this domain. Disconnected observer.');
        observer.disconnect();
      }
    });
  });

  getEffectiveIgnored().then(function (all) {
    if (globalThis.RAD.isIgnored(domain, all)) {
      pruneIfIgnored(domain);
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
      });
    });
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  chrome.storage.local.get('pausedDomains').then(function (entries) {
    var pausedDomains = entries.pausedDomains || [];
    if (!pausedDomains.includes(window.location.hostname)) {
      pausedDomains.push(window.location.hostname);
      chrome.storage.local.set({pausedDomains: pausedDomains});
    }
  }, []);
});

checkForReactAria();
