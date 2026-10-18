import React from 'react';
import { SESSION_CONFIG } from '../../../public/shared/constants.js';

// explains what each companion mood means; the numbers come from SESSION_CONFIG, the same
// settings companionState.js uses to decide the mood, so this text can't drift from the real rules
const MOODS = [
  {
    id: 'focused',
    label: 'FOCUSED',
    rule: `You checked a claim with Compass in the last ${SESSION_CONFIG.focusedMinutes} minutes.`,
    meaning: 'Your companion is proud of you for comparing sources.'
  },
  {
    id: 'curious',
    label: 'CURIOUS',
    rule: `The everyday mood, shown when none of the others apply: you've used AI in the last ${SESSION_CONFIG.idleMinutes} minutes, your session is under ${SESSION_CONFIG.concernedSessionMinutes} minutes (or you took a break), and you haven't checked a claim in the last ${SESSION_CONFIG.focusedMinutes} minutes. No checks are needed for it.`,
    meaning: 'Keep asking questions, and keep checking the tricky answers.'
  },
  {
    id: 'concerned',
    label: 'CONCERNED',
    rule: `You have been using AI for over ${SESSION_CONFIG.concernedSessionMinutes} minutes without a break of more than ${SESSION_CONFIG.gapThresholdMinutes} minutes.`,
    meaning: 'Time to step away, think it through yourself, or check what the AI told you.'
  },
  {
    id: 'idle',
    label: 'IDLE',
    rule: `You haven't looked at an AI site for ${SESSION_CONFIG.idleMinutes} minutes.`,
    meaning: 'Your companion takes a nap until you come back.'
  }
];

export default function MoodGuide({ currentMood }) {
  return (
    <details className="guide card">
      <summary>WHAT DOES THE MOOD MEAN?</summary>
      <p className="guide-intro">
        Your companion's mood follows how you use AI sites (ChatGPT, Claude, Gemini, Perplexity).
        It checks again every minute.
      </p>
      <ul className="mood-list">
        {MOODS.map(mood => (
          <li key={mood.id} className={mood.id === currentMood ? 'current' : ''}>
            <div className="mood-name">
              {mood.label}
              {mood.id === currentMood && <span className="now-tag">NOW</span>}
            </div>
            <div className="mood-rule">{mood.rule}</div>
            <div className="mood-meaning">{mood.meaning}</div>
          </li>
        ))}
      </ul>
      <p className="guide-note">
        If more than one fits, Focused wins first, then Idle, then Concerned. Otherwise it's Curious.
      </p>
    </details>
  );
}
