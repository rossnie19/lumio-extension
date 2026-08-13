import { generateValidSources } from "../shared/constants.js";
import { AI_DOMAINS } from "../shared/constants.js";
import { logUsageEvent, getData, setData } from "../shared/storage.js";

// --- COMPASS CONTEXT MENU ---
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "verify-compass", // Matched ID to the event listener below
        title: 'Verify "%s" with Compass',
        contexts: ["selection"]
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "verify-compass" && info.selectionText) {
        const selectedText = info.selectionText.trim();
        const sourceLinks = generateValidSources(selectedText);

        console.log("Compass Captured Data:", { claim: selectedText, sources: sourceLinks });

        if (tab?.id) {
            // Updated payload to match exactly what compass.js is listening for
            chrome.tabs.sendMessage(tab.id, {
                action: "openCompass",
                text: selectedText,
                links: sourceLinks
            });
        }
    }
});


// --- SESSION BOOKKEEPING (TAB TRACKING & DOMAIN DETECTION) ---

const TICK_ALARM_NAME = "lumio-session-tick";
const TICK_INTERVAL_MINUTES = 1;
const GAP_THRESHOLD_MS = 5 * 60 * 1000; // matches SESSION_CONFIG.gapThresholdMinutes

// in-memory flag: is the tab the user is currently looking at an AI domain?
let activeAIDomain = null;

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

// --- PERIODIC TICK ALARM ---
chrome.runtime.onInstalled.addListener(() => {
    chrome.alarms.create(TICK_ALARM_NAME, { periodInMinutes: TICK_INTERVAL_MINUTES });
});

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === TICK_ALARM_NAME) {
        tickActiveSession();
    }
});