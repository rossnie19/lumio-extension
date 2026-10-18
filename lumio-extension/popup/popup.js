import { getData, getTodayStats } from "../public/shared/storage.js";
import { getCompanionMood, normalizeMood } from "../public/shared/companionState.js";

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Open Dashboard Button Logic
    document.getElementById("open-dashboard").addEventListener("click", () => {
        chrome.tabs.create({ url: chrome.runtime.getURL("pages/dashboard/dashboard.html") });
    });

    // 2. Fetch User Data
    try {
        // Look for 'activeCharacter' instead of 'selectedCharacter'
        const savedCharacterObj = await getData("activeCharacter");
        const savedPetName = await getData("petName") || "[PET NAME]"; 
        // Check if there is a forced demo mood, otherwise fall back to the default
        const savedDemoMood = await getData("demoMood");
        const currentMood = normalizeMood(savedDemoMood || await getCompanionMood());
        const currentClaimsCount = await getData("verifiedClaimsCount") || 0;
        const statClaimsEl = document.getElementById("stat-claims");
        if (statClaimsEl) {
            statClaimsEl.textContent = currentClaimsCount;
        }

        // tracked by background.js, reset every day
        const { totalTimeMinutes: totalMinutes, sessionsToday: sessions } = await getTodayStats();

        // 2. Convert minutes into "Xh Ym" format
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        const formattedTime = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

        // 3. Inject into the Popup
        const timeEl = document.getElementById("stat-time");
        const sessionsEl = document.getElementById("stat-sessions");

        if (timeEl) {
            timeEl.textContent = formattedTime;
        }
        if (sessionsEl) {
            // the label "AI Sessions:" is already in popup.html, so just the number
            sessionsEl.textContent = sessions;
        }

        // 3. Inject dynamic text into the UI
        // capitalize for display: "curious" -> "Curious"
        document.getElementById("pet-mood").textContent = currentMood.charAt(0).toUpperCase() + currentMood.slice(1);
        document.getElementById("pet-name").textContent = savedPetName;
        
        // 4. Inject dynamic image
        const spriteEl = document.getElementById("companion-sprite");
        
        // If the object exists, use its .image property. Otherwise, use a fallback!
        if (savedCharacterObj && savedCharacterObj.image) {
            spriteEl.src = savedCharacterObj.image; 
        } else {
            spriteEl.src = "/assets/companion/mangkukulam.png";
        }

    } catch (error) {
        console.error("Failed to load popup data:", error);
    }
});