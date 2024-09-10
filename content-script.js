var selector = '[id^=react-aria]';

var port = chrome.runtime.connect({name: "react-aria-detector"});
function checkForReactAria() {
  var reactAriaElements = document.querySelectorAll(selector);
  // check SSR
  if (reactAriaElements.length > 0) {
    port.postMessage({reactAria: true});
  } else {
    // check for delayed react rendering
    let promise = new Promise(function (resolve, reject) {
      setTimeout(() => {
        // wait for react to potentially load, then check again.
        reactAriaElements = document.querySelectorAll(selector);
        if (reactAriaElements.length > 0) {
          port.postMessage({reactAria: true});
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
                port.postMessage({reactAria: true});
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
