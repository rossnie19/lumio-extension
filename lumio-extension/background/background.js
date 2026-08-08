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

