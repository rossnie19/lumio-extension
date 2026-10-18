import React, { useEffect, useState } from 'react';
import Companion from './components/Companion';
import TodayStats from './components/TodayStats';
import UsageChart from './components/UsageChart';
import CharacterSelector from './components/CharacterSelector';
import MonthlyOverview from './components/MonthlyOverview';
import WeeklyOverview from './components/WeeklyOverview';
import CompassStats from './components/CompassStats';
import CompassAISetup from './components/CompassAISetup';
import MoodGuide from './components/MoodGuide';
import CompassGuide from './components/CompassGuide';
import { getCompanionMood } from '../../public/shared/companionState.js';
import { getHistory, LIVE_STAT_KEYS } from '../../public/shared/storage.js';
import { buildLiveView } from '../../public/shared/stats.js';
import { DEFAULT_PET_NAME, DEFAULT_CHARACTER, characterById } from '../../public/shared/constants.js';
import './styles/theme.css';
import './styles/dashboard.css';

const hasChromeStorage = () => typeof chrome !== 'undefined' && chrome.storage;

// the dashboard is a narrow side panel (see "side_panel" in manifest.json), so content is split into tabs
const TABS = [
  { id: 'today', label: 'TODAY' },
  { id: 'week', label: 'WEEK' },
  { id: 'compass', label: 'COMPASS' },
  { id: 'pet', label: 'PET' }
];
const TAB_STORAGE_KEY = 'lumio-dashboard-tab'; // remembers the last open tab (this browser only)

function loadSavedTab() {
  try {
    const saved = localStorage.getItem(TAB_STORAGE_KEY);
    return TABS.some(t => t.id === saved) ? saved : 'today';
  } catch {
    return 'today';
  }
}

export default function App() {
  const [tab, setTab] = useState(loadSavedTab);
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
        setMood(await getCompanionMood());
        setHistory(await getHistory());
      } catch (err) {
        console.warn("Could not load live data:", err);
      }
    }

    async function loadDashboardData() {
      try {
        // Load Age, Name and Active Character from Chrome Storage
        const data = await chrome.storage.local.get(['installDate', 'petName', 'activeCharacter', 'showPetOnAISites']);
        if (data.petName) setPetName(data.petName);
        setActiveCharacter(characterById(data.activeCharacter?.id));
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
        console.warn("Could not load dashboard data:", err);
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

  const handleTabChange = (id) => {
    setTab(id);
    try {
      localStorage.setItem(TAB_STORAGE_KEY, id);
    } catch {
      // storage blocked: the panel just opens on TODAY next time
    }
  };

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
    <div className="panel">
      <header className="panel-header">
        <img src="/assets/lumio-logo.png" alt="Lumio" className="panel-logo" />
      </header>

      <nav className="tabs" role="tablist">
        {TABS.map(t => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`tab ${tab === t.id ? 'active' : ''}`}
            onClick={() => handleTabChange(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="tab-body" role="tabpanel">
        {tab === 'today' && (
          <>
            <Companion
              mood={mood}
              characterId={activeCharacter.id}
              characterName={activeCharacter.name}
              characterImage={activeCharacter.image}
              petName={petName}
              age={age}
              onNameChange={handleNameSave}
            />
            <TodayStats today={view.today} />
            <MoodGuide currentMood={mood} />
          </>
        )}

        {tab === 'week' && (
          <>
            <WeeklyOverview weeklyData={view.weeklyActivity} />
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
          </>
        )}

        {tab === 'compass' && (
          <>
            <CompassStats stats={view.compassStats} />
            <CompassAISetup />
            <CompassGuide />
          </>
        )}

        {tab === 'pet' && (
          <>
            <CharacterSelector activeId={activeCharacter.id} onSelect={handleCharacterSelect} />
            <label className="switch-row card">
              <span className="switch-text">
                <span className="switch-title">SHOW PET ON AI SITES</span>
                <span className="switch-hint">
                  Your companion walks along the bottom of ChatGPT, Claude, Gemini and Perplexity and acts out
                  its mood. Click it there for today's stats.
                </span>
              </span>
              <input type="checkbox" className="switch" checked={showPet} onChange={handleShowPetChange} />
            </label>
          </>
        )}
      </main>
    </div>
  );
}
