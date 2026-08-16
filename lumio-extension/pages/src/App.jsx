import React, { useEffect, useState } from 'react';
import Companion from './components/Companion';
import UsageChart from './components/UsageChart';
import ReflectionLog from './components/ReflectionLog';
import CharacterSelector from './components/CharacterSelector';
import MonthlyOverview from './components/MonthlyOverview';
import WeeklyOverview from './components/WeeklyOverview';
import CompassStats from './components/CompassStats';
import { mockData, mockDataSets } from './mockData';
import { getCompanionMood } from '../../public/shared/companionState.js';
import './styles/dashboard.css';

export default function App() {
  // Start with a capitalized mood so it perfectly matches our dictionary!
  const [mood, setMood] = useState("Curious"); 
  const [petName, setPetName] = useState("PET NAME");
  const [age, setAge] = useState(1);
  const [verifiedCount, setVerifiedCount] = useState(mockDataSets["Curious"].compassStats.today);
  
  const [activeCharacter, setActiveCharacter] = useState({ 
    id: 'mangkukulam', 
    name: 'MANGKUKULAM',
    image: '/assets/companion/mangkukulam.png'
  });

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const currentMood = await getCompanionMood();
        if (currentMood) setMood(currentMood);

        // Load Age, Name, AND Active Character from Chrome Storage
        if (typeof chrome !== 'undefined' && chrome.storage) {
          const data = await chrome.storage.local.get(['installDate', 'petName', 'activeCharacter', 'verifiedClaimsCount', 'demoMood']);
          if (data.demoMood) setMood(data.demoMood);
          
          if (data.petName) setPetName(data.petName);
          if (data.activeCharacter) setActiveCharacter(data.activeCharacter);

          if (data.verifiedClaimsCount !== undefined) setVerifiedCount(data.verifiedClaimsCount);

          if (data.installDate) {
            const msPerDay = 1000 * 60 * 60 * 24;
            const daysActive = Math.floor((Date.now() - data.installDate) / msPerDay);
            setAge(daysActive > 0 ? daysActive : 1); 
          } else {
            await chrome.storage.local.set({ installDate: Date.now() });
            setAge(1);
          }
        }
      } catch (err) {
        console.log("Using mockData fallback:", err);
      }
    }
    loadDashboardData();

    const handleStorageChange = (changes, namespace) => {
      if (namespace === 'local' && changes.verifiedClaimsCount) {
        // Instantly update the dashboard number without refreshing!
        setVerifiedCount(changes.verifiedClaimsCount.newValue); 
      }
    };

    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.onChanged.addListener(handleStorageChange);
    }

    // Cleanup listener when the dashboard is closed
    return () => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.onChanged.removeListener(handleStorageChange);
      }
    };
  }, []);

  const handleCharacterSelect = (character) => {
    setActiveCharacter(character);
    // Save the selected character to storage!
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ activeCharacter: character });
    }
  };

  const handleNameSave = (newName) => {
    setPetName(newName);
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ petName: newName });
    }
  };

  const handleMoodOverride = (e) => {
    const newMood = e.target.value;
    setMood(newMood); 

    const currentData = mockDataSets[newMood];
    setVerifiedCount(currentData.compassStats.today);

    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ 
        demoMood: newMood,
        verifiedClaimsCount: currentData.compassStats.today,
        totalTimeMinutes: currentData.totalTimeMinutes, // <-- NEW
        sessionsToday: currentData.sessionsToday        // <-- NEW
      }); 
    }
  };

  const currentData = mockDataSets[mood] || mockDataSets["Curious"];

  return (
    <div className="dashboard-container">
      <div className="dashboard-logo-container">
        <img src="/assets/lumio-logo.png" alt="Lumio Dashboard" className="dashboard-logo" />
      </div>
      
      <div className="dashboard-grid">
        
        {/* COLUMN 1 */}
        <div className="column">
          <WeeklyOverview weeklyData={currentData.weeklyActivity} />

          <CompassStats 
            stats={{
              ...currentData.compassStats, 
              today: verifiedCount // Keep this as verifiedCount so live clicks still work!
            }} 
          />
        </div>

        {/* COLUMN 2 */}
        <div className="column">
          <MonthlyOverview 
            totalTime={currentData.totalTimeMinutes} 
            sessions={currentData.sessionsToday} 
            verifiedCount={34 + verifiedCount} 
            streak={6}
          />
          <UsageChart 
            domainBreakdown={currentData.domainBreakdown} 
            totalTime={currentData.totalTimeMinutes} 
          />
        </div>

        {/* COLUMN 3: The Companion & Selector */}
        <div className="column">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 className="section-title" style={{ margin: '0', color: '#6D5A88', textAlign: 'left' }}>
              COMPANION
            </h2>
            
            {/* The Demo Override Dropdown */}
            <select 
              value={mood} 
              onChange={handleMoodOverride}
              style={{ 
                fontFamily: '"Press Start 2P", cursive', 
                fontSize: '10px', 
                padding: '4px', 
                backgroundColor: 'rgba(255, 255, 255, 0.2)', 
                border: '2px dashed #6D5A88', 
                color: '#6D5A88', 
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="Curious">Curious</option>
              <option value="Focused">Focused</option>
              <option value="Idle">Idle</option>
              <option value="Concerned">Concerned</option>
            </select>
          </div>
          
          <Companion 
            mood={mood} 
            characterName={activeCharacter.name} 
            characterImage={activeCharacter.image}
            petName={petName}
            age={age}
            onNameChange={handleNameSave} 
          />
          
          <CharacterSelector onSelect={handleCharacterSelect} />
        </div>
        
      </div>
    </div>
  );
}