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
        const currentMood = await getCompanionMood(); 
        const currentClaimsCount = await getData("verifiedClaimsCount") || 0;
        const statClaimsEl = document.getElementById("stat-claims");
        if (statClaimsEl) {
            statClaimsEl.textContent = currentClaimsCount;
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