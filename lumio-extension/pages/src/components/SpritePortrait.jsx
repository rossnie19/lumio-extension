import React, { useEffect, useRef } from 'react';
import { animateSprite } from '../../../public/shared/spriteAnimator.js';

// an animated character portrait (blinks, flaps, sleeps); same animation as the popup's
export default function SpritePortrait({ character, mood = 'curious', className = '' }) {
  const ref = useRef(null);

  useEffect(() => animateSprite(ref.current, character, mood), [character, mood]);

  return <div ref={ref} className={`sprite-portrait ${className}`} role="img" aria-label={character.name} />;
}
