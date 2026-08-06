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

