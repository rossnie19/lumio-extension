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

//add a usage log entry (used by backrgound worker)
export async function logUsageEvent(domain) {
    const logs = await getData("usageLogs") || [];
    logs.push({ domain, timestamp: Date.now() });
    await setData("usageLogs", logs);
}

//today's date as "YYYY-MM-DD" (local time), used to reset the daily stats
export function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

//get today's stats (zeros if the saved stats are from an earlier day)
export async function getTodayStats() {
    const { statsDate, totalTimeMinutes, sessionsToday } =
        await chrome.storage.local.get(["statsDate", "totalTimeMinutes", "sessionsToday"]);
    if (statsDate !== todayKey()) return { totalTimeMinutes: 0, sessionsToday: 0 };
    return { totalTimeMinutes: totalTimeMinutes || 0, sessionsToday: sessionsToday || 0 };
}

//add minutes/sessions to today's stats (starts from zero again on a new day)
export async function addTodayStats({ minutes = 0, sessions = 0 }) {
    const stats = await getTodayStats();
    await chrome.storage.local.set({
        statsDate: todayKey(),
        totalTimeMinutes: stats.totalTimeMinutes + minutes,
        sessionsToday: stats.sessionsToday + sessions
    });
}
