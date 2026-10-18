import React from 'react';

// each platform gets its own colour from the theme (styles/theme.css)
const PLATFORM_META = {
  'chatgpt.com': { name: 'CHATGPT', color: 'var(--red)' },
  'claude.ai': { name: 'CLAUDE', color: 'var(--orange)' },
  'gemini.google.com': { name: 'GEMINI', color: 'var(--green)' },
  'perplexity.ai': { name: 'PERPLEXITY', color: 'var(--purple)' },
  'default': { name: 'OTHER', color: 'var(--grey)' }
};

export default function UsageChart({ domainBreakdown = [], totalTime = 0 }) {
  const topPlatforms = [...domainBreakdown]
    .sort((a, b) => b.timeMinutes - a.timeMinutes)
    .slice(0, 3);

  let gradientString = '';
  let cumulativePercentage = 0;

  topPlatforms.forEach((platform, index) => {
    const meta = PLATFORM_META[platform.domain] || PLATFORM_META['default'];
    const percentage = (platform.timeMinutes / totalTime) * 100;
    gradientString += `${meta.color} ${cumulativePercentage}% ${cumulativePercentage + percentage}%`;
    if (index < topPlatforms.length - 1) gradientString += ', ';
    cumulativePercentage += percentage;
  });

  if (cumulativePercentage < 100) {
    // no leading comma when there are no platforms at all
    gradientString += `${gradientString ? ', ' : ''}var(--ink) ${cumulativePercentage}% 100%`;
  }

  return (
    <section className="platform-card card">
      <h2 className="section-title">MOST USED THIS MONTH</h2>
      <div className="platform-content">
        <div className="pixel-pie-chart" style={{ background: `conic-gradient(${gradientString})` }}></div>
        <div className="platform-list">
          {topPlatforms.length === 0 && <span className="platform-empty">No platform data yet</span>}
          {topPlatforms.map((platform, index) => {
            const meta = PLATFORM_META[platform.domain] || PLATFORM_META['default'];
            const percentage = Math.round((platform.timeMinutes / totalTime) * 100);
            return (
              <div key={platform.domain} className="platform-rank-item">
                <span className="rank-dot" style={{ backgroundColor: meta.color }}></span>
                <span className="platform-name">{index + 1}. {meta.name}</span>
                <span className="platform-percent">{percentage}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
