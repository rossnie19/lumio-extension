import { generateValidSources, AI_DOMAINS, SESSION_CONFIG } from "../shared/constants.js";
import { logUsageEvent, getData, setData, addTodayStats } from "../shared/storage.js";

// --- COMPASS CONTEXT MENU ---
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "verify-compass", // Matched ID to the event listener below
        title: 'Verify "%s" with Compass',
        contexts: ["selection"]
    });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "verify-compass" && info.selectionText) {
        const selectedText = info.selectionText.trim();
        const sourceLinks = generateValidSources(selectedText);

        const currentCount = await getData("verifiedClaimsCount") || 0;
        await setData("verifiedClaimsCount", currentCount + 1);
        await setData("lastCompassUse", Date.now()); // drives the "focused" mood

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
// currentSession is always shaped { startedAt, activeMs } and only created by startNewSession()

const TICK_ALARM_NAME = "lumio-session-tick";
const TICK_INTERVAL_MINUTES = 1;
const GAP_THRESHOLD_MS = SESSION_CONFIG.gapThresholdMinutes * 60 * 1000;

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

// AI domain of the tab the user is looking at right now (null if none, or browser unfocused).
// asked fresh every time because chrome can shut the service worker down and wipe in-memory variables
async function getFocusedAIDomain() {
    try {
        const win = await chrome.windows.getLastFocused({ populate: true });
        if (!win?.focused) return null;
        const tab = win.tabs?.find(t => t.active);
        return matchAIDomain(getDomainFromUrl(tab?.url));
    } catch {
        return null;
    }
}

async function markActivity() {
    await setData("lastActivityTime", Date.now());
}

async function startNewSession() {
    await setData("currentSession", { startedAt: Date.now(), activeMs: 0 });
    await addTodayStats({ sessions: 1 });
}

// start a new session if there is none yet, or too much dead time passed since the last activity
async function ensureSession() {
    const session = await getData("currentSession");
    const lastActivity = await getData("lastActivityTime");

    if (!session || !lastActivity || Date.now() - lastActivity > GAP_THRESHOLD_MS) {
        await startNewSession();
    }
}

async function tickActiveSession() {
    if (!(await getFocusedAIDomain())) return; // not on an AI tab rn, nothing to add

    await ensureSession();

    const session = await getData("currentSession");
    session.activeMs += TICK_INTERVAL_MINUTES * 60 * 1000;
    await setData("currentSession", session);
    await addTodayStats({ minutes: TICK_INTERVAL_MINUTES });
    await markActivity();
}

async function handleTabUrl(url) {
    const domain = matchAIDomain(getDomainFromUrl(url));
    if (!domain) return;

    await logUsageEvent(domain); // for storage wrapper -> writes to usageLogs
    await ensureSession(); // must run before markActivity, otherwise a long break is never noticed
    await markActivity();
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

// browser window regained focus
chrome.windows.onFocusChanged.addListener((windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) return;
    chrome.tabs.query({ active: true, windowId }, (tabs) => {
        if (tabs[0]?.url) handleTabUrl(tabs[0].url);
    });
});

// --- PERIODIC TICK ALARM ---
function createTickAlarm() {
    chrome.alarms.create(TICK_ALARM_NAME, { periodInMinutes: TICK_INTERVAL_MINUTES });
}
chrome.runtime.onInstalled.addListener(createTickAlarm);
chrome.runtime.onStartup.addListener(createTickAlarm); // alarms can be cleared when the browser restarts

chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === TICK_ALARM_NAME) {
        tickActiveSession();
    }
});
