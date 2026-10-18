// The walking pet on AI sites (see "content_scripts" in manifest.json).
// It roams the bottom of the right-hand margin (so it never covers the chat box) and acts out the
// companion's mood. The character images are single still frames, so all motion is done with CSS
// (hop, flip, breathe); real sprite sheets can replace the <img> later without touching the movement.
(() => {
  if (window.__lumioPetLoaded) return;
  window.__lumioPetLoaded = true;

  const PET_SIZE = 64;
  const EDGE_MARGIN = 16;
  const CHAT_COLUMN_HALF_WIDTH = 420; // stay right of the centered chat column on wide screens
  const MAX_ROAM_WIDTH = 320;
  const REFRESH_MS = 30 * 1000; // mood also changes just because time passes
  const INFO_BUBBLE_MS = 6 * 1000;

  // per mood: walking speed (px/s), pause between walks (ms), bubble above the head
  const MOODS = {
    curious:   { speed: 45, pause: [1500, 4000], bubble: "" },
    focused:   { speed: 22, pause: [4000, 9000], bubble: "📖" },
    concerned: { speed: 95, pause: [300, 1200],  bubble: "!" },
    idle:      { speed: 0,  pause: [0, 0],       bubble: "z z z" }
  };

  // characters that fly instead of walk (the manananggal has wings and no legs)
  const FLYING_CHARACTERS = new Set(["manananggal"]);

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let host = null;
  let els = null;
  let state = null; // last state from background.js (getPetState)
  let x = null;
  let targetX = null;
  let facing = -1; // -1 = facing left, 1 = facing right
  let pausedUntil = 0;
  let lastFrame = null;
  let infoTimer = null;
  let hiddenOnThisPage = false;

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function formatMinutes(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  // too narrow for a free margin beside the chat column: the pet would cover the message box
  // (and its send button), so it perches above it at the right edge and stays put
  function isNarrow() {
    return window.innerWidth / 2 + CHAT_COLUMN_HALF_WIDTH > window.innerWidth - PET_SIZE - EDGE_MARGIN;
  }

  // the strip of screen the pet may walk in: the right-hand margin, bottom of the window
  function roamRange() {
    const right = window.innerWidth - PET_SIZE - EDGE_MARGIN;
    const left = Math.max(window.innerWidth / 2 + CHAT_COLUMN_HALF_WIDTH, right - MAX_ROAM_WIDTH);
    return [Math.min(left, right), right];
  }

  const randomBetween = (min, max) => min + Math.random() * (max - min);

  function createPet() {
    host = document.createElement("div");
    host.id = "lumio-pet-root";
    const shadow = host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>
        :host {
          all: initial;
          position: fixed;
          left: 0;
          bottom: 0;
          width: 0;
          height: 0;
          z-index: 2147483646; /* just under the Compass sidebar */
        }
        .pet {
          position: fixed;
          bottom: 10px;
          left: 0;
          width: ${PET_SIZE}px;
          height: ${PET_SIZE}px;
          cursor: pointer;
          will-change: transform;
          font-family: ui-monospace, Menlo, Consolas, monospace;
        }
        .body {
          width: 100%;
          height: 100%;
          transform-origin: 50% 100%;
        }
        .body img {
          width: 100%;
          height: 100%;
          image-rendering: pixelated;
          filter: drop-shadow(2px 2px 0 rgba(0,0,0,0.25));
          pointer-events: none;
          user-select: none;
        }
        .shadow {
          position: absolute;
          left: 14%;
          bottom: -4px;
          width: 72%;
          height: 8px;
          border-radius: 50%;
          background: rgba(0,0,0,0.18);
        }

        /* walking: hop + waddle */
        .pet.walking .body { animation: hop 0.42s ease-in-out infinite; }
        @keyframes hop {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-5px) rotate(-4deg); }
          75% { transform: translateY(-5px) rotate(4deg); }
        }
        /* standing still: breathe */
        .pet:not(.walking) .body { animation: breathe 2.6s ease-in-out infinite; }
        @keyframes breathe {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(0.95); }
        }
        .pet.mood-idle .body { animation-duration: 4s; }
        .pet.mood-idle img { filter: grayscale(0.35) brightness(0.9) drop-shadow(2px 2px 0 rgba(0,0,0,0.25)); }
        .pet.mood-concerned:not(.walking) .body { animation: fidget 0.5s ease-in-out infinite; }
        @keyframes fidget {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-5deg); }
          75% { transform: rotate(5deg); }
        }

        .bubble, .info, .close {
          position: absolute;
          background: #EAE6DB;
          color: #3A2B20;
          border: 2px solid #3A2B20;
          box-shadow: 2px 2px 0 rgba(0,0,0,0.2);
        }
        .bubble {
          bottom: ${PET_SIZE + 6}px;
          left: 50%;
          transform: translateX(-50%);
          padding: 1px 6px;
          font-size: 13px;
          font-weight: bold;
          border-radius: 8px;
          white-space: nowrap;
          animation: float 2s ease-in-out infinite;
        }
        .bubble:empty { display: none; }
        .pet.mood-concerned .bubble { color: #B55043; }
        @keyframes float {
          0%, 100% { transform: translate(-50%, 0); }
          50% { transform: translate(-50%, -4px); }
        }

        .info {
          bottom: ${PET_SIZE + 34}px;
          right: 0;
          width: 190px;
          padding: 8px 10px;
          font-size: 12px;
          line-height: 1.4;
          border-radius: 6px;
          cursor: default;
        }
        .info[hidden] { display: none; }
        .info strong { display: block; margin-bottom: 2px; }
        .info .hint { margin-top: 4px; color: #8B7355; }

        .close {
          top: -6px;
          right: -6px;
          width: 18px;
          height: 18px;
          padding: 0;
          font: bold 12px/14px ui-monospace, Menlo, monospace;
          border-radius: 50%;
          cursor: pointer;
          display: none;
        }
        .pet:hover .close { display: block; }

        /* flying characters hover above the ground and bob instead of hopping */
        .pet.flying { bottom: 40px; }
        .pet.flying .shadow { bottom: -34px; left: 26%; width: 48%; opacity: 0.6; }
        .pet.flying .body,
        .pet.flying.walking .body { animation: hover 1.4s ease-in-out infinite; }
        .pet.flying.walking .body { animation-duration: 0.7s; }
        @keyframes hover {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-8px) rotate(2deg); }
        }

        /* narrow windows: sit above the message box instead of on it */
        .pet.perched { bottom: 140px; }
        .pet.perched.flying { bottom: 160px; }

        @media (prefers-reduced-motion: reduce) {
          .pet .body, .bubble { animation: none !important; }
        }
      </style>
      <div class="pet" title="">
        <div class="info" hidden></div>
        <div class="bubble"></div>
        <div class="shadow"></div>
        <div class="body"><img alt=""></div>
        <button class="close" title="Hide on this page">×</button>
      </div>`;

    const pet = shadow.querySelector(".pet");
    els = {
      pet,
      body: shadow.querySelector(".body"),
      img: shadow.querySelector("img"),
      bubble: shadow.querySelector(".bubble"),
      info: shadow.querySelector(".info"),
      close: shadow.querySelector(".close")
    };

    pet.addEventListener("click", toggleInfo);
    els.info.addEventListener("click", (e) => e.stopPropagation());
    els.close.addEventListener("click", (e) => {
      e.stopPropagation();
      hiddenOnThisPage = true;
      removePet();
    });

    document.documentElement.appendChild(host);
    const [, right] = roamRange();
    x = right; // start in the bottom-right corner
    targetX = null;
    lastFrame = null;
    requestAnimationFrame(step);
  }

  function removePet() {
    if (host) host.remove();
    host = null;
    els = null;
  }

  function toggleInfo() {
    if (!els || !state) return;
    if (!els.info.hidden) {
      els.info.hidden = true;
      return;
    }
    const { today, petName, mood } = state;
    els.info.innerHTML = `
      <strong>${escapeHtml(petName)} is ${escapeHtml(mood)}</strong>
      Today: ${escapeHtml(formatMinutes(today.totalTimeMinutes))} with AI,
      ${escapeHtml(today.sessionsToday)} session${today.sessionsToday === 1 ? "" : "s"},
      ${escapeHtml(today.claimsToday)} claim${today.claimsToday === 1 ? "" : "s"} checked
      <div class="hint">Highlight text and right-click to check it with Compass.</div>`;
    els.info.hidden = false;
    clearTimeout(infoTimer);
    infoTimer = setTimeout(() => { if (els) els.info.hidden = true; }, INFO_BUBBLE_MS);
  }

  function applyState() {
    if (!els || !state) return;
    const mood = MOODS[state.mood] ? state.mood : "curious";
    const flying = FLYING_CHARACTERS.has(state.character.id);
    els.pet.className = `pet mood-${mood}${flying ? " flying" : ""}`;
    els.bubble.textContent = MOODS[mood].bubble;
    // character images are saved as "/assets/..." paths, which must be loaded from the extension
    els.img.src = chrome.runtime.getURL(state.character.image.replace(/^\//, ""));
    els.pet.title = `${state.petName}: ${mood}`;
  }

  // one animation frame: walk toward the target, pause, pick a new target
  function step(now) {
    if (!els) return;
    const dt = lastFrame === null ? 0 : Math.min((now - lastFrame) / 1000, 0.1);
    lastFrame = now;

    const [left, right] = roamRange();
    x = Math.min(Math.max(x, left), right); // window may have been resized
    const mood = MOODS[state?.mood] || MOODS.curious;
    const narrow = isNarrow();
    const canWalk = mood.speed > 0 && !reducedMotion && els.info.hidden && !narrow;
    if (narrow) x = right;
    let walking = false;

    if (canWalk && now >= pausedUntil) {
      if (targetX === null) targetX = randomBetween(left, right);
      const distance = targetX - x;
      if (Math.abs(distance) < 1) {
        targetX = null;
        pausedUntil = now + randomBetween(...mood.pause);
      } else {
        facing = Math.sign(distance);
        x += Math.sign(distance) * Math.min(Math.abs(distance), mood.speed * dt);
        walking = true;
      }
    }

    els.pet.classList.toggle("walking", walking); // keeps the mood/flying classes from applyState
    els.pet.classList.toggle("perched", narrow);
    els.pet.style.transform = `translateX(${x}px)`;
    // the images face left; mirror them when walking right
    els.img.style.transform = facing > 0 ? "scaleX(-1)" : "";
    requestAnimationFrame(step);
  }

  async function refresh() {
    // the extension was reloaded/removed: this old copy of the script can't talk to it anymore
    if (!chrome.runtime?.id) {
      clearInterval(refreshTimer);
      removePet();
      return;
    }
    try {
      state = await chrome.runtime.sendMessage({ action: "getPetState" });
    } catch {
      return;
    }
    if (!state?.enabled || hiddenOnThisPage) {
      removePet();
      return;
    }
    if (!els) createPet();
    applyState();
  }

  const refreshTimer = setInterval(refresh, REFRESH_MS);
  chrome.storage.onChanged.addListener((changes, area) => {
    const relevant = ["activeCharacter", "petName", "showPetOnAISites", "dailyHistory", "lastCompassUse", "lastAIViewTime", "currentSession"];
    if (area === "local" && relevant.some(key => key in changes)) refresh();
  });
  refresh();
})();
