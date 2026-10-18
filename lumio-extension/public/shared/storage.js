//this file is the bridge between the extension and chrome database (chrome.storage.local)

//get value from storage
export async function getData(key) {
    const result = await chrome.storage.local.get(key);
    return result[key];
}

//set value in storage
export async function setData(key, value) {
    await chrome.storage.local.set({ [key]: value });
}

// --- DAILY HISTORY ---
// dailyHistory = { "YYYY-MM-DD": { minutes, sessions, claims, domainMinutes: { "chatgpt.com": 12 } } }
// it is the only place daily stats are stored; today's numbers are just today's entry

const HISTORY_DAYS_KEPT = 60;

//a date as "YYYY-MM-DD" (local time)
export function dayKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function emptyDay() {
    return { minutes: 0, sessions: 0, claims: 0, domainMinutes: {} };
}

export async function getHistory() {
    return (await getData("dailyHistory")) || {};
}

//get today's stats (zeros if nothing was tracked today yet)
export async function getTodayStats() {
    const today = (await getHistory())[dayKey()] || emptyDay();
    return { totalTimeMinutes: today.minutes, sessionsToday: today.sessions, claimsToday: today.claims };
}

async function writeTodayStats({ minutes, sessions, claims, domain }) {
    const history = await getHistory();
    const key = dayKey();
    const day = { ...emptyDay(), ...history[key] };

    day.minutes += minutes;
    day.sessions += sessions;
    day.claims += claims;
    if (domain && minutes) {
        day.domainMinutes = { ...day.domainMinutes, [domain]: (day.domainMinutes[domain] || 0) + minutes };
    }
    history[key] = day;

    //drop days older than HISTORY_DAYS_KEPT ("YYYY-MM-DD" strings sort like dates)
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - HISTORY_DAYS_KEPT);
    const cutoffKey = dayKey(cutoff);
    for (const k of Object.keys(history)) {
        if (k < cutoffKey) delete history[k];
    }

    await setData("dailyHistory", history);
}

//add minutes (optionally for one AI domain), sessions and claims to today's history entry.
//writes are queued so a tick and a compass click at the same moment can't overwrite each other
let writeQueue = Promise.resolve();
export function addTodayStats({ minutes = 0, sessions = 0, claims = 0, domain = null }) {
    writeQueue = writeQueue
        .then(() => writeTodayStats({ minutes, sessions, claims, domain }))
        .catch(err => console.error("Failed to save daily stats:", err));
    return writeQueue;
}

//storage keys that hold real tracked stats (the UI refreshes when any of them change)
export const LIVE_STAT_KEYS = ["dailyHistory", "lastAIViewTime", "lastCompassUse", "currentSession"];

//keys older versions of lumio wrote that nothing reads anymore (removed by background.js on update)
export const LEGACY_KEYS = ["demoMood", "usageLogs", "verifiedClaimsCount", "lastActivityTime", "totalTimeMinutes", "sessionsToday", "claimsToday", "statsDate"];
