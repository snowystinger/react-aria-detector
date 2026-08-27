import './shared.js';

console.log('react-aria-detector background script started!');

// The background worker is the single writer for chrome.storage.local. Content
// scripts run in every frame of every tab (all_frames) and the popup runs in
// its own context; if each did its own get -> modify -> set, concurrent updates
// would clobber one another. Instead every mutation is sent here as a message
// and run through this serialized queue, so read-modify-write is atomic.
let writeQueue = Promise.resolve();
function enqueue(task) {
    writeQueue = writeQueue.then(task, task).catch((e) => {
        console.error('react-aria-detector: storage task failed', e);
    });
    return writeQueue;
}

// One-time migration of the legacy `bannedDomains` key to `ignoredDomains`.
enqueue(async () => {
    let {ignoredDomains, bannedDomains} = await chrome.storage.local.get(['ignoredDomains', 'bannedDomains']);
    if (!ignoredDomains && bannedDomains) {
        await chrome.storage.local.set({ignoredDomains: bannedDomains.slice()});
        await chrome.storage.local.remove('bannedDomains');
    }
});

function effectiveIgnored(ignoredDomains) {
    return globalThis.RAD.DEFAULT_IGNORED.concat(ignoredDomains ?? []);
}

async function recordDomain(domain, components) {
    if (!domain) {
        return;
    }
    let {domains = [], components: comps = {}, ignoredDomains = []} =
        await chrome.storage.local.get(['domains', 'components', 'ignoredDomains']);
    // Never record an ignored domain, even if a stale content script asks.
    if (globalThis.RAD.isIgnored(domain, effectiveIgnored(ignoredDomains))) {
        return;
    }
    let changed = false;
    if (!domains.includes(domain)) {
        domains.push(domain);
        changed = true;
    }
    let prev = comps[domain] ?? [];
    let merged = Array.from(new Set(prev.concat(components ?? []))).sort();
    if (merged.length !== prev.length || merged.some((c, i) => c !== prev[i])) {
        comps[domain] = merged;
        changed = true;
    }
    if (changed) {
        await chrome.storage.local.set({domains: domains, components: comps});
    }
}

async function pruneDomain(domain) {
    if (!domain) {
        return;
    }
    let {domains = [], components = {}} = await chrome.storage.local.get(['domains', 'components']);
    let had = domains.includes(domain) || Object.prototype.hasOwnProperty.call(components, domain);
    if (!had) {
        return;
    }
    delete components[domain];
    await chrome.storage.local.set({domains: domains.filter((d) => d !== domain), components: components});
}

async function ignoreDomain(domain) {
    let value = (domain || '').trim();
    if (!value) {
        return;
    }
    let {ignoredDomains = [], domains = [], components = {}} =
        await chrome.storage.local.get(['ignoredDomains', 'domains', 'components']);
    if (!ignoredDomains.includes(value)) {
        ignoredDomains.push(value);
    }
    delete components[value];
    await chrome.storage.local.set({
        ignoredDomains: ignoredDomains,
        domains: domains.filter((d) => d !== value),
        components: components
    });
}

async function unignoreDomain(domain) {
    let {ignoredDomains = []} = await chrome.storage.local.get('ignoredDomains');
    await chrome.storage.local.set({ignoredDomains: ignoredDomains.filter((d) => d !== domain)});
}

async function pauseDomain(domain) {
    if (!domain) {
        return;
    }
    let {pausedDomains = []} = await chrome.storage.local.get('pausedDomains');
    if (!pausedDomains.includes(domain)) {
        pausedDomains.push(domain);
        await chrome.storage.local.set({pausedDomains: pausedDomains});
    }
}

async function unpauseDomain(domain) {
    let {pausedDomains = []} = await chrome.storage.local.get('pausedDomains');
    await chrome.storage.local.set({pausedDomains: pausedDomains.filter((d) => d !== domain)});
}

const HANDLERS = {
    record: (msg) => recordDomain(msg.domain, msg.components),
    prune: (msg) => pruneDomain(msg.domain),
    ignore: (msg) => ignoreDomain(msg.domain),
    unignore: (msg) => unignoreDomain(msg.domain),
    pause: (msg) => pauseDomain(msg.domain),
    unpause: (msg) => unpauseDomain(msg.domain)
};

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || !msg.type) {
        return;
    }
    // Show the "fan" badge on the tab that detected React Aria.
    if (msg.type === 'record' && sender.tab) {
        chrome.action.setBadgeText({text: 'fan', tabId: sender.tab.id});
        chrome.action.setBadgeBackgroundColor({color: 'green', tabId: sender.tab.id});
    }
    let handler = HANDLERS[msg.type];
    if (!handler) {
        return;
    }
    // Returning true (and responding after the queued write resolves) keeps the
    // MV3 service worker alive until the storage write actually finishes, so
    // mutations are never dropped when the worker would otherwise go idle.
    enqueue(() => handler(msg)).then(function () {
        try {
            sendResponse({ok: true});
        } catch (e) {
            // The sender (e.g. a closed popup) may no longer be listening.
        }
    });
    return true;
});
