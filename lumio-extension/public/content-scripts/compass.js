// Function to create and inject the Compass retro sidebar
function injectCompassSidebar(claimText, links = []) {
  // 1. Remove existing sidebar if one is already open
  const existingSidebar = document.getElementById("lumio-compass-root");
  if (existingSidebar) {
    existingSidebar.remove();
  }

  // 2. Create host element
  const host = document.createElement("div");
  host.id = "lumio-compass-root";
  document.body.appendChild(host);

  // 3. Attach Shadow DOM (isolates our CSS)
  const shadow = host.attachShadow({ mode: "open" });

  // --- Change 4 (Part 1): Get path to PNG asset ---
  const logoUrl = chrome.runtime.getURL("assets/compass-logo.png");
  const logoHTML = `<img src="${logoUrl}" class="header-logo" alt="Compass Logo" />`;

  // 4. Fallback mock links
  const displayLinks = links.length > 0 ? links : [
    {
      title: "Anxiety and depression amongst youth as adverse effects of using social media: A Review",
      source: "PubMed Central (PMC) (.gov)",
      url: "https://pubmed.ncbi.nlm.nih.gov/"
    },
    {
      title: "The Impact of Social Media & Technology on Child and Adolescent Mental Health",
      source: "PubMed Central (PMC) (.gov)",
      url: "https://ncbi.nlm.nih.gov/"
    },
    {
      title: "Does Social Media Use Cause Depression?",
      source: "Child Mind Institute",
      url: "https://childmind.org/"
    }
  ];

// 5. Build HTML for reference cards with property fallbacks
  const cardsHTML = displayLinks.map(link => {
    const titleText = typeof link === 'string' ? link : (link.title || link.name || link.label || link.text || 'Reference Link');
    const sourceText = typeof link === 'string' ? '' : (link.source || link.domain || link.site || link.publisher || link.url || '');

    return `
      <a href="${link.url || link.link || '#'}" target="_blank" class="compass-card">
        <div class="card-title">${titleText}</div>
        ${sourceText ? `<div class="card-source">${sourceText}</div>` : ''}
      </a>
    `;
  }).join("");

  // 6. Inject HTML & CSS into Shadow Root
  shadow.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap');

      :host {
        all: initial;
        position: fixed;
        top: 0;
        right: 0;
        width: 380px;
        height: 100vh;
        z-index: 2147483647; 
        font-family: 'VT323', monospace;
        pointer-events: auto;
      }

      .sidebar-container {
        width: 100%;
        height: 100%;
        background-color: #EAE6DB; /* Retro cream background */
        border-left: 5px solid #3A2B20;
        box-sizing: border-box;
        padding: 24px 20px;
        display: flex;
        flex-direction: column;
        box-shadow: -8px 0px 20px rgba(0,0,0,0.3);
        overflow-y: auto;
        animation: slideIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      }

      @keyframes slideIn {
        from { transform: translateX(100%); }
        to { transform: translateX(0); }
      }

      .close-btn {
        align-self: flex-end;
        background: transparent;
        border: none;
        color: #8B0000;
        font-family: 'Press Start 2P', cursive;
        font-size: 1.4rem;
        cursor: pointer;
        margin-bottom: 8px; /* Slightly reduced margin */
        transition: transform 0.1s ease;
      }

      .close-btn:hover {
        transform: scale(1.2);
      }

      /* --- Change 4 (Part 2): Logo Styling --- */
      .header-logo {
        display: block;
        margin: 0 auto 12px;
        max-width: 150px;
        image-rendering: pixelated; /* Keep retro crispness */
      }

      .subtitle {
        font-family: 'VT323', monospace;
        font-size: 1.2rem;
        color: #3A2B20;
        text-align: center;
        margin-bottom: 24px;
      }

      /* --- Change 5: New Claim Section Color (warmer tone) --- */
      .claim-preview {
        background-color: #F0E0C5; 
        border: 2px dashed #8B7355;
        padding: 10px 12px;
        font-size: 1.1rem;
        color: #2D1E18;
        margin-bottom: 20px;
        line-height: 1.2;
      }

      .cards-list {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .compass-card {
        display: block;
        background-color: #D6C5AD;
        border: 3px solid #8B7355;
        border-radius: 12px;
        padding: 12px 14px;
        text-decoration: none;
        box-shadow: 4px 4px 0px rgba(0,0,0,0.15);
        transition: transform 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
      }

      /* --- Changes 1 & 2: Float up + Darker Shade on Hover --- */
      .compass-card:hover {
        transform: translateY(-5px); /* Float up vertically */
        background-color: #BCA78D; /* Slightly darker than base #D6C5AD */
        box-shadow: 4px 9px 0px rgba(0,0,0,0.15); /* Expand shadow to emphasize float */
      }

      /* --- Change 3: Click Animation (Toggle press effect) --- */
      .compass-card:active {
        transform: translateY(-2px) scale(0.97); /* "Press down" slightly */
        box-shadow: 2px 2px 0px rgba(0,0,0,0.1);
        transition: transform 0.05s ease; /* Fast click response */
      }

      .card-title {
        font-family: 'VT323', monospace;
        font-size: 1.25rem;
        color: #2B1D14;
        line-height: 1.1;
        margin-bottom: 4px; /* Reduced space before font shift */
      }

      /* --- Change 6: Change Source font to VT323 (matched to title) --- */
      .card-source {
        font-family: 'VT323', monospace; /* Aligned with title font */
        font-size: 0.85rem; /* Increased size since VT323 is taller/lighter */
        color: #6D5A88;
        letter-spacing: 1px;
        display: block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    </style>

    <div class="sidebar-container">
      <button class="close-btn" id="close-compass">✖</button>
      
      <!-- --- Change 4 (Part 3): Render PNG Logo --- -->
      <img src="${logoUrl}" class="header-logo" alt="Compass Logo">
      
      <div class="subtitle">Verify claims with references</div>

      <div class="claim-preview">
        <strong>Claim:</strong> "${claimText.length > 90 ? claimText.substring(0, 90) + '...' : claimText}"
      </div>

      <div class="cards-list">
        ${cardsHTML}
      </div>
    </div>
  `;

  // 7. Add close button listener
  shadow.getElementById("close-compass").addEventListener("click", () => {
    host.remove();
  });
}

// Listen for background script event
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "openCompass") {
    injectCompassSidebar(request.text, request.links);
  }
});