import React from 'react';
import { formatMinutes } from '../../../public/shared/stats.js';

// today's three numbers (the same ones the popup shows)
export default function TodayStats({ today }) {
  return (
    <section>
      <h2 className="section-title">TODAY</h2>
      <div className="tiles three">
        <div className="tile bg-orange">
          <div className="tile-value">{formatMinutes(today.minutes)}</div>
          <div className="tile-label">WITH AI</div>
        </div>
        <div className="tile bg-purple">
          <div className="tile-value">{today.sessions}</div>
          <div className="tile-label">{today.sessions === 1 ? 'SESSION' : 'SESSIONS'}</div>
        </div>
        <div className="tile bg-green">
          <div className="tile-value">{today.claims}</div>
          <div className="tile-label">CHECKED</div>
        </div>
      </div>
    </section>
  );
}
