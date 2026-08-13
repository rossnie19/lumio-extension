import { getCompanionMood } from "../public/shared/companionState.js";

async function updatePopup() {
  const mood = await getCompanionMood();

  const moodText = document.getElementById("mood-text");
  moodText.textContent = `Your companion is feeling ${mood}.`;
}

document.getElementById("open-dashboard").addEventListener("click", () => {
  chrome.tabs.create({ url: "../pages/dashboard/dashboard.html" });
});

updatePopup();