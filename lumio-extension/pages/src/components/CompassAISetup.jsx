import React, { useEffect, useState } from 'react';
import { getOnDeviceAIStatus, MODEL_OPTIONS } from '../../../public/shared/claimRewrite.js';

// Shows whether Chrome's on-device AI (used by Compass to rewrite claims into searches) is ready.
// Chrome only lets the model download start from a click, so the button lives here
const STATUS_TEXT = {
  checking: 'Checking...',
  available: 'Ready. Claims are rewritten on this computer, your text never leaves it.',
  downloadable: 'Not downloaded yet. Compass uses simple keywords until then.',
  downloading: 'Downloading the model...',
  unavailable: 'Not supported on this computer. Compass uses simple keywords instead.'
};

export default function CompassAISetup() {
  const [status, setStatus] = useState('checking');
  const [progress, setProgress] = useState(null); // 0..1 while downloading

  useEffect(() => {
    getOnDeviceAIStatus().then(setStatus);
  }, []);

  const handleDownload = async () => {
    setStatus('downloading');
    setProgress(0);
    try {
      const session = await LanguageModel.create({
        ...MODEL_OPTIONS,
        monitor(m) {
          m.addEventListener('downloadprogress', (e) => setProgress(e.loaded));
        }
      });
      session.destroy();
    } catch (err) {
      console.warn('On-device AI download failed:', err);
    }
    setProgress(null);
    setStatus(await getOnDeviceAIStatus());
  };

  const text = status === 'downloading' && progress !== null
    ? `Downloading the model... ${Math.round(progress * 100)}%`
    : STATUS_TEXT[status] || STATUS_TEXT.unavailable;

  return (
    <div className="compass-ai-setup">
      <div>
        <span className="compass-ai-label">COMPASS AI:</span> {text}
      </div>
      {status === 'downloadable' && (
        <button className="pixel-btn select-btn" onClick={handleDownload}>DOWNLOAD</button>
      )}
    </div>
  );
}
