var selector = '[id^=react-aria]';

var port = chrome.runtime.connect({name: "react-aria-detector"});

function foundReactAria() {
  port.postMessage({reactAria: true});
  let domain = window.location.hostname;
  chrome.storage.local.set({[domain]: true});
}

function checkForReactAria() {
  var reactAriaElements = document.querySelectorAll(selector);
  // check SSR
  if (reactAriaElements.length > 0) {
    foundReactAria();
  } else {
    // check for delayed react rendering
    let promise = new Promise(function (resolve, reject) {
      setTimeout(() => {
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
      let observer = new MutationObserver(function (mutations) {
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

checkForReactAria();
