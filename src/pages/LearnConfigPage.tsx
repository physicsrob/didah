/**
 * Learn Mode Configuration Page
 *
 * Koch method onboarding with lesson selector, WPM controls, and star ratings.
 * Works for anonymous users (stars saved locally) and syncs when authenticated.
 *
 * NOTE: Backend mode identifier is 'learn', but UI displays "Morse Lessons"
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { SessionConfig } from '../core/types/domain';
import type { SourceContent } from '../features/sources';
import { HeaderBar } from '../components/HeaderBar';
import { StarDisplay } from '../components/StarDisplay';
import { getCharactersForLesson, getNewCharactersForLesson, TOTAL_LESSONS } from '../../functions/shared/koch';
import { fetchSourceContent } from '../features/sources';
import { useSettings } from '../features/settings/hooks/useSettings';
import { MODE_REGISTRY } from '../features/session/modes/shared/registry';
import '../styles/main.css';
import '../styles/learnConfig.css';

type LearnConfigPageProps = {
  onStart: (config: SessionConfig, sourceContent: SourceContent) => void;
};

export function LearnConfigPage({ onStart }: LearnConfigPageProps) {
  const { settings, updateSetting } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();

  const [isStarting, setIsStarting] = useState(false);

  // Get star ratings from settings (works for both anonymous and authenticated users)
  const learnProgress = useMemo(() => settings?.learnProgress || {}, [settings]);

  // Determine the "next lesson" (first lesson with 0 stars or no attempt)
  const nextLesson = useCallback(() => {
    for (let lesson = 1; lesson <= TOTAL_LESSONS; lesson++) {
      const stars = learnProgress[lesson];
      if (stars === undefined || stars === 0) {
        return lesson;
      }
    }
    return TOTAL_LESSONS; // All lessons completed, suggest last lesson
  }, [learnProgress]);

  // Check if all lessons are complete
  const allLessonsComplete = useCallback(() => {
    for (let lesson = 1; lesson <= TOTAL_LESSONS; lesson++) {
      const stars = learnProgress[lesson];
      if (stars === undefined || stars === 0) {
        return false;
      }
    }
    return true;
  }, [learnProgress]);

  // Check if this is a first-time user (no progress at all)
  const isFirstTime = useCallback(() => {
    return Object.keys(learnProgress).length === 0;
  }, [learnProgress]);

  // Determine the lesson to retry (most recent completed lesson)
  const retryLesson = useCallback(() => {
    const next = nextLesson();
    const allComplete = allLessonsComplete();

    // If all lessons complete, offer to retry the last lesson
    if (allComplete) {
      return TOTAL_LESSONS;
    }

    // If next lesson is > 1, offer to retry the previous lesson
    if (next > 1) {
      return next - 1;
    }

    // Otherwise no retry lesson (first time or on lesson 1 with 0 stars)
    return null;
  }, [nextLesson, allLessonsComplete]);

  // Handle start session for a specific lesson
  const handleStartLesson = useCallback(async (lesson: number) => {
    if (isStarting || !settings) return;

    setIsStarting(true);

    try {
      // Fetch practice content from backend Koch source
      const sourceId = `koch-lesson-${lesson}`;
      const content = await fetchSourceContent(sourceId, false); // No auth required

      // Use settings.wpm directly to ensure we always use the correct speed
      const sessionWpm = settings.wpm;

      // Build session config
      const config: SessionConfig = {
        mode: 'learn',
        lengthMs: Number.MAX_SAFE_INTEGER, // No time limit (ends after 20 characters)
        wpm: sessionWpm,
        farnsworthWpm: sessionWpm, // No Farnsworth for Learn Mode
        speedTier: 'slow',
        sourceId,
        sourceName: `Koch Method - Lesson ${lesson}`,
        replay: false, // Learn Mode has built-in replay behavior
        feedback: 'buzzer', // Learn Mode uses buzzer + custom flash (not global flash)
        effectiveAlphabet: getCharactersForLesson(lesson),
        extraWordSpacing: 0,
        listenTimingOffset: 0,
        characterSpeed: sessionWpm,
        learnLesson: lesson,
      };

      onStart(config, content);
    } catch (error) {
      console.error('Failed to start Learn Mode session:', error);
      alert('Failed to start session. Please try again.');
      setIsStarting(false);
    }
  }, [isStarting, settings, onStart]);

  // Auto-start lesson if navigated from Browse Lessons page
  useEffect(() => {
    const state = location.state as { selectedLesson?: number } | null;
    if (state?.selectedLesson && settings && !isStarting) {
      // Clear the state so back button doesn't re-trigger
      navigate(location.pathname, { replace: true });
      // Start the selected lesson
      handleStartLesson(state.selectedLesson);
    }
  }, [location.state, location.pathname, settings, isStarting, navigate, handleStartLesson]);

  // Show loading state
  if (!settings) {
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

  // Render lesson content based on progress
  const renderLessonContent = () => {
    const recommended = nextLesson();
    const allComplete = allLessonsComplete();
    const firstTime = isFirstTime();

    if (allComplete) {
      const retry = retryLesson();
      const retryStars = retry ? learnProgress[retry] || 0 : 0;

      return (
        <>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎉</div>
            <div style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text-primary)' }}>
              You've completed all 20 lessons!
            </div>
          </div>
          {retry && (
            <button
              className="btn btn-secondary btn-large"
              onClick={() => handleStartLesson(retry)}
              disabled={isStarting}
              style={{ width: '100%', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <span>Retry Lesson {retry}</span>
              <StarDisplay stars={retryStars} hasAttempt={true} size="small" />
            </button>
          )}
          <button
            className="btn btn-secondary btn-large"
            onClick={() => navigate('/learn/browse')}
            style={{ width: '100%' }}
          >
            Browse All Lessons
          </button>
        </>
      );
    }

    const lessonNum = firstTime ? 1 : recommended;
    const newChars = getNewCharactersForLesson(lessonNum);
    const prevChars = lessonNum > 1 ? getCharactersForLesson(lessonNum - 1) : [];

    return (
      <>
        <div style={{ marginBottom: '24px' }}>
          <div className="settings-row">
            <div className="settings-label">Character Speed</div>
            <div className="settings-control">
              <input
                type="range"
                min="5"
                max="40"
                value={settings.wpm}
                onChange={(e) => {
                  updateSetting('wpm', Number(e.target.value));
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
                {settings.wpm} WPM
              </span>
            </div>
          </div>
        </div>

        <div style={{
          padding: '24px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-primary)',
          borderRadius: '8px',
          marginBottom: '24px'
        }}>
          <div style={{
            fontSize: '16px',
            fontWeight: '600',
            color: 'var(--text-secondary)',
            marginBottom: '16px'
          }}>
            {firstTime ? '🎯 Start Here: Lesson 1' : `🎯 Up Next: Lesson ${lessonNum}`}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                New Characters
              </div>
              <div style={{
                fontSize: '32px',
                fontWeight: '600',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-primary)',
                letterSpacing: '6px',
                lineHeight: '1.2'
              }}>
                {newChars.join(' ')}
              </div>
            </div>
            {prevChars.length > 0 && (
              <div>
                <div style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Previous Characters
                </div>
                <div style={{
                  fontSize: '16px',
                  fontWeight: '500',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-secondary)',
                  letterSpacing: '2px',
                  lineHeight: '1.6'
                }}>
                  {prevChars.join(' ')}
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          className="btn btn-primary btn-large"
          onClick={() => handleStartLesson(lessonNum)}
          disabled={isStarting}
          style={{ width: '100%', marginBottom: '8px' }}
        >
          {isStarting ? 'Starting...' : `Start Lesson ${lessonNum}`}
        </button>

        {(() => {
          const retry = retryLesson();
          const retryStars = retry ? learnProgress[retry] || 0 : 0;

          return retry ? (
            <button
              className="btn btn-secondary btn-large"
              onClick={() => handleStartLesson(retry)}
              disabled={isStarting}
              style={{ width: '100%', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              <span>Retry Lesson {retry}</span>
              <StarDisplay stars={retryStars} hasAttempt={true} size="small" />
            </button>
          ) : null;
        })()}

        <button
          className="btn btn-secondary btn-large"
          onClick={() => navigate('/learn/browse')}
          disabled={isStarting}
          style={{ width: '100%' }}
        >
          Browse All Lessons
        </button>
      </>
    );
  };

  return (
    <div className="min-h-screen">
      <HeaderBar />

      <div className="container container-centered">
        <div className="container-narrow">
          <h1 className="heading-1" style={{ marginBottom: '16px' }}>{MODE_REGISTRY['learn'].displayName}</h1>
          <p className="body-regular" style={{ marginBottom: '32px', color: 'var(--color-text-secondary)' }}>
            {MODE_REGISTRY['learn'].longDescription}
          </p>

          {/* Lesson Content */}
          {renderLessonContent()}
        </div>
      </div>
    </div>
  );
}
