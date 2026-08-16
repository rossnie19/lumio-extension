import React, { useState } from 'react';

const MOOD_META = {
  focused: { label: 'FOCUSED', text: 'You’ve been researching safely. Great job comparing sources!' },
  idle: { label: 'IDLE', text: 'Zzz... No recent AI activity.' }, // Changed 'resting' to 'idle'
  concerned: { label: 'CONCERNED', text: 'You are relying heavily on AI right now. Use Compass to check those claims!' },
  curious: { label: 'CURIOUS', text: 'Stay curious! Remember to verify tricky answers.' }
};

export default function Companion({ 
  mood = 'curious', 
  characterName, 
  characterImage,
  petName,
  age,
  onNameChange
}) {
  // Forces the incoming mood string to be lowercase so it perfectly matches the MOOD_META keys above!
  const normalizedMood = mood.toLowerCase();
  const meta = MOOD_META[normalizedMood] || MOOD_META.curious;
  
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(petName);

  const handleSave = () => {
    setIsEditing(false);
    if (tempName.trim()) {
      onNameChange(tempName.toUpperCase());
    } else {
      setTempName(petName); 
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
  };

  return (
    <>
      <div className="companion-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        
        <div className="companion-info" style={{ flexGrow: 1 }}>
          
          {/* Character Type - Changed to a darker purple (#3A2B58) */}
          <div style={{ color: '#3A2B58', fontSize: '0.8rem', fontFamily: '"Press Start 2P", cursive', marginBottom: '12px' }}>
            {characterName}
          </div>
          
          <div style={{ marginBottom: '16px', borderBottom: '4px dashed #A991D4', paddingBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isEditing ? (
              <input 
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                autoFocus
                className="pet-name-input"
                maxLength={12}
              />
            ) : (
              <>
                <h2 style={{ fontSize: '1.8rem', color: '#FFFFFF', margin: 0, textShadow: '3px 3px 0px rgba(0,0,0,0.2)' }}>
                  {petName}
                </h2>
                <span 
                  style={{ cursor: 'pointer', fontSize: '1.2rem', transition: 'transform 0.1s' }} 
                  onClick={() => setIsEditing(true)}
                  title="Edit Name"
                >
                  ✏️
                </span>
              </>
            )}
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', color: '#A991D4', fontSize: '0.8rem', fontFamily: '"Press Start 2P", cursive' }}>
            <div>MOOD: {meta.label}</div>
            {/* Added logic to render "DAY" if age is 1, and "DAYS" otherwise */}
            <div>AGE: {age} {age === 1 ? 'DAY' : 'DAYS'}</div>
          </div>
        </div>

        <div style={{ 
          backgroundColor: '#57466E',
          padding: '16px',
          marginLeft: '20px',
          boxShadow: 'inset 4px 4px 0px rgba(0,0,0,0.2)' 
        }}>
          <img 
            src={characterImage} 
            alt={characterName} 
            style={{ width: '90px', height: '90px', imageRendering: 'pixelated', display: 'block' }} 
          />
        </div>
      </div>
      
      <div className="dialogue-box">
        <p>"{meta.text}"</p>
      </div>
    </>
  );
}