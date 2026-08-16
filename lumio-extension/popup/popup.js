import { getData } from "../public/shared/storage.js";
import { getCompanionMood } from "../public/shared/companionState.js";

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
        const currentMood = savedDemoMood || await getCompanionMood(); 
        const currentClaimsCount = await getData("verifiedClaimsCount") || 0;
        const statClaimsEl = document.getElementById("stat-claims");
        if (statClaimsEl) {
            statClaimsEl.textContent = currentClaimsCount;
        }

        const totalMinutes = await getData("totalTimeMinutes") || 78; 
        const sessions = await getData("sessionsToday") || 2;

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
            // Adds an "S" if there's more than 1 session!
            sessionsEl.textContent = sessions === 1 ? "1 AI SESSION" : `${sessions} AI SESSIONS`;
        }

        // 3. Inject dynamic text into the UI
        document.getElementById("pet-mood").textContent = currentMood;
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