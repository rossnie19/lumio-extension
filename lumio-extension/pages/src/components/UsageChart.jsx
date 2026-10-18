import React from 'react';

// each platform gets its own color from the dashboard palette
const PLATFORM_META = {
  'chatgpt.com': { name: 'CHATGPT', color: '#B55043' }, // Red
  'claude.ai': { name: 'CLAUDE', color: '#D98C4A' },    // Orange
  'gemini.google.com': { name: 'GEMINI', color: '#2D4A3E' }, // Green
  'perplexity.ai': { name: 'PERPLEXITY', color: '#6D5A88' }, // Purple
  'default': { name: 'OTHER', color: '#333333' }
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
    gradientString += `${gradientString ? ', ' : ''}#3A2B20 ${cumulativePercentage}% 100%`;
  }

  return (
    <div className="card platform-card">
      <h2 style={{ textAlign: 'left', color: '#3A2B20' }} className="section-title">MOST USED PLATFORM</h2>
      
      <div className="platform-content">
        <div 
          className="pixel-pie-chart" 
          style={{ background: `conic-gradient(${gradientString})` }}
        ></div>

        <div className="platform-list">
          {topPlatforms.length === 0 && (
            <span className="platform-name" style={{ fontFamily: "'VT323', monospace", fontSize: '1.4rem' }}>
              No platform data yet
            </span>
          )}
          {topPlatforms.map((platform, index) => {
            const meta = PLATFORM_META[platform.domain] || PLATFORM_META['default'];
            // Calculate the exact percentage for the tooltip
            const displayPercentage = ((platform.timeMinutes / totalTime) * 100).toFixed(1) + '%';
            
            return (
              <div 
                key={platform.domain} 
                className="platform-rank-item" 
                data-percentage={displayPercentage}
              >
                <span className="rank-number" style={{ color: meta.color }}>
                  {index + 1}.
                </span>
                <span className="platform-name">{meta.name}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}