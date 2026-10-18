import React from 'react';
import { formatMinutes } from '../../../public/shared/stats.js';

export default function MonthlyOverview({ totalTime, sessions, claimsCount, streak }) {
  return (
    <section>
      <h2 className="section-title">THIS MONTH</h2>
      <div className="tiles two">
        <div className="tile bg-green">
          <div className="tile-value">{claimsCount}</div>
          <div className="tile-label">CLAIMS CHECKED</div>
        </div>
        <div className="tile bg-orange">
          <div className="tile-value">{formatMinutes(totalTime)}</div>
          <div className="tile-label">IN AI TOOLS</div>
        </div>
        <div className="tile bg-red">
          <div className="tile-value">{streak}</div>
          <div className="tile-label">DAY STREAK</div>
        </div>
        <div className="tile bg-purple">
          <div className="tile-value">{sessions}</div>
          <div className="tile-label">AI SESSIONS</div>
        </div>
      </div>
    </section>
  );
}
