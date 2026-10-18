import { SESSION_CONFIG } from "./constants.js";
import { getData } from "./storage.js";

// the only mood values getCompanionMood() returns
export const MOODS = ["curious", "focused", "concerned", "idle"];

// Determine current companion mood: curious, focused, concerned, or idle
export async function getCompanionMood() {
  const lastCompassUse = await getData("lastCompassUse");
  const lastAIView = await getData("lastAIViewTime"); // last time an AI tab was looked at (background.js)
  const session = await getData("currentSession");
  const now = Date.now();

  // focused: Compass was used very recently
  if (lastCompassUse && now - lastCompassUse < SESSION_CONFIG.focusedMinutes * 60 * 1000) {
    return "focused";
  }

  // idle: haven't looked at an AI tab for a while
  if (!lastAIView || now - lastAIView > SESSION_CONFIG.idleMinutes * 60 * 1000) {
    return "idle";
  }

  // concerned: the session is still going (no break longer than the gap) and has run too long
  const sessionStillActive = now - lastAIView <= SESSION_CONFIG.gapThresholdMinutes * 60 * 1000;
  if (sessionStillActive && session && session.activeMs > SESSION_CONFIG.concernedSessionMinutes * 60 * 1000) {
    return "concerned";
  }

  // Default: balanced, healthy use
  return "curious";
}
