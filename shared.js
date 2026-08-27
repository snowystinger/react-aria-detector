// Dependency-free helpers for React Aria Detector.
// Published to BOTH module.exports (Node/Parcel popup) and globalThis.RAD
// (classic content script) so every runtime can consume it.
(function () {
  var DEFAULT_IGNORED = [
    'localhost',
    '127.0.0.1',
    'local-credentialless',
    'csb.app',
    'chromatic',
    'stage.adobe',
    'echosignstage',
    'react-spectrum.adobe.com',
    'experience-qa.adobe',
    'd1pzu54gtk2aed.cloudfront.net',
    'd5iwopk28bdhl.cloudfront.net',
    'reactspectrum.blob'
  ];

  function isIgnored(hostname, ignoredList) {
    if (!hostname || !ignoredList) {
      return false;
    }
    return ignoredList.some(function (entry) {
      return entry && hostname.includes(entry);
    });
  }

  function componentNameFor(el) {
    if (!el || typeof el.getAttribute !== 'function') {
      return null;
    }
    var cls = el.getAttribute('class') || '';
    var match = cls.match(/(?:^|\s)react-aria-([A-Za-z]+)/);
    if (match) {
      return match[1];
    }
    var role = el.getAttribute('role');
    return role || null;
  }

  var api = {
    DEFAULT_IGNORED: DEFAULT_IGNORED,
    isIgnored: isIgnored,
    componentNameFor: componentNameFor
  };

  try {
    if (typeof module !== 'undefined' && module.exports) {
      module.exports = api;
    }
  } catch (e) { /* not a CommonJS/ESM context */ }
  if (typeof globalThis !== 'undefined') {
    globalThis.RAD = api;
  }
})();
