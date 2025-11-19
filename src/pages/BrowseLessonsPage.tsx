/**
 * Browse Lessons Page
 *
 * Allows users to browse all Koch method lessons, view details, and select any lesson to practice.
 * Navigates back to Learn Mode when starting a lesson.
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeaderBar } from '../components/HeaderBar';
import { StarDisplay } from '../components/StarDisplay';
import { getCharactersForLesson, getNewCharactersForLesson, TOTAL_LESSONS } from '../../functions/shared/koch';
import { useSettings } from '../features/settings/hooks/useSettings';
import '../styles/main.css';
import '../styles/learnConfig.css';

export function BrowseLessonsPage() {
  const { settings, updateSetting } = useSettings();
  const navigate = useNavigate();

  const [selectedLesson, setSelectedLesson] = useState<number | null>(null);

  // Get star ratings from settings
  const learnProgress = useMemo(() => settings?.learnProgress || {}, [settings]);

  // Toggle lesson expansion
  const handleLessonClick = (lesson: number) => {
    setSelectedLesson(selectedLesson === lesson ? null : lesson);
  };

  // Navigate back to Learn Mode to start the selected lesson
  const handleStartLesson = (lesson: number) => {
    navigate('/session/learn', { state: { selectedLesson: lesson } });
  };

  // Render individual lesson item
  const renderLessonItem = (lesson: number) => {
    const newChars = getNewCharactersForLesson(lesson);
    const prevChars = lesson > 1 ? getCharactersForLesson(lesson - 1) : [];
    const stars = learnProgress[lesson] || 0;
    const hasAttempt = learnProgress[lesson] !== undefined;
    const isExpanded = lesson === selectedLesson;

    return (
      <button
        key={lesson}
        className={`learn-lesson-item ${isExpanded ? 'learn-lesson-expanded' : ''}`}
        onClick={() => handleLessonClick(lesson)}
      >
        <div className="learn-lesson-header">
          <div className="learn-lesson-title">
            <span className="learn-lesson-number">Lesson {lesson}:</span>
            <span className="learn-lesson-chars-collapsed">{newChars.join(' ')}</span>
          </div>
          <StarDisplay stars={stars} hasAttempt={hasAttempt} size="medium" />
        </div>

        {isExpanded && (
          <>
            <div className="learn-char-breakdown">
              <div className="learn-char-breakdown-row">
                <span className="learn-char-breakdown-label">New:</span>
                <span className="learn-char-breakdown-chars">
                  {newChars.join(' ')}
                </span>
              </div>
              {prevChars.length > 0 && (
                <div className="learn-char-breakdown-row">
                  <span className="learn-char-breakdown-label">Previous:</span>
                  <span className="learn-char-breakdown-chars">
                    {prevChars.join(' ')}
                  </span>
                </div>
              )}
            </div>
            <div className="learn-lesson-action">
              <button
                className="btn btn-primary btn-large"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartLesson(lesson);
                }}
              >
                {hasAttempt ? `Revisit Lesson ${lesson}` : `Jump to Lesson ${lesson}`}
              </button>
            </div>
          </>
        )}
      </button>
    );
  };

  // Show loading state
  if (!settings) {
    return (
      <div className="min-h-screen browse-lessons-container">
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
    <div className="min-h-screen browse-lessons-container">
      <HeaderBar />

      <div className="container container-centered">
        <div className="container-narrow">
          <h1 className="heading-1" style={{ marginBottom: '16px' }}>Browse Lessons</h1>
          <p className="body-regular" style={{ marginBottom: '24px', color: 'var(--color-text-secondary)' }}>
            Explore all 20 Koch method lessons. Select any lesson to view details and start practicing.
          </p>
        </div>

        {/* WPM Slider */}
        <div className="container-narrow learn-wpm-section">
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

        {/* Lesson List */}
        <div className="container-narrow">
          <div className="learn-lesson-list">
            {Array.from({ length: TOTAL_LESSONS }, (_, i) => i + 1).map(renderLessonItem)}
          </div>
        </div>
      </div>
    </div>
  );
}
