import React, { useEffect, useState } from 'react';
import { pickDialogueLine } from '../../../public/shared/dialogue.js';
import { MOODS } from '../../../public/shared/companionState.js';
import SpritePortrait from './SpritePortrait';
const LINE_ROTATE_MS = 30 * 1000;

// the companion card + speech bubble; styles shared with the popup (styles/theme.css)
export default function Companion({
  mood = 'curious',
  character,
  petName,
  age,
  onNameChange
}) {
  const moodKey = MOODS.includes(mood) ? mood : 'curious';

  // what the companion says: a line from its folklore (dialogue.js) for the current mood.
  // a new one is picked when the mood or character changes, and every LINE_ROTATE_MS
  const characterId = character.id;
  const [line, setLine] = useState(() => pickDialogueLine(characterId, moodKey));

  useEffect(() => {
    setLine(pickDialogueLine(characterId, moodKey));
    const timer = setInterval(
      () => setLine(previous => pickDialogueLine(characterId, moodKey, previous)),
      LINE_ROTATE_MS
    );
    return () => clearInterval(timer);
  }, [characterId, moodKey]);

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
    <section>
      <div className="companion-card">
        <div className="companion-portrait">
          <SpritePortrait character={character} mood={moodKey} />
        </div>

        <div className="companion-info">
          <div className="companion-type">{character.name}</div>

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
            <div className="companion-name-row">
              <h2 className="companion-name">{petName}</h2>
              <button
                className="edit-name"
                onClick={() => {
                  setTempName(petName); // start from the saved name (it loads after this component mounts)
                  setIsEditing(true);
                }}
                title="Edit name"
              >
                ✏️
              </button>
            </div>
          )}

          <div className="companion-tags">
            <span className={`mood-chip mood-${moodKey}`}>{moodKey}</span>
            <span>Day {age}</span>
          </div>
        </div>
      </div>

      <p className="speech-bubble" aria-live="polite">"{line}"</p>
    </section>
  );
}
