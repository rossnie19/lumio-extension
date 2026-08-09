import React from 'react';

export default function MonthlyOverview({ totalTime, sessions, verifiedCount, streak = 6 }) {
  // Convert minutes to hours and mins
  const hours = Math.floor(totalTime / 60);
  const mins = totalTime % 60;

  return (
    <div style={{ marginBottom: '32px' }}>
      <h2 className="section-title" style={{ textAlign: 'left', color: '#D98C4A', marginTop: '0', marginBottom: '16px' }}>
        MONTHLY OVERVIEW
      </h2>
      
      <div className="stats-grid">
        <div className="stat-block bg-green">
          <h3 style={{ fontSize: '0.8rem', color: '#A9D6A3' }}>Claims Verified</h3>
          <div className="stat-value">{verifiedCount}</div>
        </div>
        
        <div className="stat-block bg-orange">
          <h3 style={{ fontSize: '0.8rem', color: '#FFD8A8' }}>Time in AI Tools</h3>
          <div className="stat-value">{hours}h {mins}m</div>
        </div>
        
        <div className="stat-block bg-red">
          <h3 style={{ fontSize: '0.8rem', color: '#FFC9C9' }}>Current Streak</h3>
          <div className="stat-value">{streak}<br/><span style={{fontSize: '0.8rem'}}>Days</span></div>
        </div>
        
        <div className="stat-block bg-purple">
          <h3 style={{ fontSize: '0.8rem', color: '#D5C4EC' }}>AI Sessions</h3>
          <div className="stat-value">{sessions}</div>
        </div>
      </div>
    </div>
  );
}