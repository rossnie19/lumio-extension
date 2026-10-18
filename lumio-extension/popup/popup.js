import { getData, getTodayStats } from "../public/shared/storage.js";
import { getCompanionMood, normalizeMood } from "../public/shared/companionState.js";
import { DEFAULT_PET_NAME, DEFAULT_CHARACTER } from "../public/shared/constants.js";
import { formatMinutes } from "../public/shared/stats.js";

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Open Dashboard Button Logic
    document.getElementById("open-dashboard").addEventListener("click", () => {
        chrome.tabs.create({ url: chrome.runtime.getURL("pages/dashboard/dashboard.html") });
    });

    // 2. Fetch User Data
    try {
        const savedCharacterObj = await getData("activeCharacter");
        const savedPetName = await getData("petName") || DEFAULT_PET_NAME;
        const currentMood = normalizeMood(await getCompanionMood());
        // today's real stats, tracked by background.js (reset every day)
        const { totalTimeMinutes, sessionsToday, claimsToday } = await getTodayStats();

        // 3. Inject into the Popup (popup.html shows "–" until this runs)
        document.getElementById("stat-sessions").textContent = sessionsToday;
        document.getElementById("stat-time").textContent = formatMinutes(totalTimeMinutes);
        document.getElementById("stat-claims").textContent = claimsToday;

        // capitalize for display: "curious" -> "Curious"
        document.getElementById("pet-mood").textContent = currentMood.charAt(0).toUpperCase() + currentMood.slice(1);
        document.getElementById("pet-name").textContent = savedPetName;

        // 4. Inject dynamic image
        const spriteEl = document.getElementById("companion-sprite");

        // If the object exists, use its .image property. Otherwise, use a fallback!
        if (savedCharacterObj && savedCharacterObj.image) {
            spriteEl.src = savedCharacterObj.image;
        } else {
            spriteEl.src = DEFAULT_CHARACTER.image;
        }

    } catch (error) {
        console.error("Failed to load popup data:", error);
    }
});
