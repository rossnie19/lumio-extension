// You can keep this here as a fallback just in case any old components are still looking for it!
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

// The dynamic dataset for the Director's Dropdown
export const mockDataSets = {
  Curious: {
    // High verification spread out across the week (adds up to 45)
    weeklyActivity: [ 
      { day: 'MONDAY', score: 3 },
      { day: 'TUESDAY', score: 5 },
      { day: 'WEDNESDAY', score: 6 },
      { day: 'THURSDAY', score: 8 },
      { day: 'FRIDAY', score: 7 },
      { day: 'SATURDAY', score: 9 },
      { day: 'SUNDAY', score: 7 }
    ],
    compassStats: { today: 18, week: 45, rate: 92 }, // High overall stats
    totalTimeMinutes: 78,
    sessionsToday: 2,
    domainBreakdown: [ 
      { domain: 'chatgpt.com', timeMinutes: 50, visits: 3 },
      { domain: 'claude.ai', timeMinutes: 20, visits: 1 },
      { domain: 'gemini.google.com', timeMinutes: 8, visits: 1 }
    ]
  },
  Focused: {
    // Slightly lower verification, but higher productivity (adds up to 33)
    weeklyActivity: [ 
      { day: 'MONDAY', score: 4 },
      { day: 'TUESDAY', score: 6 },
      { day: 'WEDNESDAY', score: 5 },
      { day: 'THURSDAY', score: 7 },
      { day: 'FRIDAY', score: 6 },
      { day: 'SATURDAY', score: 3 },
      { day: 'SUNDAY', score: 2 }
    ],
    compassStats: { today: 16, week: 33, rate: 89 }, 
    totalTimeMinutes: 180, // Much longer use time
    sessionsToday: 4,
    domainBreakdown: [ 
      { domain: 'chatgpt.com', timeMinutes: 100, visits: 4 },
      { domain: 'perplexity.ai', timeMinutes: 45, visits: 2 },
      { domain: 'scholar.google.com', timeMinutes: 35, visits: 2 } // Academic focus
    ]
  },
  Concerned: {
    // High AI use, but very low verification (adds up to 30)
    weeklyActivity: [ 
      { day: 'MONDAY', score: 8 },
      { day: 'TUESDAY', score: 5 },
      { day: 'WEDNESDAY', score: 4 },
      { day: 'THURSDAY', score: 6 },
      { day: 'FRIDAY', score: 5 },
      { day: 'SATURDAY', score: 1 },
      { day: 'SUNDAY', score: 1 }
    ],
    compassStats: { today: 1, week: 30, rate: 15 }, // Terrible verify rate
    totalTimeMinutes: 300, // Dangerously high total time
    sessionsToday: 8,
    domainBreakdown: [ 
      { domain: 'chatgpt.com', timeMinutes: 250, visits: 6 }, // Over-reliant on ChatGPT
      { domain: 'claude.ai', timeMinutes: 50, visits: 2 }
    ]
  },
  Idle: {
    // Almost completely flatline charts (adds up to 2)
    weeklyActivity: [ 
      { day: 'MONDAY', score: 0 },
      { day: 'TUESDAY', score: 0 },
      { day: 'WEDNESDAY', score: 1 },
      { day: 'THURSDAY', score: 0 },
      { day: 'FRIDAY', score: 1 },
      { day: 'SATURDAY', score: 0 },
      { day: 'SUNDAY', score: 0 }
    ],
    compassStats: { today: 0, week: 2, rate: 10 },
    totalTimeMinutes: 15, // Barely touched it today
    sessionsToday: 1,
    domainBreakdown: [ 
      { domain: 'chatgpt.com', timeMinutes: 15, visits: 1 }
    ]
  }
};