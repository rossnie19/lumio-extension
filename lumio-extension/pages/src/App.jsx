import React, { useEffect, useState } from 'react';
import Companion from './components/Companion';
import UsageChart from './components/UsageChart';
import ReflectionLog from './components/ReflectionLog';
import CharacterSelector from './components/CharacterSelector';
import MonthlyOverview from './components/MonthlyOverview';
import WeeklyOverview from './components/WeeklyOverview';
import CompassStats from './components/CompassStats';
import { mockData } from './mockData';
import { getCompanionMood } from '../../shared/companionState.js';
import './styles/dashboard.css';

export default function App() {
  const [mood, setMood] = useState(mockData.currentMood);
  const [petName, setPetName] = useState("PET NAME");
  const [age, setAge] = useState(1);
  
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
          const data = await chrome.storage.local.get(['installDate', 'petName', 'activeCharacter']);
          
          if (data.petName) setPetName(data.petName);
          if (data.activeCharacter) setActiveCharacter(data.activeCharacter);

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

  return (
    <div className="dashboard-container">
      <div className="dashboard-logo-container">
        <img src="/assets/lumio-logo.png" alt="Lumio Dashboard" className="dashboard-logo" />
      </div>
      
      <div className="dashboard-grid">
        
        {/* COLUMN 1: Weekly Overview */}
        <div className="column">
          <WeeklyOverview weeklyData={mockData.weeklyActivity} />

          <CompassStats stats={mockData.compassStats} />
        </div>

        {/* COLUMN 2: Monthly Overview & Most Used Platform */}
        <div className="column">
          <MonthlyOverview 
            totalTime={mockData.totalTimeMinutes} 
            sessions={mockData.sessionsToday} 
            verifiedCount={mockData.verifiedClaimsCount}
            streak={6}
          />
          <UsageChart 
            domainBreakdown={mockData.domainBreakdown} 
            totalTime={mockData.totalTimeMinutes} 
          />
        </div>

        {/* COLUMN 3: The Companion & Selector */}
        <div className="column">
          <h2 className="section-title" style={{ textAlign: 'left', color: '#6D5A88', marginBottom: '16px', marginTop: '0' }}>
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
          
          <CharacterSelector onSelect={handleCharacterSelect} />
        </div>
        
      </div>
    </div>
  );
}