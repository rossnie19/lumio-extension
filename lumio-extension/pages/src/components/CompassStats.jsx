import React from 'react';

export default function CompassStats({ stats }) {
    if (!stats) return <div>Loading Compass...</div>;
    
  return (
    <div className="compass-stats-container">
      {/* Replaced C🧭mpass text with PNG Logo */}
      <div className="compass-logo-container">
        <img src="/assets/compass-logo.png" alt="Compass Stats" className="compass-logo" />
      </div>
      
      {/* The 3 Columns */}
      <div className="compass-row">
        <div className="compass-col">
          <div className="compass-number">{stats.today}</div>
          <div className="compass-label">CLAIMS<br/>VERIFIED<br/>TODAY</div>
        </div>
        
        <div className="compass-col">
          <div className="compass-number">{stats.week}</div>
          <div className="compass-label">CLAIMS<br/>VERIFIED<br/>THIS WEEK</div>
        </div>
        
        <div className="compass-col">
          <div className="compass-number">{stats.rate}%</div>
          <div className="compass-label">CROSS-<br/>REFERENCING<br/>RATE</div>
        </div>
      </div>
    </div>
  );
}