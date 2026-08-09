import React, { useState } from 'react';

const CHARACTERS = [
  { id: 'mangkukulam', name: 'MANGKUKULAM', image: '/assets/companion/mangkukulam.png' },
  { id: 'manananggal', name: 'MANANANGGAL', image: '/assets/companion/manananggal.png' },
  { id: 'tikbalang', name: 'TIKBALANG', image: '/assets/companion/tikbalang.png' }
];

export default function CharacterSelector({ onSelect }) {
  // Tracks which character we are currently looking at in the menu
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? CHARACTERS.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === CHARACTERS.length - 1 ? 0 : prev + 1));
  };

  const currentCharacter = CHARACTERS[currentIndex];

  return (
    <div className="character-selector-card">
      <div className="character-avatar-container">
        {/* Placeholder for the pixel art sprite */}
        <div className="character-avatar-container">
            <img 
            src={currentCharacter.image} 
            alt={currentCharacter.name} 
            style={{ width: '70px', height: '70px', imageRendering: 'pixelated' }}
            />
        </div>
      </div>
      
      <div className="character-selector-controls">
        <div className="selector-header">
          <span className="selector-title">CHARACTER SELECTION</span>
          <span className="selector-name">{currentCharacter.name}</span>
        </div>
        
        <div className="selector-buttons">
          <button className="pixel-btn arrow-btn" onClick={handlePrev}>{"<"}</button>
          <button className="pixel-btn arrow-btn" onClick={handleNext}>{">"}</button>
          <button 
            className="pixel-btn select-btn"
            onClick={() => onSelect(currentCharacter)}
          >
            SELECT
          </button>
        </div>
      </div>
    </div>
  );
}