//this file acts as the bridge between the extension and chrome database (chrome.storage.local)

//get value from storage
export async function getData(key) {
    const result = await chrome.storage.local.get(key);
    return result[key];
}