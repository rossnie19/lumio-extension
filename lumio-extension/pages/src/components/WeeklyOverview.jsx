import React from 'react';

export default function WeeklyOverview({ weeklyData = [] }) {
  return (
    <section className="weekly-container card">
      <h2 className="section-title">THIS WEEK</h2>
      {/* rows come from buildWeekRows in stats.js (1 coin = 30 min, max 6) */}
      {weeklyData.map((dayData) => (
        <div key={dayData.day} className="weekly-row" title={dayData.tooltip}>
          <span className="day-label">{dayData.day.slice(0, 3)}</span>
          <div className="coin-slots">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`pixel-coin ${i < dayData.score ? 'coin-gold' : 'coin-empty'}`}></div>
            ))}
          </div>
          <span className="day-time">{dayData.tooltip.replace(' with AI', '')}</span>
        </div>
      ))}
      <div className="weekly-note">1 coin = 30 min with AI</div>
    </section>
  );
}
