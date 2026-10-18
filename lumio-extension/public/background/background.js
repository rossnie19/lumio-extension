import { generateValidSources, AI_DOMAINS, SESSION_CONFIG, DEFAULT_PET_NAME, DEFAULT_CHARACTER } from "../shared/constants.js";
import { getData, setData, addTodayStats, getTodayStats, LEGACY_KEYS } from "../shared/storage.js";
import { getCompanionMood } from "../shared/companionState.js";
import { rewriteClaim } from "../shared/claimRewrite.js";
import { searchSources } from "../shared/sourceSearch.js";

// --- INSTALL / UPDATE ---
chrome.runtime.onInstalled.addListener(async ({ reason }) => {
    if (reason === "install") {
        await setData("installDate", Date.now()); // the pet's age counts from here
    }
    await chrome.storage.local.remove(LEGACY_KEYS); // clean up data older versions wrote
});

// --- COMPASS CONTEXT MENU ---
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "verify-compass", // Matched ID to the event listener below
        title: 'Check "%s" with Compass',
        contexts: ["selection"]
    });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === "verify-compass" && info.selectionText) {
        const selectedText = info.selectionText.trim();
        if (!tab?.id) return;
        const requestId = `${Date.now()}-${Math.random()}`; // so the sidebar ignores results of an older claim

        try {
            // inject the sidebar script only when needed (activeTab allows it for the clicked tab).
            // works on tabs opened before the extension was installed/reloaded
            await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content-scripts/compass.js"] });
            const response = await chrome.tabs.sendMessage(tab.id, { action: "openCompass", text: selectedText, requestId });
            if (!response?.opened) return;
        } catch (err) {
            // e.g. chrome:// pages, the Chrome Web Store, PDFs: scripts can't run there
            console.warn("Compass could not open on this page:", err);
            return;
        }

        // only count the claim once the sidebar actually opened
        await setData("lastCompassUse", Date.now()); // drives the "focused" mood
        await addTodayStats({ claims: 1 });

        // the sidebar shows "searching" meanwhile. rewriting runs on this computer (or falls back to a
        // keyword cleanup); the search APIs only receive the short query. nothing is stored
        const { claim, query, usedAI } = await rewriteClaim(selectedText);
        const results = await searchSources(query);
        chrome.tabs.sendMessage(tab.id, {
            action: "compassResults",
            requestId,
            claim,
            query,
            usedAI,
            ...results,
            links: generateValidSources(query) // "search more on" links, using the cleaned-up query
        }).catch(() => {}); // the tab was closed or navigated away meanwhile
    }
});


// --- SESSION BOOKKEEPING (TAB TRACKING & DOMAIN DETECTION) ---
// currentSession is always shaped { startedAt, activeMs } and only created by startNewSession()

const TICK_ALARM_NAME = "lumio-session-tick";
const TICK_INTERVAL_MINUTES = 1;
const GAP_THRESHOLD_MS = SESSION_CONFIG.gapThresholdMinutes * 60 * 1000;
const AWAY_GRACE_MS = SESSION_CONFIG.awayGraceMinutes * 60 * 1000;

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

// remember when the user last actually looked at an AI tab (stored, since the worker can be shut down).
// drives session gaps, the away grace period, and the "idle"/"concerned" moods (see companionState.js)
async function markAIViewed() {
    await setData("lastAIViewTime", Date.now());
}

// which AI domain to credit this minute to:
// - the AI tab you're looking at (viewing = true)
// - otherwise the most recently used open AI tab, but only within AWAY_GRACE_MS of last looking at one
//   (so a forgotten tab stops counting)
// returns { domain, viewing }, or null = don't count this minute
async function getOpenAIDomain() {
    try {
        const focusedDomain = await getFocusedAIDomain();
        if (focusedDomain) return { domain: focusedDomain, viewing: true };

        const lastView = await getData("lastAIViewTime");
        if (!lastView || Date.now() - lastView > AWAY_GRACE_MS) return null; // away from AI tabs too long

        const tabs = await chrome.tabs.query({});
        const aiTabs = tabs
            .filter(tab => matchAIDomain(getDomainFromUrl(tab.url)))
            .sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
        return aiTabs.length ? { domain: matchAIDomain(getDomainFromUrl(aiTabs[0].url)), viewing: false } : null;
    } catch {
        return null;
    }
}

async function startNewSession() {
    await setData("currentSession", { startedAt: Date.now(), activeMs: 0 });
    await addTodayStats({ sessions: 1 });
}

// start a new session if there is none yet, or you haven't looked at an AI tab for longer than the gap.
// must run BEFORE markAIViewed(), otherwise the break is overwritten before it's noticed
async function ensureSession() {
    const session = await getData("currentSession");
    const lastView = await getData("lastAIViewTime");

    if (!session || !lastView || Date.now() - lastView > GAP_THRESHOLD_MS) {
        await startNewSession();
    }
}

async function tickActiveSession() {
    const open = await getOpenAIDomain();
    if (!open) return; // no AI tabs open rn (or away too long), nothing to add
    const { domain, viewing } = open;

    await ensureSession();
    if (viewing) await markAIViewed();

    const session = await getData("currentSession");
    session.activeMs += TICK_INTERVAL_MINUTES * 60 * 1000;
    await setData("currentSession", session);
    await addTodayStats({ minutes: TICK_INTERVAL_MINUTES, domain }); // domain feeds the "most used platform" chart
}

// viewed = the user is looking at this tab (not just a background tab finishing loading)
async function handleTabUrl(url, viewed) {
    const domain = matchAIDomain(getDomainFromUrl(url));
    if (!domain) return;

    if (!viewed) return; // a background tab reloading doesn't start or extend a session

    await ensureSession();
    await markAIViewed();
}

// page finished loading / navigated within a tab
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url) {
        handleTabUrl(tab.url, tab.active);
    }
});

// user switched to a different tab
chrome.tabs.onActivated.addListener(({ tabId }) => {
    chrome.tabs.get(tabId, (tab) => {
        if (tab?.url) handleTabUrl(tab.url, true);
    });
});

// browser window regained focus
chrome.windows.onFocusChanged.addListener((windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) return;
    chrome.tabs.query({ active: true, windowId }, (tabs) => {
        if (tabs[0]?.url) handleTabUrl(tabs[0].url, true);
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

// --- WALKING PET ON AI SITES ---
// content-scripts/pet.js asks for everything it needs to draw the pet in one message
async function getPetState() {
    const { activeCharacter, petName, showPetOnAISites } =
        await chrome.storage.local.get(["activeCharacter", "petName", "showPetOnAISites"]);
    return {
        enabled: showPetOnAISites !== false, // on unless switched off in the dashboard
        character: activeCharacter || DEFAULT_CHARACTER,
        petName: petName || DEFAULT_PET_NAME,
        mood: await getCompanionMood(),
        today: await getTodayStats()
    };
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "getPetState") {
        getPetState().then(sendResponse);
        return true; // answer asynchronously
    }
});
