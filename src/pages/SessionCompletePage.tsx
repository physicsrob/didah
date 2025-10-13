/**
 * Session Complete Page
 *
 * Post-session overview showing results and settings with options to continue.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SessionStatisticsWithMaps } from '../core/types/statistics';
import { useStatsAPI } from '../features/statistics/useStatsAPI';
import { debug } from '../core/debug';
import { LiveCopyDiff } from '../components/LiveCopyDiff';
import '../styles/main.css';
import '../styles/sessionComplete.css';

type SessionCompletePageProps = {
  statistics: SessionStatisticsWithMaps;
  onRestart: () => void;
};

export function SessionCompletePage({ statistics: fullStatistics, onRestart }: SessionCompletePageProps) {
  const navigate = useNavigate();
  const { saveSessionStats, isAuthenticated } = useStatsAPI();


  // Save statistics when the component mounts (before early return to satisfy React hooks rules)
  useEffect(() => {
    if (fullStatistics && isAuthenticated) {
      saveSessionStats(fullStatistics)
        .then(() => {
          debug.log('Session statistics saved successfully');
        })
        .catch(err => {
          console.error('Failed to save session statistics:', err);
        });
    } else if (!isAuthenticated && fullStatistics) {
      debug.log('Statistics not saved - user not authenticated');
    }
  }, [fullStatistics, isAuthenticated, saveSessionStats]);

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
        return 'Practice Again';
      case 'listen':
        return 'Listen Again';
      case 'live-copy':
        return 'Live Copy Again';
      default:
        return 'Practice Again';
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
          MorseAcademy
        </h1>
      </div>

      {/* Main content */}
      <div className="content-area">
          <>
            {/* Two column summary - hide results for listen mode */}
            <div className="session-summary">
              {/* Results section - only show for practice and live-copy modes */}
              {fullStatistics.config.mode !== 'listen' && (
                <div className="results-section">
                  <h2 className="section-title">Session Results</h2>
                  <div className="completion-message">Session Complete!</div>

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

                  {fullStatistics.config.mode === 'runner' && fullStatistics.maxLevel !== undefined && (
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
                        'practice': 'Active Practice',
                        'listen': 'Passive Listening',
                        'live-copy': 'Live Copy',
                        'word-practice': 'Word Practice',
                        'runner': 'Morse Runner'
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

                {fullStatistics.config.mode !== 'runner' && (
                  <div className="setting-item">
                    <span className="setting-label">Speed</span>
                    <span className="setting-value">{fullStatistics.config.wpm} WPM</span>
                  </div>
                )}

                <div className="setting-item">
                  <span className="setting-label">Text Source</span>
                  <span className="setting-value">{getSourceDisplay()}</span>
                </div>

              </div>
            </div>

            {/* Live Copy Diff Visualization - only for live-copy mode */}
            {fullStatistics.config.mode === 'live-copy' && fullStatistics.liveCopyDiff && (
              <div className="live-copy-results-container">
                <h2 className="section-title">Your Transcription</h2>
                <LiveCopyDiff diffSegments={fullStatistics.liveCopyDiff} />
              </div>
            )}

            {/* Action buttons */}
            <div className="action-buttons">
              <button className="btn btn-primary" onClick={handleBackToMenu}>
                Back to Menu
              </button>
              <button className="btn btn-secondary" onClick={handleSessionAgain}>
                {getSessionAgainText()}
              </button>
            </div>
          </>
      </div>
      </div>
    </div>
  );
}