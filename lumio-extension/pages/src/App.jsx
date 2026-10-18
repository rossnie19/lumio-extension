import React, { useEffect, useState } from 'react';
import Companion from './components/Companion';
import UsageChart from './components/UsageChart';
import CharacterSelector from './components/CharacterSelector';
import MonthlyOverview from './components/MonthlyOverview';
import WeeklyOverview from './components/WeeklyOverview';
import CompassStats from './components/CompassStats';
import CompassAISetup from './components/CompassAISetup';
import { getCompanionMood, normalizeMood } from '../../public/shared/companionState.js';
import { getHistory, LIVE_STAT_KEYS } from '../../public/shared/storage.js';
import { buildLiveView } from '../../public/shared/stats.js';
import { DEFAULT_PET_NAME, DEFAULT_CHARACTER } from '../../public/shared/constants.js';
import './styles/dashboard.css';

const hasChromeStorage = () => typeof chrome !== 'undefined' && chrome.storage;

export default function App() {
  const [mood, setMood] = useState("curious");
  const [history, setHistory] = useState({}); // dailyHistory from storage.js
  const [petName, setPetName] = useState(DEFAULT_PET_NAME);
  const [age, setAge] = useState(1);
  const [showPet, setShowPet] = useState(true); // walking pet on AI sites (content-scripts/pet.js)

  const [activeCharacter, setActiveCharacter] = useState(DEFAULT_CHARACTER);

  useEffect(() => {
    if (!hasChromeStorage()) return; // e.g. running in vite dev outside the extension

    // real numbers, recorded by background.js
    async function loadLiveData() {
      try {
        setMood(normalizeMood(await getCompanionMood()));
        setHistory(await getHistory());
      } catch (err) {
        console.log("Could not load live data:", err);
      }
    }

    async function loadDashboardData() {
      try {
        // Load Age, Name and Active Character from Chrome Storage
        const data = await chrome.storage.local.get(['installDate', 'petName', 'activeCharacter', 'showPetOnAISites']);
        if (data.petName) setPetName(data.petName);
        if (data.activeCharacter) setActiveCharacter(data.activeCharacter);
        setShowPet(data.showPetOnAISites !== false);

        // installDate is saved by background.js on install; older installs get it the first time here
        let installDate = data.installDate;
        if (!installDate) {
          installDate = Date.now();
          await chrome.storage.local.set({ installDate });
        }
        // install day = day 1, the next day = day 2, ...
        const msPerDay = 1000 * 60 * 60 * 24;
        setAge(Math.floor((Date.now() - installDate) / msPerDay) + 1);
      } catch (err) {
        console.log("Could not load dashboard data:", err);
      }
      await loadLiveData();
    }
    loadDashboardData();

    // Instantly update the dashboard whenever the tracked stats change, without refreshing!
    const handleStorageChange = (changes, namespace) => {
      if (namespace === 'local' && LIVE_STAT_KEYS.some(key => key in changes)) {
        loadLiveData();
      }
    };
    chrome.storage.onChanged.addListener(handleStorageChange);

    // the mood also changes just because time passes (focused wears off, idle kicks in), so re-check regularly
    const moodTimer = setInterval(loadLiveData, 30 * 1000);

    // Cleanup listener and timer when the dashboard is closed
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange);
      clearInterval(moodTimer);
    };
  }, []);

  const handleCharacterSelect = (character) => {
    setActiveCharacter(character);
    // Save the selected character to storage!
    if (hasChromeStorage()) {
      chrome.storage.local.set({ activeCharacter: character });
    }
  };

  const handleNameSave = (newName) => {
    setPetName(newName);
    if (hasChromeStorage()) {
      chrome.storage.local.set({ petName: newName });
    }
  };

  const handleShowPetChange = (e) => {
    setShowPet(e.target.checked);
    if (hasChromeStorage()) {
      chrome.storage.local.set({ showPetOnAISites: e.target.checked });
    }
  };

  const view = buildLiveView(history); // definitions of week/rate/streak/coins are in stats.js

  return (
    <div className="dashboard-container">
      <div className="dashboard-logo-container">
        <img src="/assets/lumio-logo.png" alt="Lumio Dashboard" className="dashboard-logo" />
      </div>

      <div className="dashboard-grid">

        {/* COLUMN 1 */}
        <div className="column">
          <WeeklyOverview weeklyData={view.weeklyActivity} />
          <CompassStats stats={view.compassStats} />
          <CompassAISetup />
        </div>

        {/* COLUMN 2 */}
        <div className="column">
          <MonthlyOverview
            totalTime={view.monthlyMinutes}
            sessions={view.monthlySessions}
            claimsCount={view.monthlyClaims}
            streak={view.streak}
          />
          <UsageChart
            domainBreakdown={view.domainBreakdown}
            totalTime={view.platformTotalMinutes}
          />
        </div>

        {/* COLUMN 3: The Companion & Selector */}
        <div className="column">
          <h2 className="section-title" style={{ margin: '0 0 16px 0', color: '#6D5A88', textAlign: 'left' }}>
            COMPANION
          </h2>

          <Companion
            mood={mood}
            characterName={activeCharacter.name}
            characterImage={activeCharacter.image}
            petName={petName}
            age={age}
            onNameChange={handleNameSave}
          />

          <CharacterSelector activeId={activeCharacter.id} onSelect={handleCharacterSelect} />

          <label className="pet-toggle">
            <input type="checkbox" checked={showPet} onChange={handleShowPetChange} />
            SHOW PET ON AI SITES
          </label>
        </div>

      </div>
    </div>
  );
}
