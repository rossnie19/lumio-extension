// Escape text before putting it into innerHTML (the claim comes from page content)
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Titles/snippets from the search APIs can contain markup (<i>, <span>, &#039;...): keep only the text.
// DOMParser builds an inert document, so nothing in it runs
function htmlToText(html) {
  return new DOMParser().parseFromString(String(html || ""), "text/html").body.textContent.trim();
}

// only allow normal web links in cards
function safeUrl(url) {
  return /^https?:\/\//i.test(url || "") ? url : "#";
}

// Function to create and inject the Compass retro sidebar.
// it opens right away in a "searching" state; background.js sends the results when they're ready
function injectCompassSidebar(claimText, requestId) {
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
  window.__lumioCompassSidebar = { shadow, requestId }; // results for an older request are ignored

  // 4. Get path to PNG asset
  const logoUrl = chrome.runtime.getURL("assets/compass-logo.png");

  const shortClaim = claimText.length > 90 ? claimText.substring(0, 90) + '...' : claimText;

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

      .card-meta {
        font-size: 1rem;
        color: #5A4534;
        line-height: 1.1;
        margin-bottom: 4px;
      }

      .section-label {
        font-family: 'Press Start 2P', cursive;
        font-size: 0.6rem;
        color: #3A2B20;
        margin: 18px 0 10px;
      }

      .search-info {
        font-size: 1.05rem;
        color: #3A2B20;
        line-height: 1.2;
        margin-bottom: 4px;
      }

      .tag {
        display: inline-block;
        font-size: 0.85rem;
        color: #FFFFFF;
        background-color: #6D5A88;
        padding: 0 6px;
        margin-left: 4px;
        border-radius: 4px;
      }

      .tag.plain { background-color: #8B7355; }

      .status {
        font-size: 1.2rem;
        color: #5A4534;
        padding: 12px 0;
      }

      .status.loading::after {
        content: "";
        animation: dots 1.2s steps(4, end) infinite;
      }

      @keyframes dots {
        0% { content: ""; }
        25% { content: "."; }
        50% { content: ".."; }
        75% { content: "..."; }
      }

      .note {
        font-size: 0.95rem;
        color: #8B7355;
        margin-top: 4px;
      }

      .more-links {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }

      .more-links a {
        font-size: 1rem;
        color: #3A2B20;
        background-color: #F0E0C5;
        border: 2px solid #8B7355;
        border-radius: 8px;
        padding: 2px 8px;
        text-decoration: none;
      }

      .more-links a:hover { background-color: #D6C5AD; }
    </style>

    <div class="sidebar-container">
      <button class="close-btn" id="close-compass">✖</button>
      
      <!-- --- Change 4 (Part 3): Render PNG Logo --- -->
      <img src="${logoUrl}" class="header-logo" alt="Compass Logo">
      
      <div class="subtitle">Check claims with references</div>

      <div class="claim-preview">
        <strong>Claim:</strong> "${escapeHtml(shortClaim)}"
      </div>

      <div id="compass-results">
        <div class="status loading">Searching for sources</div>
      </div>
    </div>
  `;

  // 7. Add close button listener
  shadow.getElementById("close-compass").addEventListener("click", () => {
    host.remove();
  });
}

// Fill the open sidebar with the search results from background.js
function showCompassResults(data) {
  const sidebar = window.__lumioCompassSidebar;
  if (!sidebar || sidebar.requestId !== data.requestId) return; // sidebar closed or a newer claim opened
  const container = sidebar.shadow.getElementById("compass-results");
  if (!container) return;

  const searchInfo = `
    ${data.usedAI ? `<div class="search-info"><strong>Checking:</strong> ${escapeHtml(data.claim)}</div>` : ""}
    <div class="search-info">
      <strong>Searched for:</strong> ${escapeHtml(data.query)}
      ${data.usedAI
        ? '<span class="tag" title="Rewritten by Chrome\'s built-in AI on this computer">on-device AI</span>'
        : '<span class="tag plain" title="On-device AI not available, filler words removed">keywords</span>'}
    </div>`;

  const paperCards = data.papers.map(paper => {
    const meta = [htmlToText(paper.authors), paper.year].filter(Boolean).join(" · ");
    return `
      <a href="${escapeHtml(safeUrl(paper.url))}" target="_blank" rel="noopener noreferrer" class="compass-card">
        <div class="card-title">${escapeHtml(htmlToText(paper.title))}</div>
        ${meta ? `<div class="card-meta">${escapeHtml(meta)}</div>` : ""}
        <div class="card-source">${escapeHtml([htmlToText(paper.venue), paper.source].filter(Boolean).join(" · "))}</div>
      </a>`;
  }).join("");

  const papersSection = data.papers.length
    ? `<div class="section-label">RESEARCH PAPERS</div><div class="cards-list">${paperCards}</div>`
    : `<div class="status">No matching papers found. Try the searches below.</div>`;

  const wiki = data.wikipedia;
  const wikiSection = wiki ? `
    <div class="section-label">BACKGROUND</div>
    <a href="${escapeHtml(safeUrl(wiki.url))}" target="_blank" rel="noopener noreferrer" class="compass-card">
      <div class="card-title">${escapeHtml(htmlToText(wiki.title))}</div>
      <div class="card-meta">${escapeHtml(htmlToText(wiki.snippet))}...</div>
      <div class="card-source">Wikipedia</div>
    </a>
    <div class="note">A starting point, not proof: check its cited sources.</div>` : "";

  const failedNote = data.failedSources.length
    ? `<div class="note">Couldn't reach: ${escapeHtml(data.failedSources.join(", "))}</div>`
    : "";

  const moreLinks = data.links.map(link =>
    `<a href="${escapeHtml(safeUrl(link.url))}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.title)}</a>`
  ).join("");

  container.innerHTML = `
    ${searchInfo}
    ${papersSection}
    ${failedNote}
    ${wikiSection}
    <div class="section-label">SEARCH MORE ON</div>
    <div class="more-links">${moreLinks}</div>`;
}

// Listen for background script events.
// background.js injects this file on demand, possibly more than once per page, so only register once
if (!window.__lumioCompassLoaded) {
  window.__lumioCompassLoaded = true;

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "openCompass") {
      injectCompassSidebar(request.text, request.requestId);
      sendResponse({ opened: true }); // lets background.js know the sidebar really opened
    } else if (request.action === "compassResults") {
      showCompassResults(request);
    }
  });
}
