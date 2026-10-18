import React from 'react';

export default function CompassStats({ stats }) {
  return (
    <section className="compass-stats-container">
      <img src="/assets/compass-logo.png" alt="Compass" className="compass-logo" />
      <div className="tiles three">
        <div className="tile stat-card">
          <div className="compass-number">{stats.today}</div>
          <div className="tile-label">CHECKED TODAY</div>
        </div>
        <div className="tile stat-card">
          <div className="compass-number">{stats.week}</div>
          <div className="tile-label">THIS WEEK</div>
        </div>
        <div className="tile stat-card" title="Claims checked this week ÷ AI sessions this week">
          {/* rate is null when there were no AI sessions this week */}
          <div className="compass-number">{stats.rate == null ? '—' : `${stats.rate}%`}</div>
          <div className="tile-label">CROSS-CHECK RATE</div>
        </div>
      </div>
    </section>
  );
}
