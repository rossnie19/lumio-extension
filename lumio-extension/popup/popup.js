import { getTodayStats } from "../public/shared/storage.js";
import { getCompanionMood } from "../public/shared/companionState.js";
import { DEFAULT_PET_NAME, characterById } from "../public/shared/constants.js";
import { formatMinutes } from "../public/shared/stats.js";
import { pickDialogueLine } from "../public/shared/dialogue.js";

const setText = (id, text) => { document.getElementById(id).textContent = text; };

document.addEventListener("DOMContentLoaded", async () => {
    // Open Dashboard: the dashboard lives in Chrome's side panel.
    // sidePanel.open() must run straight from the click, so the window id is looked up beforehand
    const currentWindow = await chrome.windows.getCurrent();
    document.getElementById("open-dashboard").addEventListener("click", () => {
        if (chrome.sidePanel?.open) {
            chrome.sidePanel.open({ windowId: currentWindow.id });
            window.close();
        } else {
            // older chrome without the side panel API: open it as a normal tab instead
            chrome.tabs.create({ url: chrome.runtime.getURL("pages/dashboard/dashboard.html") });
        }
    });

    // Fill in the companion and today's numbers (popup.html shows placeholders until then)
    try {
        const { activeCharacter, petName, installDate } = await chrome.storage.local.get(["activeCharacter", "petName", "installDate"]);
        const character = characterById(activeCharacter?.id);
        const mood = await getCompanionMood();
        const today = await getTodayStats(); // tracked by background.js, resets every day

        // companion card (same layout as the dashboard's)
        document.getElementById("companion-sprite").src = character.image;
        setText("pet-type", character.name);
        setText("pet-name", petName || DEFAULT_PET_NAME);
        const moodEl = document.getElementById("pet-mood");
        moodEl.textContent = mood;
        moodEl.classList.add(`mood-${mood}`);
        if (installDate) {
            // same "Day N" as the dashboard: install day = day 1
            setText("pet-age", `Day ${Math.floor((Date.now() - installDate) / (24 * 60 * 60 * 1000)) + 1}`);
        }
        // something the companion says, from its folklore (dialogue.js)
        setText("pet-line", `"${pickDialogueLine(character.id, mood)}"`);

        // today
        setText("stat-time", formatMinutes(today.minutes));
        setText("stat-sessions", today.sessions);
        setText("stat-sessions-label", today.sessions === 1 ? "session" : "sessions");
        setText("stat-claims", today.claims);
    } catch (error) {
        console.error("Failed to load popup data:", error);
    }
});
