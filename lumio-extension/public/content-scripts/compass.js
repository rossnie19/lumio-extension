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

// The pixel fonts ship with the extension (assets/fonts). Fonts declared inside a shadow root
// don't load in Chrome, so they're registered on the page under Lumio-only names instead
function loadLumioFonts() {
  if (window.__lumioFontsLoaded) return;
  window.__lumioFontsLoaded = true;
  const fonts = [["Lumio Pixel", "press-start-2p.woff2"], ["Lumio Text", "vt323.woff2"]];
  for (const [family, file] of fonts) {
    const font = new FontFace(family, `url("${chrome.runtime.getURL(`assets/fonts/${file}`)}") format("woff2")`);
    document.fonts.add(font);
    font.load().catch(() => {}); // e.g. blocked by the page: the monospace fallback still works
  }
}

// Function to create and inject the Compass retro sidebar.
// it opens right away in a "searching" state; background.js sends the results when they're ready
function injectCompassSidebar(claimText, requestId) {
  loadLumioFonts();

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
      :host {
        all: initial;
        position: fixed;
        top: 0;
        right: 0;
        width: 380px;
        max-width: 100vw;
        height: 100vh;
        z-index: 2147483647;
        pointer-events: auto;
        --page: #EAE3D2;
        --paper: #F6F1E6;
        --paper-sunk: #EFE7D6;
        --ink: #2E2219;
        --ink-soft: #6B5847;
        --ink-faint: #9A8670;
        --purple: #5E4B7E;
        --green: #2F5144;
        --red: #A3453A;
        --gold: #F1BC4F;
        --border: 3px solid var(--ink);
        --shadow: 3px 3px 0 rgba(46, 34, 25, 0.22);
        --radius: 4px;
        --font-pixel: 'Lumio Pixel', monospace;
        --font-text: 'Lumio Text', monospace;
        font-family: var(--font-text);
        font-size: 19px;
        line-height: 1.15;
        color: var(--ink);
      }

      * { box-sizing: border-box; }

      .sidebar-container {
        display: flex;
        flex-direction: column;
        gap: 14px;
        width: 100%;
        height: 100%;
        padding: 14px 16px 24px;
        overflow-y: auto;
        background-color: var(--page);
        border-left: 4px solid var(--ink);
        box-shadow: -6px 0 18px rgba(0, 0, 0, 0.25);
        animation: slideIn 0.28s cubic-bezier(0.2, 0.9, 0.3, 1.1);
      }

      @keyframes slideIn {
        from { transform: translateX(100%); }
        to { transform: translateX(0); }
      }

      .sidebar-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }

      .header-logo {
        height: 34px;
        width: auto;
        image-rendering: pixelated;
      }

      .close-btn {
        flex-shrink: 0;
        width: 30px;
        height: 30px;
        padding: 0;
        font-family: var(--font-pixel);
        font-size: 10px;
        color: var(--ink);
        background-color: var(--paper);
        border: var(--border);
        border-radius: var(--radius);
        box-shadow: 2px 2px 0 var(--ink);
        cursor: pointer;
      }

      .close-btn:hover { background-color: var(--paper-sunk); }
      .close-btn:active { transform: translate(2px, 2px); box-shadow: none; }

      .subtitle {
        margin-top: -6px;
        font-size: 18px;
        color: var(--ink-soft);
      }

      .claim-preview {
        padding: 10px 12px;
        font-size: 19px;
        background-color: var(--paper);
        border: 2px dashed var(--ink-faint);
        border-radius: var(--radius);
      }

      .claim-preview strong,
      .search-info strong {
        font-weight: normal;
        color: var(--ink-soft);
      }

      .search-info {
        font-size: 18px;
        margin-bottom: 4px;
      }

      .tag {
        display: inline-block;
        margin-left: 4px;
        padding: 1px 6px;
        font-size: 15px;
        color: #FFFFFF;
        background-color: var(--purple);
        border-radius: var(--radius);
        vertical-align: 1px;
      }

      .tag.plain { background-color: var(--ink-soft); }

      .section-label {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 14px 0 8px;
        font-family: var(--font-pixel);
        font-size: 8px;
      }

      .section-label::before {
        content: "";
        width: 6px;
        height: 6px;
        background-color: var(--gold);
        box-shadow: 1px 1px 0 var(--ink);
      }

      .cards-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .compass-card {
        display: block;
        padding: 10px 12px;
        text-decoration: none;
        color: var(--ink);
        background-color: var(--paper);
        border: var(--border);
        border-radius: var(--radius);
        box-shadow: var(--shadow);
        transition: transform 0.12s ease, box-shadow 0.12s ease;
      }

      .compass-card:hover {
        transform: translate(-1px, -2px);
        box-shadow: 4px 5px 0 rgba(46, 34, 25, 0.25);
      }

      .compass-card:active {
        transform: translate(1px, 1px);
        box-shadow: 1px 1px 0 rgba(46, 34, 25, 0.25);
      }

      .compass-card:focus-visible,
      .more-links a:focus-visible,
      .close-btn:focus-visible {
        outline: 3px solid var(--gold);
        outline-offset: 2px;
      }

      .card-title {
        margin-bottom: 4px;
        font-size: 20px;
        line-height: 1.05;
      }

      .card-meta {
        margin-bottom: 4px;
        font-size: 17px;
        color: var(--ink-soft);
      }

      .card-source {
        font-size: 16px;
        color: var(--purple);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .status {
        padding: 8px 0;
        font-size: 19px;
        color: var(--ink-soft);
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
        margin-top: 6px;
        font-size: 16px;
        color: var(--ink-faint);
      }

      .more-links {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .more-links a {
        padding: 3px 9px;
        font-size: 17px;
        color: var(--ink);
        text-decoration: none;
        background-color: var(--paper);
        border: 2px solid var(--ink);
        border-radius: var(--radius);
      }

      .more-links a:hover { background-color: var(--gold); }

      @media (prefers-reduced-motion: reduce) {
        .sidebar-container, .status.loading::after { animation: none; }
        .compass-card { transition: none; }
      }
    </style>

    <div class="sidebar-container">
      <div class="sidebar-top">
        <img src="${logoUrl}" class="header-logo" alt="Compass">
        <button class="close-btn" id="close-compass" title="Close">X</button>
      </div>
      <div class="subtitle">Check claims with real research</div>

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
