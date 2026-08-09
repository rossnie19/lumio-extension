export const mockData = {
  ageDays: 41,
  level: 8,
  totalTimeMinutes: 85,
  sessionsToday: 4,
  verifiedClaimsCount: 5,
  currentMood: 'concerned', 
  domainBreakdown: [
    { domain: 'chatgpt.com', timeMinutes: 50, visits: 3 },
    { domain: 'claude.ai', timeMinutes: 20, visits: 1 },
    { domain: 'gemini.google.com', timeMinutes: 15, visits: 1 }
  ],
  // NEW: Add this weekly tracking data!
  weeklyActivity: [
    { day: 'MONDAY', score: 0 },
    { day: 'TUESDAY', score: 1 },
    { day: 'WEDNESDAY', score: 5 },
    { day: 'THURSDAY', score: 6 },
    { day: 'FRIDAY', score: 2 },
    { day: 'SATURDAY', score: 3 },
    { day: 'SUNDAY', score: 0 }
  ],
  compassStats: {
    today: 4,
    week: 13,
    rate: 74
  }
};