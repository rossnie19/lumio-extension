// this file is for opening compass panel and pop-up card


// catch message from background.js when user clicks "verify with compass"
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "OPEN_COMPASS_PANEL") {
        const claimText = message.data.claim;
        const sourceLinks = message.data.sources;
        const timestamp = message.data.timestamp;

        showCompassPanel(claimText, sourceLinks, timestamp);
    }
});

// opens the pop-up card with the claim and sources
function showCompassPanel(claimText, sourceLinks, timestamp) {
    let panel = document.getElementById("lumio-compass-panel");

    if (!panel) {
        panel = document.createElement("div");
        panel.id = "lumio-compass-panel";
        document.body.appendChild(panel);
    }

    // temporary pop-up card ahh styling, paayuz na lang pu thx !!!
    panel.style.position = "fixed";
    panel.style.top = "20px";
    panel.style.right = "20px";
    panel.style.zIndex = "999999"; // Ensures it sits above web content
    panel.style.backgroundColor = "#ffffff";
    panel.style.color = "#111111";
    panel.style.border = "2px solid #542867";
    panel.style.borderRadius = "12px";
    panel.style.padding = "16px";
    panel.style.boxShadow = "0 10px 25px rgba(0, 0, 0, 0.2)";
    panel.style.maxWidth = "350px";
    panel.style.fontFamily = "sans-serif";

    const sourceListHTML = sourceLinks.map(source =>
        `<li><a href="${source.url}" target="_blank" style="color: #c5b445; text-decoration: none;">${source.name}</a></li>`).join("");

    panel.innerHTML = `<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
      <h3 style="margin: 0; font-size: 16px;">Compass Verification</h3>
      <button id="close-compass-btn" style="border: none; background: transparent; cursor: pointer; font-size: 18px;">✕</button>
    </div>
    <p style="background: #F3F4F6; padding: 8px; border-radius: 6px; font-size: 13px; margin-bottom: 12px;">
      "${claimText}"
    </p>
    <ul style="list-style: none; padding: 0; margin: 0; font-size: 13px;">
      ${sourceListHTML}
    </ul>
  `;

    // close button
    document.getElementById("close-compass-btn").addEventListener("click", () => {
        panel.remove();
    });
}
