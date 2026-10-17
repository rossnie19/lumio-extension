import { SESSION_CONFIG } from "./constants.js";
import { getData } from "./storage.js";

// the only valid mood values (always lowercase)
export const MOODS = ["curious", "focused", "concerned", "idle"];

// turn any stored/legacy mood value ("Idle", "resting", "CURIOUS"...) into one of MOODS
export function normalizeMood(mood) {
  if (typeof mood !== "string") return "curious";
  const lower = mood.toLowerCase();
  if (lower === "resting") return "idle"; // old name for idle
  return MOODS.includes(lower) ? lower : "curious";
}

// Determine current companion mood: curious, focused, concerned, or idle
export async function getCompanionMood() {
  const lastCompassUse = await getData("lastCompassUse");
  const lastActivity = await getData("lastActivityTime");
  const session = await getData("currentSession");
  const now = Date.now();

  // focused: Compass was used very recently (within last 2 minutes)
  if (lastCompassUse && now - lastCompassUse < 2 * 60 * 1000) {
    return "focused";
  }

  // idle: no activity within the resting threshold
  if (!lastActivity || now - lastActivity > SESSION_CONFIG.restingMinutes * 60 * 1000) {
    return "idle";
  }

  // concerned: current session's active time exceeds the threshold
  if (session && session.activeMs > SESSION_CONFIG.concernedSessionMinutes * 60 * 1000) {
    return "concerned";
  }

  // Default: balanced, healthy use
  return "curious";
}
