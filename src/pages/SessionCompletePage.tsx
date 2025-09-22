/**
 * Session Complete Page
 *
 * Post-session overview showing results and settings with options to continue.
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { LiveCopyResults } from '../components/LiveCopyResults';
import '../styles/main.css';
import '../styles/sessionComplete.css';

export function SessionCompletePage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Get session data from navigation state
  const config = location.state?.config;
  const stats = location.state?.stats;
  const sourceContent = location.state?.sourceContent;
  const liveCopyState = location.state?.liveCopyState;

  // Calculate accuracy
  const totalChars = (stats?.correct || 0) + (stats?.incorrect || 0) + (stats?.timeout || 0);
  const accuracy = totalChars > 0
    ? Math.round((stats.correct / totalChars) * 100)
    : 0;

  // Get source display name
  const getSourceDisplay = () => {
    // Use the source name from sourceContent if available
    if (sourceContent?.name) return sourceContent.name;
    // Fallback to sourceId formatting
    return config?.sourceId?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'Unknown';
  };

  // Navigation handlers
  const handleBackToMenu = () => {
    navigate('/');
  };

  const handlePracticeAgain = () => {
    // Go back to ActiveSession with the same config
    navigate('/session', {
      state: {
        config,
        sourceContent: location.state?.sourceContent
      }
    });
  };

  // Handle missing data (shouldn't happen but good to be safe)
  if (!config || !stats) {
    return (
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
    );
  }

  return (
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
        {config.mode === 'live-copy' && liveCopyState ? (
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
            {/* Two column summary */}
            <div className="session-summary">
              {/* Results section */}
              <div className="results-section">
                <h2 className="section-title">Session Results</h2>
                <div className="completion-message">Session Complete!</div>

                <div className="stat-item">
                  <span className="stat-label">Overall Accuracy</span>
                  <span className="stat-value accuracy">{accuracy}%</span>
                </div>

                <div className="stat-item">
                  <span className="stat-label">Characters Practiced</span>
                  <span className="stat-value">{totalChars}</span>
                </div>

              </div>

              {/* Settings section */}
              <div className="settings-section">
                <h2 className="section-title">Session Settings</h2>

                <div className="setting-item">
                  <span className="setting-label">Mode</span>
                  <span className="setting-value">
                    {config.mode === 'practice' ? 'Active Practice' :
                     config.mode === 'listen' ? 'Passive Listening' :
                     config.mode === 'live-copy' ? 'Live Copy' : config.mode}
                  </span>
                </div>

                <div className="setting-item">
                  <span className="setting-label">Duration</span>
                  <span className="setting-value">
                    {config.lengthMs === 60000 ? '1 minute' :
                     config.lengthMs === 120000 ? '2 minutes' :
                     config.lengthMs === 300000 ? '5 minutes' :
                     `${Math.round(config.lengthMs / 1000)} seconds`}
                  </span>
                </div>

                <div className="setting-item">
                  <span className="setting-label">Speed</span>
                  <span className="setting-value">{config.wpm} WPM</span>
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
  );
}