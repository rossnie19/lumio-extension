import React from 'react';

export default function WeeklyOverview({ weeklyData = [] }) {
  return (
    <div className="weekly-container">
      {/* Aligned header spacing to match the other columns */}
      <h2 className="section-title" style={{ textAlign: 'left', color: '#5A4534', marginBottom: '16px', marginTop: '0', fontSize: '1.4rem' }}>
        WEEKLY OVERVIEW
      </h2>
      
      <div className="weekly-grid">
        {weeklyData.map((dayData, index) => {
          // Each coin represents 2 hours!
          const hoursActive = dayData.score * 2; 
          
          return (
            <div 
              key={index} 
              className="weekly-row"
              data-tooltip={`${hoursActive} Hours Active`} 
            >
              <span className="day-label">{dayData.day}</span>
              
              <div className="coin-slots">
                {[...Array(6)].map((_, i) => (
                  <div 
                    key={i} 
                    className={`pixel-coin ${i < dayData.score ? 'coin-gold' : 'coin-empty'}`}
                  ></div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}