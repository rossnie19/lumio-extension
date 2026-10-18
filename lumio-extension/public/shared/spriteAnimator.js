// Plays a character's sprite sheet in an element (the companion portraits in the popup and the
// dashboard). Same frames and timing as the walking pet (content-scripts/pet.js), which can't import this.
// Sheet layout (scripts/make_sprites.py): one row of 4 frames: open eyes, closed eyes, move A, move B.

const FRAME_COUNT = 4;
const FRAME = { open: 0, closed: 1, moveA: 2, moveB: 3 };
const MOVE_CYCLE = [FRAME.open, FRAME.moveA, FRAME.open, FRAME.moveB];
const HOVER_FRAME_MS = 450; // flying characters keep flapping
const BLINK_MS = 160;
const BLINK_EVERY_MS = [2500, 6000];
const TICK_MS = 80;

const randomBetween = (min, max) => min + Math.random() * (max - min);

// character: an entry of CHARACTERS (constants.js); mood: one of MOODS (companionState.js).
// returns a function that stops the animation
export function animateSprite(element, character, mood) {
    element.style.backgroundImage = `url("${character.sprite || character.image}")`;
    element.style.backgroundSize = character.sprite ? `${FRAME_COUNT * 100}% 100%` : "100% 100%";
    element.style.backgroundRepeat = "no-repeat";
    element.classList.toggle("asleep", mood === "idle");
    if (!character.sprite) return () => {};

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const showFrame = (frame) => {
        element.style.backgroundPosition = `${(frame * 100) / (FRAME_COUNT - 1)}% 0`;
    };

    // asleep, or no motion wanted: one still frame
    if (mood === "idle" || reducedMotion) {
        showFrame(mood === "idle" ? FRAME.closed : FRAME.open);
        return () => {};
    }

    let nextBlinkAt = performance.now() + randomBetween(...BLINK_EVERY_MS);
    let blinkUntil = 0;
    const tick = () => {
        const now = performance.now();
        if (character.flying) {
            showFrame(MOVE_CYCLE[Math.floor(now / HOVER_FRAME_MS) % MOVE_CYCLE.length]);
            return;
        }
        if (now >= nextBlinkAt) {
            blinkUntil = now + BLINK_MS;
            nextBlinkAt = now + randomBetween(...BLINK_EVERY_MS);
        }
        showFrame(now < blinkUntil ? FRAME.closed : FRAME.open);
    };
    tick();
    const timer = setInterval(tick, TICK_MS);
    return () => clearInterval(timer);
}
