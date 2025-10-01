/**
 * Session Complete Page
 *
 * Post-session overview showing results and settings with options to continue.
 */

import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { SessionStatisticsWithMaps } from '../core/types/statistics';
import { useStatsAPI } from '../features/statistics/useStatsAPI';
import { debug } from '../core/debug';
import '../styles/main.css';
import '../styles/sessionComplete.css';

export function SessionCompletePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { saveSessionStats, isAuthenticated } = useStatsAPI();

  // Get session data from navigation state
  const fullStatistics = location.state?.fullStatistics as SessionStatisticsWithMaps | undefined;
  const liveCopyTyped = location.state?.liveCopyTyped as string | null;
  const liveCopyTransmitted = location.state?.liveCopyTransmitted as string[] | null;

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

  // Handle missing data - validate early before using any values
  if (!fullStatistics) {
    return (
      <div className="completion-wrapper">
        <div className="completion-container">
          <div className="content-area">
          <div className="error-message">
            <h2>Session data not found</h2>
            <button className="btn btn-primary" onClick={handleBackToMenu}>
              Back to Menu
            </button>
          </div>
          </div>
        </div>
      </div>
    );
  }

  // Extract values from fullStatistics (safe now since we've validated it exists)
  const accuracy = fullStatistics.overallAccuracy;
  const totalChars = fullStatistics.totalCharacters;
  const sourceName = fullStatistics.config.sourceName;

  // Get source display name
  const getSourceDisplay = () => {
    return sourceName || 'Unknown';
  };

  // Navigation handler for session again - defined after fullStatistics check
  const handleSessionAgain = () => {
    navigate('/session-config', { state: { mode: fullStatistics.config.mode } });
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
        {/* Special handling for Live Copy mode */}
        {fullStatistics.config.mode === 'live-copy' ? (
          <div className="live-copy-results-container">
            <h2 className="section-title">Live Copy Results</h2>
            <div className="completion-message">Session Complete!</div>

            <div className="stat-item">
              <span className="stat-label">Characters Transmitted</span>
              <span className="stat-value">{liveCopyTransmitted?.length ?? 'N/A'}</span>
            </div>

            <div className="stat-item">
              <span className="stat-label">Characters Typed</span>
              <span className="stat-value">{liveCopyTyped?.length ?? 'N/A'}</span>
            </div>

            <div className="stat-item">
              <span className="stat-label">Speed</span>
              <span className="stat-value">{fullStatistics.config.wpm} WPM</span>
            </div>

            <div className="action-buttons">
              <button className="btn btn-primary" onClick={handleBackToMenu}>
                Back to Menu
              </button>
              <button className="btn btn-secondary" onClick={handleSessionAgain}>
                {getSessionAgainText()}
              </button>
            </div>
          </div>
        ) : (
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
                    {fullStatistics.config.mode === 'practice' ? 'Active Practice' :
                     fullStatistics.config.mode === 'listen' ? 'Passive Listening' :
                     fullStatistics.config.mode === 'live-copy' ? 'Live Copy' : fullStatistics.config.mode}
                  </span>
                </div>

                <div className="setting-item">
                  <span className="setting-label">Duration</span>
                  <span className="setting-value">
                    {fullStatistics.config.lengthMs === 60000 ? '1 minute' :
                     fullStatistics.config.lengthMs === 120000 ? '2 minutes' :
                     fullStatistics.config.lengthMs === 300000 ? '5 minutes' :
                     `${Math.round(fullStatistics.config.lengthMs / 1000)} seconds`}
                  </span>
                </div>

                <div className="setting-item">
                  <span className="setting-label">Speed</span>
                  <span className="setting-value">{fullStatistics.config.wpm} WPM</span>
                </div>

                <div className="setting-item">
                  <span className="setting-label">Text Source</span>
                  <span className="setting-value">{getSourceDisplay()}</span>
                </div>

              </div>
            </div>

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
        )}
      </div>
      </div>
    </div>
  );
}