import React from 'react';

export default function ReflectionLog({ verifiedCount }) {
  return (
    <div className="reflection-log">
      <h2>Compass Uses</h2>
      <p style={{ fontSize: '1.8rem', margin: '10px 0' }}>
        <strong>{verifiedCount}</strong> Claims Verified
      </p>
      <p>Keep cross-referencing your data!</p>
    </div>
  );
}