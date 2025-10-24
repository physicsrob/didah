/**
 * Session Complete Page
 *
 * Post-session overview showing results and settings with options to continue.
 */

import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SessionStatisticsWithMaps } from '../core/types/statistics';
import { useStatsAPI } from '../features/statistics/useStatsAPI';
import { debug } from '../core/debug';
import { LiveCopyDiff } from '../components/LiveCopyDiff';
import { SpeedDisplay } from '../components/SpeedDisplay';
import { StarDisplay } from '../components/StarDisplay';
import { calculateStars } from '../../functions/shared/starCalculation';
import { getCharactersForLevel } from '../../functions/shared/koch';
import '../styles/main.css';
import '../styles/sessionComplete.css';

type SessionCompletePageProps = {
  statistics: SessionStatisticsWithMaps;
  onRestart: () => void;
};

export function SessionCompletePage({ statistics: fullStatistics, onRestart }: SessionCompletePageProps) {
  const navigate = useNavigate();
  const { saveSessionStats, isAuthenticated } = useStatsAPI();

  // Calculate stars for Learn Mode and prepare statistics for saving
  const statsToSave = useMemo(() => {
    if (fullStatistics.config.mode === 'learn') {
      const stars = calculateStars(fullStatistics.overallAccuracy);
      return {
        ...fullStatistics,
        learnStars: stars,
        learnLevel: fullStatistics.config.learnLevel
      };
    }
    return fullStatistics;
  }, [fullStatistics]);

  // Save statistics when the component mounts (before early return to satisfy React hooks rules)
  useEffect(() => {
    if (statsToSave && isAuthenticated) {
      saveSessionStats(statsToSave)
        .then(() => {
          debug.log('Session statistics saved successfully');
        })
        .catch(err => {
          console.error('Failed to save session statistics:', err);
        });
    } else if (!isAuthenticated && statsToSave) {
      debug.log('Statistics not saved - user not authenticated');
    }
  }, [statsToSave, isAuthenticated, saveSessionStats]);

  // Navigation handlers
  const handleBackToMenu = () => {
    navigate('/');
  };

  // Extract values from fullStatistics
  const accuracy = fullStatistics.overallAccuracy;
  const totalChars = fullStatistics.totalCharacters;
  const sourceName = fullStatistics.config.sourceName;

  // Get source display name
  const getSourceDisplay = () => {
    return sourceName || 'Unknown';
  };

  // Handler for session again
  const handleSessionAgain = () => {
    onRestart();
  };

  // Get button text based on mode
  const getSessionAgainText = () => {
    switch (fullStatistics.config.mode) {
      case 'practice':
        return 'Letter Practice Again';
      case 'listen':
        return 'Listen Again';
      case 'live-copy':
        return 'Live Copy Again';
      case 'learn':
        return 'Try Again';
      default:
        return 'Letter Practice Again';
    }
  };

  // Learn Mode specific data
  const learnModeData = useMemo(() => {
    if (fullStatistics.config.mode !== 'learn' || !fullStatistics.config.learnLevel) {
      return null;
    }

    const stars = calculateStars(fullStatistics.overallAccuracy);
    const level = fullStatistics.config.learnLevel;
    const levelChars = getCharactersForLevel(level);

    // Build per-character breakdown
    const charBreakdown = levelChars.map(char => {
      const stats = fullStatistics.characterStats.get(char);
      if (!stats) {
        return { char, accuracy: 0, attempts: 0, isStruggling: true };
      }
      return {
        char,
        accuracy: stats.accuracy,
        attempts: stats.attempts,
        isStruggling: stats.accuracy < 80
      };
    });

    return {
      stars,
      level,
      charBreakdown,
      canAdvance: stars >= 1
    };
  }, [fullStatistics]);

  // Handle next level navigation
  const handleNextLevel = () => {
    if (learnModeData && learnModeData.canAdvance) {
      // Return to config page (onRestart), which will show next level
      onRestart();
    }
  };

  // Format duration for display
  const formatDuration = (durationMs: number): string => {
    const totalSeconds = Math.round(durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes === 0) {
      return `${seconds} second${seconds === 1 ? '' : 's'}`;
    } else if (seconds === 0) {
      return `${minutes} minute${minutes === 1 ? '' : 's'}`;
    } else {
      return `${minutes} minute${minutes === 1 ? '' : 's'} ${seconds} second${seconds === 1 ? '' : 's'}`;
    }
  };

  return (
    <div className="completion-wrapper">
      <div className="completion-container">
        {/* Top branding */}
        <div className="brand-header">
        <h1 className="brand-title" onClick={handleBackToMenu}>
          didah
        </h1>
      </div>

      {/* Main content */}
      <div className="content-area">
          <>
            {/* Learn Mode Results */}
            {learnModeData && (
              <>
                {/* Star Rating Display */}
                <div className="learn-results-section">
                  <h2 className="section-title">Session Complete!</h2>
                  <div className="learn-star-display-container">
                    <StarDisplay stars={learnModeData.stars} hasAttempt={true} size="large" />
                  </div>
                  <div className="learn-accuracy-display">
                    <span className="stat-value accuracy">{Math.round(accuracy)}%</span>
                    <span className="stat-label">Accuracy</span>
                  </div>
                  <div className="learn-character-count">
                    <span className="stat-value">{totalChars}</span>
                    <span className="stat-label">Characters Practiced</span>
                  </div>
                </div>

                {/* Per-Character Breakdown */}
                <div className="learn-character-breakdown-section">
                  <h2 className="section-title">Character Performance</h2>
                  <div className="learn-character-breakdown">
                    {learnModeData.charBreakdown.map(({ char, accuracy, attempts, isStruggling }) => (
                      <div
                        key={char}
                        className={`learn-character-item ${isStruggling ? 'learn-character-struggling' : ''}`}
                      >
                        <div className="learn-character-char">{char}</div>
                        <div className="learn-character-accuracy">
                          {attempts > 0 ? `${Math.round(accuracy)}%` : '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                  {learnModeData.charBreakdown.some(c => c.isStruggling) && (
                    <div className="learn-struggling-note">
                      Characters with less than 80% accuracy are highlighted
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Standard Mode Results - Two column summary - hide results for listen mode */}
            {!learnModeData && (
              <div className="session-summary">
              {/* Results section - only show for practice and live-copy modes */}
              {fullStatistics.config.mode !== 'listen' && (
                <div className="results-section">
                  <h2 className="section-title">Session Results</h2>

                  <div className="stat-item">
                    <span className="stat-label">Accuracy</span>
                    <span className="stat-value accuracy">{Math.round(accuracy)}%</span>
                  </div>

                  {fullStatistics.config.mode === 'practice' && fullStatistics.timeoutPercentage !== undefined && (
                    <div className="stat-item">
                      <span className="stat-label">Timeouts</span>
                      <span className="stat-value">{Math.round(fullStatistics.timeoutPercentage)}%</span>
                    </div>
                  )}

                  {fullStatistics.config.mode === 'practice' && (
                    <div className="stat-item">
                      <span className="stat-label">Achieved WPM</span>
                      <span className="stat-value">{fullStatistics.achievedWpm}</span>
                    </div>
                  )}

                  {fullStatistics.config.mode === 'ditDash' && fullStatistics.maxLevel !== undefined && (
                    <div className="stat-item">
                      <span className="stat-label">Maximum Level Completed</span>
                      <span className="stat-value">{fullStatistics.maxLevel}</span>
                    </div>
                  )}

                  <div className="stat-item">
                    <span className="stat-label">Characters Practiced</span>
                    <span className="stat-value">{totalChars}</span>
                  </div>

                </div>
              )}

              {/* Settings section - adjust width for listen mode */}
              <div className={`settings-section ${fullStatistics.config.mode === 'listen' ? 'settings-full-width' : ''}`}>
                <h2 className="section-title">Session Settings</h2>

                <div className="setting-item">
                  <span className="setting-label">Mode</span>
                  <span className="setting-value">
                    {(() => {
                      const modeNames = {
                        'practice': 'Letter Practice',
                        'listen': 'Passive Listening',
                        'live-copy': 'Live Copy',
                        'head-copy': 'Head Copy',
                        'ditDash': 'Dit Dash',
                        'learn': 'Learn Mode'
                      };
                      return modeNames[fullStatistics.config.mode] || fullStatistics.config.mode;
                    })()}
                  </span>
                </div>

                <div className="setting-item">
                  <span className="setting-label">Duration</span>
                  <span className="setting-value">
                    {formatDuration(fullStatistics.durationMs)}
                  </span>
                </div>

                {fullStatistics.config.mode !== 'ditDash' && (
                  <div className="setting-item">
                    <span className="setting-label">Speed</span>
                    <SpeedDisplay config={fullStatistics.config} className="setting-value" />
                  </div>
                )}

                <div className="setting-item">
                  <span className="setting-label">Text Source</span>
                  <span className="setting-value">{getSourceDisplay()}</span>
                </div>

              </div>
            </div>
            )}

            {/* Live Copy Diff Visualization - only for live-copy mode */}
            {fullStatistics.config.mode === 'live-copy' && fullStatistics.liveCopyDiff && (
              <div className="live-copy-results-container">
                <h2 className="section-title">Your Transcription</h2>
                <LiveCopyDiff diffSegments={fullStatistics.liveCopyDiff} />
              </div>
            )}

            {/* Action buttons */}
            {learnModeData ? (
              <div className="action-buttons learn-action-buttons">
                <button className="btn btn-secondary" onClick={handleBackToMenu}>
                  Back to Menu
                </button>
                <button className="btn btn-secondary" onClick={handleSessionAgain}>
                  Try Again
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleNextLevel}
                  disabled={!learnModeData.canAdvance}
                  title={!learnModeData.canAdvance ? 'Earn at least 1 star to advance' : ''}
                >
                  {learnModeData.level < 20 ? `Next Level (${learnModeData.level + 1})` : 'Back to Levels'}
                </button>
              </div>
            ) : (
              <div className="action-buttons">
                <button className="btn btn-primary" onClick={handleBackToMenu}>
                  Back to Menu
                </button>
                <button className="btn btn-secondary" onClick={handleSessionAgain}>
                  {getSessionAgainText()}
                </button>
              </div>
            )}
          </>
      </div>
      </div>
    </div>
  );
}