/**
 * Session Complete Page
 *
 * Post-session overview showing results and settings with options to continue.
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SessionStatisticsWithMaps } from '../core/types/statistics';
import type { SessionConfig } from '../core/types/domain';
import type { SourceContent } from '../features/sources';
import { fetchSourceContent } from '../features/sources';
import { useStatsAPI } from '../features/statistics/useStatsAPI';
import { useSettings } from '../features/settings/hooks/useSettings';
import { debug } from '../core/debug';
import { LiveCopyDiff } from '../components/LiveCopyDiff';
import { SpeedDisplay } from '../components/SpeedDisplay';
import { StarDisplay } from '../components/StarDisplay';
import { calculateStars } from '../../functions/shared/starCalculation';
import { getCharactersForLesson } from '../../functions/shared/koch';
import '../styles/main.css';
import '../styles/sessionComplete.css';

type SessionCompletePageProps = {
  statistics: SessionStatisticsWithMaps;
  onRestart: () => void;
  onStartNewSession?: (config: import('../core/types/domain').SessionConfig, content: SourceContent) => void;
};

export function SessionCompletePage({ statistics: fullStatistics, onRestart, onStartNewSession }: SessionCompletePageProps) {
  const navigate = useNavigate();
  const { saveSessionStats, isAuthenticated } = useStatsAPI();
  const { settings, updateSettings } = useSettings();
  const [isStartingNext, setIsStartingNext] = useState(false);

  // Calculate stars for Learn Mode and prepare statistics for saving
  const statsToSave = useMemo(() => {
    if (fullStatistics.config.mode === 'learn') {
      const stars = calculateStars(fullStatistics.overallAccuracy);
      return {
        ...fullStatistics,
        learnStars: stars,
        learnLesson: fullStatistics.config.learnLesson
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

  // Save stars to settings for Learn Mode
  useEffect(() => {
    if (fullStatistics.config.mode === 'learn' && fullStatistics.config.learnLesson && settings) {
      const stars = calculateStars(fullStatistics.overallAccuracy);
      const lesson = fullStatistics.config.learnLesson;
      const currentStars = settings.learnProgress?.[lesson] || 0;

      // Only update if new stars are better
      if (stars > currentStars) {
        updateSettings({
          learnProgress: {
            ...settings.learnProgress,
            [lesson]: stars
          }
        }).catch(err => {
          console.error('Failed to save Learn Mode progress to settings:', err);
        });
      }
    }
  }, [fullStatistics, settings, updateSettings]);

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
  const handleSessionAgain = async () => {
    // For Learn Mode with onStartNewSession available, restart the same lesson immediately
    if (fullStatistics.config.mode === 'learn' &&
        fullStatistics.config.learnLesson &&
        onStartNewSession &&
        !isStartingNext) {

      setIsStartingNext(true);

      try {
        const currentLesson = fullStatistics.config.learnLesson;
        const wpm = fullStatistics.config.wpm;

        // Fetch practice content from backend Koch source
        const sourceId = `koch-lesson-${currentLesson}`;
        const content = await fetchSourceContent(sourceId, false);

        // Build session config for same lesson
        const config: SessionConfig = {
          mode: 'learn',
          lengthMs: Number.MAX_SAFE_INTEGER,
          wpm,
          farnsworthWpm: wpm,
          speedTier: 'slow',
          sourceId,
          sourceName: `Koch Method - Lesson ${currentLesson}`,
          replay: false,
          feedback: 'none',
          effectiveAlphabet: getCharactersForLesson(currentLesson),
          extraWordSpacing: 0,
          listenTimingOffset: 0,
          characterSpeed: wpm,
          learnLesson: currentLesson,
        };

        onStartNewSession(config, content);
      } catch (error) {
        console.error('Failed to restart lesson:', error);
        alert('Failed to restart lesson. Please try again.');
        setIsStartingNext(false);
      }
    } else {
      // For other modes or fallback, go back to config
      onRestart();
    }
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
      case 'head-copy':
        return 'Head Copy Again';
      case 'ditDash':
        return 'Dit Dash Again';
      case 'learn':
        return 'Try Again';
      default:
        return 'Letter Practice Again';
    }
  };

  // Learn Mode specific data
  const learnModeData = useMemo(() => {
    if (fullStatistics.config.mode !== 'learn' || !fullStatistics.config.learnLesson) {
      return null;
    }

    const stars = calculateStars(fullStatistics.overallAccuracy);
    const lesson = fullStatistics.config.learnLesson;
    const lessonChars = getCharactersForLesson(lesson);

    // Build list of missed characters (accuracy < 100%)
    const missedChars = lessonChars.filter(char => {
      const stats = fullStatistics.characterStats.get(char);
      return stats && stats.accuracy < 100;
    });

    return {
      stars,
      lesson,
      missedChars,
      canAdvance: stars >= 1
    };
  }, [fullStatistics]);

  // Handle next lesson navigation
  const handleNextLesson = async () => {
    if (!learnModeData || !learnModeData.canAdvance || !onStartNewSession) {
      // Fall back to config page if we can't start directly
      onRestart();
      return;
    }

    if (isStartingNext) return;
    setIsStartingNext(true);

    try {
      const nextLesson = learnModeData.lesson + 1;
      if (nextLesson > 20) {
        // Can't go beyond lesson 20, go back to config
        onRestart();
        return;
      }

      const wpm = fullStatistics.config.wpm;

      // Fetch practice content from backend Koch source
      const sourceId = `koch-lesson-${nextLesson}`;
      const content = await fetchSourceContent(sourceId, false); // No auth required

      // Build session config for next lesson
      const config: SessionConfig = {
        mode: 'learn',
        lengthMs: Number.MAX_SAFE_INTEGER,
        wpm,
        farnsworthWpm: wpm,
        speedTier: 'slow',
        sourceId,
        sourceName: `Koch Method - Lesson ${nextLesson}`,
        replay: false,
        feedback: 'none',
        effectiveAlphabet: getCharactersForLesson(nextLesson),
        extraWordSpacing: 0,
        listenTimingOffset: 0,
        characterSpeed: wpm,
        learnLesson: nextLesson,
      };

      onStartNewSession(config, content);
    } catch (error) {
      console.error('Failed to start next lesson:', error);
      alert('Failed to start next lesson. Please try again.');
      setIsStartingNext(false);
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
                  {learnModeData.missedChars.length > 0 && (
                    <div className="learn-missed-characters">
                      MISSED {learnModeData.missedChars.join(', ')}
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

                  {fullStatistics.config.mode === 'head-copy' && fullStatistics.headCopyFirstTryAccuracy !== undefined && (
                    <div className="stat-item">
                      <span className="stat-label">First Try Accuracy</span>
                      <span className="stat-value">{Math.round(fullStatistics.headCopyFirstTryAccuracy)}%</span>
                    </div>
                  )}

                  {fullStatistics.config.mode === 'head-copy' && fullStatistics.headCopyAverageAttempts !== undefined && (
                    <div className="stat-item">
                      <span className="stat-label">Average Attempts</span>
                      <span className="stat-value">{fullStatistics.headCopyAverageAttempts.toFixed(1)}</span>
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
                        'learn': 'Morse Lessons'
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
                  onClick={handleNextLesson}
                  disabled={!learnModeData.canAdvance}
                  title={!learnModeData.canAdvance ? 'Earn at least 1 star to advance' : ''}
                >
                  {learnModeData.lesson < 20 ? `Next Lesson (${learnModeData.lesson + 1})` : 'Back to Lessons'}
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