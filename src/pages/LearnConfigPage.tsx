/**
 * Learn Mode Configuration Page
 *
 * Koch method onboarding with lesson selector, WPM controls, and star ratings.
 * Works for anonymous users (stars saved locally) and syncs when authenticated.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { SessionConfig } from '../core/types/domain';
import type { SourceContent } from '../features/sources';
import { HeaderBar } from '../components/HeaderBar';
import { getCharactersForLesson, getNewCharactersForLesson, TOTAL_LESSONS } from '../../functions/shared/koch';
import { fetchSourceContent } from '../features/sources';
import { useSettings } from '../features/settings/hooks/useSettings';
import '../styles/main.css';
import '../styles/learnConfig.css';

type LearnConfigPageProps = {
  onStart: (config: SessionConfig, sourceContent: SourceContent) => void;
};

export function LearnConfigPage({ onStart }: LearnConfigPageProps) {
  const { settings, updateSetting } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();

  const [wpm, setWpm] = useState<number>(15);
  const [isStarting, setIsStarting] = useState(false);

  // Sync WPM from centralized settings when they load
  useEffect(() => {
    if (settings) {
      setWpm(settings.wpm);
    }
  }, [settings]);

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

  // Handle start session for a specific lesson
  const handleStartLesson = useCallback(async (lesson: number) => {
    if (isStarting) return;

    setIsStarting(true);

    try {
      // Fetch practice content from backend Koch source
      const sourceId = `koch-lesson-${lesson}`;
      const content = await fetchSourceContent(sourceId, false); // No auth required

      // Build session config
      const config: SessionConfig = {
        mode: 'learn',
        lengthMs: Number.MAX_SAFE_INTEGER, // No time limit (ends after 20 characters)
        wpm,
        farnsworthWpm: wpm, // No Farnsworth for Learn Mode
        speedTier: 'slow',
        sourceId,
        sourceName: `Koch Method - Lesson ${lesson}`,
        replay: false, // Learn Mode has built-in replay behavior
        feedback: 'none', // Learn Mode has custom feedback
        effectiveAlphabet: getCharactersForLesson(lesson),
        extraWordSpacing: 0,
        listenTimingOffset: 0,
        characterSpeed: wpm,
        learnLesson: lesson,
      };

      onStart(config, content);
    } catch (error) {
      console.error('Failed to start Learn Mode session:', error);
      alert('Failed to start session. Please try again.');
      setIsStarting(false);
    }
  }, [isStarting, wpm, onStart]);

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
      return (
        <>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎉</div>
            <div style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text-primary)' }}>
              You've completed all 20 lessons!
            </div>
          </div>
          <button
            className="btn btn-secondary btn-large"
            onClick={() => navigate('/learn/browse')}
            style={{ width: '100%' }}
          >
            Browse Lessons
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

        <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '12px' }}>
          {firstTime ? 'Start here' : 'Your Next Lesson'}
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
            Lesson {lessonNum}
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

        <div style={{ textAlign: 'center' }}>
          <a
            href="/learn/browse"
            onClick={(e) => {
              e.preventDefault();
              navigate('/learn/browse');
            }}
            style={{
              color: 'var(--color-blue-primary)',
              textDecoration: 'none',
              fontSize: '14px',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
            onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
          >
            Browse All Lessons
          </a>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen">
      <HeaderBar />

      <div className="container container-centered">
        <div className="container-narrow">
          <h1 className="heading-1" style={{ marginBottom: '16px' }}>Learn Mode</h1>
          <p className="body-regular" style={{ marginBottom: '32px', color: 'var(--color-text-secondary)' }}>
            Learn Morse code from scratch using the Koch method. Progress through 20 lessons, mastering 2 new characters at a time.
          </p>

          {/* Lesson Content */}
          {renderLessonContent()}
        </div>
      </div>
    </div>
  );
}
