import { setData } from "./public/shared/storage.js";
import { getCompanionMood } from "./public/shared/companionState.js";

async function runTest() {
  const now = Date.now();

  // Scenario: test each mood one at a time by changing which block is active

  // 1. RESTING test — no activity at all
  // await setData("lastActivityTime", null);
  // await setData("currentSession", null);
  // await setData("lastCompassUse", null);

  // 2. CURIOUS test — recent moderate activity, short session
  await setData("lastActivityTime", now);
  await setData("currentSession", { startTime: now - 10 * 60 * 1000, activeMs: 10 * 60 * 1000, lastSeen: now });
  await setData("lastCompassUse", null);

  // 3. FOCUSED test — uncomment to test instead
  // await setData("lastActivityTime", now);
  // await setData("currentSession", { startTime: now - 5 * 60 * 1000, activeMs: 5 * 60 * 1000, lastSeen: now });
  // await setData("lastCompassUse", now);

  // 4. CONCERNED test — uncomment to test instead
  // await setData("lastActivityTime", now);
  // await setData("currentSession", { startTime: now - 50 * 60 * 1000, activeMs: 50 * 60 * 1000, lastSeen: now });
  // await setData("lastCompassUse", null);

  const mood = await getCompanionMood();
  console.log("Current mood:", mood);
}

runTest();