// The walking pet on AI sites (see "content_scripts" in manifest.json).
// It roams the bottom of the right-hand margin (so it never covers the chat box) and acts out the
// companion's mood. Movement (hop, flip, breathe) is CSS; the face/wings/smoke animate from a sprite
// sheet per character (assets/companion/sprites, made by scripts/make_sprites.py).
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

  // sprite sheets: one row of 4 square frames (see scripts/make_sprites.py)
  const SPRITE_SHEETS = new Set(["mangkukulam", "manananggal", "tikbalang"]);
  const FRAME_COUNT = 4;
  const FRAME = { open: 0, closed: 1, moveA: 2, moveB: 3 };
  const MOVE_CYCLE = [FRAME.open, FRAME.moveA, FRAME.open, FRAME.moveB];
  const WALK_FRAME_MS = 260;
  const HOVER_FRAME_MS = 450; // flying characters keep flapping while standing still
  const BLINK_MS = 160;
  const BLINK_EVERY_MS = [2500, 6000];

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
  let hasSheet = false;
  let nextBlinkAt = 0;
  let blinkUntil = 0;

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

  // bundled pixel fonts (assets/fonts); fonts declared inside a shadow root don't load in Chrome,
  // so they're registered on the page under Lumio-only names (same as compass.js)
  function loadLumioFonts() {
    if (window.__lumioFontsLoaded) return;
    window.__lumioFontsLoaded = true;
    const fonts = [["Lumio Pixel", "press-start-2p.woff2"], ["Lumio Text", "vt323.woff2"]];
    for (const [family, file] of fonts) {
      const font = new FontFace(family, `url("${chrome.runtime.getURL(`assets/fonts/${file}`)}") format("woff2")`);
      document.fonts.add(font);
      font.load().catch(() => {}); // blocked by the page: the monospace fallback still works
    }
  }

  function createPet() {
    loadLumioFonts();
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
          font-family: 'Lumio Text', ui-monospace, Menlo, monospace;
        }
        .body {
          width: 100%;
          height: 100%;
          transform-origin: 50% 100%;
        }
        .sprite {
          width: 100%;
          height: 100%;
          background-repeat: no-repeat;
          background-size: 100% 100%; /* still image; sprite sheets set ${FRAME_COUNT}00% 100% */
          image-rendering: pixelated;
          filter: drop-shadow(2px 2px 0 rgba(0,0,0,0.25));
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
        .pet.mood-idle .sprite { filter: grayscale(0.35) brightness(0.9) drop-shadow(2px 2px 0 rgba(0,0,0,0.25)); }
        .pet.mood-concerned:not(.walking) .body { animation: fidget 0.5s ease-in-out infinite; }
        @keyframes fidget {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-5deg); }
          75% { transform: rotate(5deg); }
        }

        .bubble, .info, .close {
          position: absolute;
          background: #F6F1E6;
          color: #2E2219;
          border: 3px solid #2E2219;
          border-radius: 4px;
          box-shadow: 3px 3px 0 rgba(46, 34, 25, 0.25);
        }
        .bubble {
          bottom: ${PET_SIZE + 6}px;
          left: 50%;
          transform: translateX(-50%);
          padding: 0 7px;
          font-size: 18px;
          white-space: nowrap;
          animation: float 2s ease-in-out infinite;
        }
        .bubble:empty { display: none; }
        .pet.mood-concerned .bubble { color: #FFFFFF; background: #A3453A; }
        @keyframes float {
          0%, 100% { transform: translate(-50%, 0); }
          50% { transform: translate(-50%, -4px); }
        }

        .info {
          bottom: ${PET_SIZE + 34}px;
          right: 0;
          width: 230px;
          padding: 10px 12px;
          font-size: 17px;
          line-height: 1.15;
          cursor: default;
        }
        .info[hidden] { display: none; }
        .info strong {
          display: block;
          margin-bottom: 4px;
          font: 8px/1.6 'Lumio Pixel', ui-monospace, monospace;
          text-transform: uppercase;
        }
        .info .line {
          margin-bottom: 8px;
          padding-bottom: 8px;
          font-size: 18px;
          border-bottom: 2px dashed #C9BBA3;
        }
        .info .hint { margin-top: 6px; color: #6B5847; }

        .close {
          top: -6px;
          right: -6px;
          width: 20px;
          height: 20px;
          padding: 0;
          font: 8px/14px 'Lumio Pixel', ui-monospace, monospace;
          box-shadow: 2px 2px 0 #2E2219;
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

        /* asleep: everyone rests on the ground and only breathes (flying characters land too) */
        .pet.flying.mood-idle { bottom: 10px; }
        .pet.perched.flying.mood-idle { bottom: 140px; }
        .pet.flying.mood-idle .shadow { bottom: -4px; left: 14%; width: 72%; opacity: 1; }
        .pet.flying.mood-idle .body { animation: breathe 4s ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .pet .body, .bubble { animation: none !important; }
        }
      </style>
      <div class="pet" title="">
        <div class="info" hidden></div>
        <div class="bubble"></div>
        <div class="shadow"></div>
        <div class="body"><div class="sprite"></div></div>
        <button class="close" title="Hide on this page">X</button>
      </div>`;

    const pet = shadow.querySelector(".pet");
    els = {
      pet,
      body: shadow.querySelector(".body"),
      sprite: shadow.querySelector(".sprite"),
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
    const { today, petName, mood, line } = state;
    els.info.innerHTML = `
      ${line ? `<div class="line">"${escapeHtml(line)}"</div>` : ""}
      <strong>${escapeHtml(petName)} is ${escapeHtml(mood)}</strong>
      Today: ${escapeHtml(formatMinutes(today.minutes))} with AI,
      ${escapeHtml(today.sessions)} session${today.sessions === 1 ? "" : "s"},
      ${escapeHtml(today.claims)} claim${today.claims === 1 ? "" : "s"} checked
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
    // sprite sheet if this character has one, otherwise its still image.
    // paths are loaded from the extension (character images are saved as "/assets/..." paths)
    hasSheet = SPRITE_SHEETS.has(state.character.id);
    const path = hasSheet
      ? `assets/companion/sprites/${state.character.id}-sheet.png`
      : state.character.image.replace(/^\//, "");
    els.sprite.style.backgroundImage = `url("${chrome.runtime.getURL(path)}")`;
    els.sprite.style.backgroundSize = hasSheet ? `${FRAME_COUNT * 100}% 100%` : "100% 100%";
    els.pet.title = `${state.petName}: ${mood}`;
  }

  // which sprite frame to show right now
  function pickFrame(now, walking, mood) {
    if (mood === "idle") return FRAME.closed; // asleep
    if (reducedMotion) return FRAME.open;
    const flying = els.pet.classList.contains("flying");
    if (walking || flying) {
      const frameMs = walking ? WALK_FRAME_MS : HOVER_FRAME_MS;
      return MOVE_CYCLE[Math.floor(now / frameMs) % MOVE_CYCLE.length];
    }
    // standing still: blink now and then
    if (now >= nextBlinkAt) {
      blinkUntil = now + BLINK_MS;
      nextBlinkAt = now + randomBetween(...BLINK_EVERY_MS);
    }
    return now < blinkUntil ? FRAME.closed : FRAME.open;
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
    els.sprite.style.transform = facing > 0 ? "scaleX(-1)" : "";
    if (hasSheet) {
      const frame = pickFrame(now, walking, state?.mood);
      els.sprite.style.backgroundPosition = `${(frame * 100) / (FRAME_COUNT - 1)}% 0`;
    }
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
