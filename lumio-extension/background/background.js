// this file adds right-click context menu, listens for clicks, and opens a new tab with the search results from the selected source

import { generateValidSources } from "../shared/constants.js";

// for right-click menu
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.removeAll(() => {
        chrome.contextMenus.create({
            id: "verify-with-compass",
            title: 'Verify "%s" with Compass',
            contexts: ["selection"]
        });
    });
});

// for when user clicks "verify with compass"
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "verify-with-compass" && info.selectionText) {
        const selectedText = info.selectionText.trim();
        const sourceLinks = generateValidSources(selectedText);

        // packaged data to be sent to the new tab
        const content = {
            claim: selectedText,
            sources: sourceLinks,
            timestamp: Date.now()
        };

        console.log("Compass Captured Data:", content);

        // send packaged data to the new tab with the content
        if (tab?.id) {
            chrome.tabs.sendMessage(tab.id, {
                type: "OPEN_COMPASS_PANEL",
                data: content
            });
        }
    }
});

/////////////////////////////////////////////////////////////////////////////////////////////////////////////
///for Background service worker: tab tracking, domain detection, calling Rossnie's storage wrapper (fidel)//
/////////////////////////////////////////////////////////////////////////////////////////////////////////////

import { AI_DOMAINS } from "../shared/constants.js";
import { logUsageEvent, getData, setData } from "../shared/storage.js";

const TICK_ALARM_NAME = "lumio-session-tick";
const TICK_INTERVAL_MINUTES = 1;
const GAP_THRESHOLD_MS = 5 * 60 * 1000; // matches SESSION_CONFIG.gapThresholdMinutes

// in-memory flag: is the tab the user is currently looking at an AI domain?
let activeAIDomain = null;

// --- helper ---
function getDomainFromUrl(url) {
    try {
        return new URL(url).hostname.replace(/^www\./, "");
    } catch {
        return null;
    }
}

function matchAIDomain(hostname) {
    if (!hostname) return null;
    return AI_DOMAINS.find(domain => hostname === domain || hostname.endsWith(`.${domain}`)) || null;
}

// --- session bookkeeping (companionState.js reads) ---
async function markActivity() {
    await setData("lastActivityTime", Date.now());
}

async function endSessionIfGapExceeded() {
    const session = await getData("currentSession");
    const lastActivity = await getData("lastActivityTime");
    if (!session || !lastActivity) return;

    if (Date.now() - lastActivity > GAP_THRESHOLD_MS) {
        // too much dead time passed, start counting a fresh session
        await setData("currentSession", { activeMs: 0, startedAt: Date.now() });
    }
}

async function tickActiveSession() {
    if (!activeAIDomain) return; // not on an AI tab rn, nothing to add

    await endSessionIfGapExceeded();

    const session = (await getData("currentSession")) || { activeMs: 0, startedAt: Date.now() };
    session.activeMs += TICK_INTERVAL_MINUTES * 60 * 1000;
    await setData("currentSession", session);
    await markActivity();
}

// core logic

async function handleTabUrl(url) {
    const domain = matchAIDomain(getDomainFromUrl(url));

    if (domain) {
        activeAIDomain = domain;
        await logUsageEvent(domain); // for storage wrapper -> writes to usageLogs
        await markActivity();

        const session = await getData("currentSession");
        if (!session) {
            await setData("currentSession", { activeMs: 0, startedAt: Date.now() });
        }
    } else {
        activeAIDomain = null;
    }
}

// page finished loading / navigated within a tab
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url) {
        handleTabUrl(tab.url);
    }
});

// user switched to a different tab
chrome.tabs.onActivated.addListener(({ tabId }) => {
    chrome.tabs.get(tabId, (tab) => {
        if (tab?.url) handleTabUrl(tab.url);
    });
});

// browser window itself lost/gained focus
chrome.windows.onFocusChanged.addListener((windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
        activeAIDomain = null; // browser unfocused, stop counting
    } else {
        chrome.tabs.query({ active: true, windowId }, (tabs) => {
            if (tabs[0]?.url) handleTabUrl(tabs[0].url);
        });
    }
});

// --- periodic tick so currentSession.activeMs actually grows over time ---
chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create(TICK_ALARM_NAME, { periodInMinutes: TICK_INTERVAL_MINUTES });
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === TICK_ALARM_NAME) {
        tickActiveSession();
    }
});

//////////////////////END/////////////////////////
//////////////////////////////////////////////////