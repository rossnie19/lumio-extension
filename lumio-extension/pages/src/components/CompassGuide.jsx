import React from 'react';
import { SESSION_CONFIG } from '../../../public/shared/constants.js';

// step-by-step explanation of what happens when you check a claim (background.js, claimRewrite.js,
// sourceSearch.js, content-scripts/compass.js)
export default function CompassGuide() {
  return (
    <details className="guide card" open>
      <summary>HOW COMPASS WORKS</summary>
      <ol className="guide-steps">
        <li>
          <strong>Highlight</strong> a claim on any page, right-click it, and choose
          <strong> Check with Compass</strong>. A sidebar opens on the right.
        </li>
        <li>
          <strong>Rewrite.</strong> Chrome's built-in AI turns the text into one clear claim plus a few
          search keywords. It runs on this computer, so your text never leaves it. Without the AI,
          Compass simply drops filler words instead.
        </li>
        <li>
          <strong>Search.</strong> Only those short keywords are sent to three free research databases:
          <ul>
            <li><strong>OpenAlex</strong>: research papers from every field</li>
            <li><strong>Europe PMC</strong>: health and medical studies</li>
            <li><strong>DOAJ</strong>: open-access journals, so every result is free to read</li>
          </ul>
        </li>
        <li>
          <strong>Read.</strong> The sidebar lists real papers with their authors, year and journal.
          The AI only writes the search, never the sources, so it can't make up papers.
        </li>
        <li>
          <strong>Compare.</strong> Open a few results and see if they agree with the claim. More
          search sites are linked at the bottom.
        </li>
      </ol>
      <p className="guide-note">
        Nothing you check is saved. Each check counts toward your stats and keeps your companion
        Focused for {SESSION_CONFIG.focusedMinutes} minutes.
      </p>
    </details>
  );
}
