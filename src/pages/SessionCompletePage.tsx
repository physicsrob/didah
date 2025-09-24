/**
 * Session Complete Page
 *
 * Post-session overview showing results and settings with options to continue.
 */

import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LiveCopyResults } from '../components/LiveCopyResults';
import type { SessionStatistics } from '../core/types/statistics';
import { useStatsAPI } from '../features/statistics/useStatsAPI';
import '../styles/main.css';
import '../styles/sessionComplete.css';

export function SessionCompletePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { saveSessionStats, isAuthenticated } = useStatsAPI();

  // Get session data from navigation state
  const fullStatistics = location.state?.fullStatistics as SessionStatistics | undefined;
  const sourceName = location.state?.sourceName as string | undefined;
  const liveCopyState = location.state?.liveCopyState;

  // Extract what we need from fullStatistics
  const accuracy = fullStatistics?.overallAccuracy || 0;
  const totalChars = fullStatistics?.totalCharacters || 0;

  // Save statistics when the component mounts
  useEffect(() => {
    if (fullStatistics && isAuthenticated) {
      saveSessionStats(fullStatistics)
        .then(() => {
          console.log('Session statistics saved successfully');
        })
        .catch(err => {
          console.error('Failed to save session statistics:', err);
        });
    } else if (!isAuthenticated && fullStatistics) {
      console.log('Statistics not saved - user not authenticated');
    }
  }, [fullStatistics, isAuthenticated, saveSessionStats]);

  // Get source display name
  const getSourceDisplay = () => {
    // Use the source name passed from ActiveSessionPage
    return sourceName || 'Unknown';
  };

  // Navigation handlers
  const handleBackToMenu = () => {
    navigate('/');
  };

  const handlePracticeAgain = () => {
    // Navigate to session config page
    navigate('/config');
  };

  // Handle missing data (shouldn't happen but good to be safe)
  if (!fullStatistics) {
    return (
      <div className="completion-wrapper bg-gradient-primary">
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

  return (
    <div className="completion-wrapper bg-gradient-primary">
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
        {fullStatistics.config.mode === 'live-copy' && liveCopyState ? (
          <div className="live-copy-results-container">
            <h2 className="section-title">Live Copy Results</h2>
            <LiveCopyResults state={liveCopyState} />
            <div className="action-buttons">
              <button className="btn btn-primary" onClick={handleBackToMenu}>
                Back to Menu
              </button>
              <button className="btn btn-secondary" onClick={handlePracticeAgain}>
                Practice Again
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
                    <span className="stat-label">Overall Accuracy</span>
                    <span className="stat-value accuracy">{Math.round(accuracy)}%</span>
                  </div>

                  {fullStatistics.config.mode === 'practice' && (
                    <div className="stat-item">
                      <span className="stat-label">Effective WPM</span>
                      <span className="stat-value">{fullStatistics.effectiveWpm}</span>
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
              <button className="btn btn-secondary" onClick={handlePracticeAgain}>
                Practice Again
              </button>
            </div>
          </>
        )}
      </div>
      </div>
    </div>
  );
}