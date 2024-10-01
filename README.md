react-aria-detector
===========

Chrome extension that detects [React Aria](http://react-spectrum.adobe.com/) in apps as you browse.

Adds a badge to the extension icon when you come across a page that is built using React Aria.

It also has a popup that shows the detected React Aria version.

## Installation
1. clone this repo
2. go to chrome://extensions/
3. load unpacked extension (may need to turn on developer settings)
4. select git clone directory to load
5. start browsing

## Developing
1. do the installation steps
2. run `yarn`
3. edit files
4. run `yarn build`
5. refresh extension in chrome://extensions/
6. refresh target page so that the content script is re-injected

This is a fork from [react-detector](https://github.com/kentcdodds/react-detector) with many changes.

