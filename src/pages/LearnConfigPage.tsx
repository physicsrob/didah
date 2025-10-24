/**
 * Learn Mode Configuration Page
 *
 * Koch method onboarding with level selector, WPM controls, and star ratings.
 * Requires authentication.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser, SignInButton } from '@clerk/clerk-react';
import type { SessionConfig } from '../core/types/domain';
import type { SourceContent } from '../features/sources';
import { HeaderBar } from '../components/HeaderBar';
import { StarDisplay } from '../components/StarDisplay';
import { getCharactersForLevel, getNewCharactersForLevel, TOTAL_LEVELS } from '../../functions/shared/koch';
import { fetchSourceContent } from '../features/sources';
import { useStatsAPI } from '../features/statistics/useStatsAPI';
import { useSettings } from '../features/settings/hooks/useSettings';
import '../styles/main.css';
import '../styles/learnConfig.css';

type LearnConfigPageProps = {
  onStart: (config: SessionConfig, sourceContent: SourceContent) => void;
};

export function LearnConfigPage({ onStart }: LearnConfigPageProps) {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  const { fetchLearnProgress, fetchCharacterMastery } = useStatsAPI();
  const { settings, updateSetting } = useSettings();

  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [wpm, setWpm] = useState<number>(15);
  const [starRatings, setStarRatings] = useState<Map<number, number>>(new Map());
  const [isLoadingStars, setIsLoadingStars] = useState(true);
  const [isStarting, setIsStarting] = useState(false);

  // Sync WPM from centralized settings when they load
  useEffect(() => {
    if (settings) {
      setWpm(settings.wpm);
    }
  }, [settings]);

  // Fetch historical star ratings
  useEffect(() => {
    if (!user) {
      setIsLoadingStars(false);
      return;
    }

    // Fetch actual historical sessions and calculate star ratings
    (async () => {
      try {
        const progress = await fetchLearnProgress();
        setStarRatings(progress);
      } catch (error) {
        console.error('Failed to fetch Learn Mode progress:', error);
        // Graceful fallback - empty map (no completed levels)
        setStarRatings(new Map());
      } finally {
        setIsLoadingStars(false);
      }
    })();
  }, [user, fetchLearnProgress]);

  // Determine the "next level" (first level with 0 stars or no attempt)
  const nextLevel = useCallback(() => {
    for (let level = 1; level <= TOTAL_LEVELS; level++) {
      const stars = starRatings.get(level);
      if (stars === undefined || stars === 0) {
        return level;
      }
    }
    return TOTAL_LEVELS; // All levels completed, suggest last level
  }, [starRatings]);

  // Set default selected level to next level
  useEffect(() => {
    if (!isLoadingStars) {
      setSelectedLevel(nextLevel());
    }
  }, [isLoadingStars, nextLevel]);

  // Handle start session
  const handleStart = async () => {
    if (isStarting) return;

    setIsStarting(true);

    try {
      // Fetch practice content from backend Koch source
      const sourceId = `koch-level-${selectedLevel}`;
      const content = await fetchSourceContent(sourceId, true); // requiresAuth = true

      // Query character mastery for adaptive reveal
      const levelChars = getCharactersForLevel(selectedLevel);
      const mastery = await fetchCharacterMastery(levelChars);

      // Build session config
      const config: SessionConfig = {
        mode: 'learn',
        lengthMs: Number.MAX_SAFE_INTEGER, // No time limit (ends after 50 characters)
        wpm,
        farnsworthWpm: wpm, // No Farnsworth for Learn Mode
        speedTier: 'slow',
        sourceId,
        sourceName: `Koch Method - Level ${selectedLevel}`,
        replay: false, // Learn Mode has built-in replay behavior
        feedback: 'none', // Learn Mode has custom feedback
        effectiveAlphabet: getCharactersForLevel(selectedLevel),
        extraWordSpacing: 0,
        listenTimingOffset: 0,
        characterSpeed: wpm,
        learnLevel: selectedLevel,
        learnUnmasteredChars: Array.from(mastery.unMasteredChars), // For adaptive reveal
      };

      onStart(config, content);
    } catch (error) {
      console.error('Failed to start Learn Mode session:', error);
      alert('Failed to start session. Please try again.');
      setIsStarting(false);
    }
  };

  // Show authentication required screen
  if (isLoaded && !user) {
    return (
      <div className="min-h-screen">
        <HeaderBar />
        <div className="container container-centered">
          <div className="card container-narrow" style={{ padding: '48px', textAlign: 'center' }}>
            <h1 className="heading-1" style={{ marginBottom: '16px' }}>Learn Mode</h1>
            <p className="body-regular" style={{ marginBottom: '32px', color: 'var(--color-text-secondary)' }}>
              Learn Mode requires an account to track your progress and save your achievements.
            </p>
            <SignInButton mode="modal">
              <button className="btn btn-primary btn-large">
                Sign In to Continue
              </button>
            </SignInButton>
            <div style={{ marginTop: '24px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => navigate('/')}
              >
                Back to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state
  if (!isLoaded || isLoadingStars) {
    return (
      <div className="min-h-screen">
        <HeaderBar />
        <div className="container container-centered">
          <div className="text-center">
            <h2 className="heading-2">Loading...</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <HeaderBar />

      <div className="container container-centered">
        <div className="container-narrow">
          <h1 className="heading-1" style={{ marginBottom: '16px' }}>Learn Mode</h1>
          <p className="body-regular" style={{ marginBottom: '24px', color: 'var(--color-text-secondary)' }}>
            Learn Morse code from scratch using the Koch method. Progress through 20 levels, mastering 2 new characters at a time.
          </p>
        </div>

        {/* Settings Card */}
        <div className="card container-narrow" style={{ padding: '32px', marginBottom: '24px' }}>
          {/* WPM Slider */}
          <div className="settings-row">
            <div className="settings-label">Character Speed</div>
            <div className="settings-control">
              <input
                type="range"
                min="5"
                max="40"
                value={wpm}
                onChange={(e) => {
                  const newWpm = Number(e.target.value);
                  setWpm(newWpm);
                  updateSetting('wpm', newWpm);
                }}
                style={{ flex: 1 }}
              />
              <span style={{
                color: 'var(--color-blue-primary)',
                fontSize: '16px',
                fontWeight: '500',
                minWidth: '80px',
                textAlign: 'right'
              }}>
                {wpm} WPM
              </span>
            </div>
          </div>
        </div>

        {/* Level Selector */}
        <div className="card container-narrow" style={{ padding: '32px' }}>
          <h2 className="heading-3" style={{ marginBottom: '16px' }}>Select Level</h2>
          <div className="learn-level-list">
            {Array.from({ length: TOTAL_LEVELS }, (_, i) => i + 1).map((level) => {
              const chars = getCharactersForLevel(level);
              const newChars = getNewCharactersForLevel(level);
              const stars = starRatings.get(level) || 0;
              const isSelected = level === selectedLevel;
              const hasAttempt = starRatings.has(level);

              return (
                <button
                  key={level}
                  className={`learn-level-item ${isSelected ? 'learn-level-selected' : ''}`}
                  onClick={() => setSelectedLevel(level)}
                >
                  <div className="learn-level-header">
                    <span className="learn-level-number">Level {level}</span>
                    <StarDisplay stars={stars} hasAttempt={hasAttempt} size="medium" />
                  </div>
                  <div className="learn-level-chars">
                    {newChars.join(' ')}
                    <span className="learn-level-chars-total">
                      ({chars.length} total)
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Start Button */}
        <div className="container-narrow" style={{ marginTop: '24px' }}>
          <button
            className="btn btn-primary btn-large"
            onClick={handleStart}
            disabled={isStarting}
            style={{ width: '100%' }}
          >
            {isStarting ? 'Starting...' : `Start Level ${selectedLevel}`}
          </button>
        </div>
      </div>
    </div>
  );
}
