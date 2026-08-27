const assert = require('node:assert');
const {DEFAULT_IGNORED, isIgnored, componentNameFor} = require('./shared.js');

// isIgnored: substring match against the effective list
assert.equal(isIgnored('localhost', DEFAULT_IGNORED), true);
assert.equal(isIgnored('app.d1pzu54gtk2aed.cloudfront.net', DEFAULT_IGNORED), true);
// prefix-style staging hosts: any reactspectrum.blob* / experience-qa.adobe* host
assert.equal(isIgnored('reactspectrum.blob.core.windows.net', DEFAULT_IGNORED), true);
assert.equal(isIgnored('experience-qa.adobe.com', DEFAULT_IGNORED), true);
assert.equal(isIgnored('experience-qa.adobe.io', DEFAULT_IGNORED), true);
assert.equal(isIgnored('example.com', DEFAULT_IGNORED), false);
assert.equal(isIgnored('sub.example.com', ['example.com']), true);
assert.equal(isIgnored('', DEFAULT_IGNORED), false);
assert.equal(isIgnored('example.com', []), false);

// componentNameFor: react-aria-<Name> class wins, else role, else null
const el = (attrs) => ({getAttribute: (k) => (k in attrs ? attrs[k] : null)});
assert.equal(componentNameFor(el({class: 'react-aria-Button foo'})), 'Button');
assert.equal(componentNameFor(el({class: 'x react-aria-TableBody y'})), 'TableBody');
assert.equal(componentNameFor(el({class: '_css-1abc', role: 'grid'})), 'grid');
assert.equal(componentNameFor(el({class: '_css-1abc'})), null);
assert.equal(componentNameFor(el({role: 'menu'})), 'menu');
assert.equal(componentNameFor(el({})), null);

// staging entries are present
['d1pzu54gtk2aed.cloudfront.net','d5iwopk28bdhl.cloudfront.net','reactspectrum.blob','experience-qa.adobe']
  .forEach((h) => assert.ok(DEFAULT_IGNORED.includes(h), 'missing ' + h));

console.log('shared.js tests passed');
