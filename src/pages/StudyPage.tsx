/**
 * Study Page Component (New Runtime Version)
 *
 * Main interface for Morse code practice sessions using the new SessionRunner runtime.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SystemClock } from '../features/session/runtime/clock.js';
import { SimpleInputBus } from '../features/session/runtime/inputBus.js';
import { createIOAdapter } from '../features/session/runtime/ioAdapter.js';
import type { SessionSnapshot } from '../features/session/runtime/io.js';
import { createSessionRunner } from '../features/session/runtime/sessionProgram.js';
import { RandomCharSource } from '../features/session/runtime/sessionProgram.js';
import { createFeedback } from '../features/session/services/feedback/index.js';
import { DEFAULT_SESSION_CONFIG } from '../core/config/defaults.js';
import { getMorsePattern as getMorsePatternFromAlphabet } from '../core/morse/alphabet.js';
import { useAudio } from '../contexts/AudioContext.tsx';
import '../styles/main.css';
import '../styles/studyPage.css';

type StudyPhase = 'waiting' | 'countdown' | 'session';

export function StudyPage() {
  const navigate = useNavigate();
  const { initializeAudio, getAudioEngine, isAudioReady } = useAudio();

  // Check if audio is actually ready (not just what location.state says)
  const audioActuallyReady = isAudioReady();

  const [snapshot, setSnapshot] = useState<SessionSnapshot>({
    phase: 'idle',
    currentChar: null,
    previous: [],
    startedAt: null,
    remainingMs: 0,
    stats: { correct: 0, incorrect: 0, timeout: 0, accuracy: 0 },
  });

  const [revealedChar, setRevealedChar] = useState<string | null>(null);
  const [replayOverlay, setReplayOverlay] = useState<string | null>(null);
  const [feedbackFlash, setFeedbackFlash] = useState<string | null>(null);

  // Always start in 'waiting' state, we'll auto-advance if needed
  const [studyPhase, setStudyPhase] = useState<StudyPhase>('waiting');
  const [countdownNumber, setCountdownNumber] = useState<number>(3);

  // Create runtime dependencies
  const clock = useMemo(() => new SystemClock(), []);
  const input = useMemo(() => new SimpleInputBus(), []);
  const audioEngine = useMemo(() => getAudioEngine(), [getAudioEngine]);
  const feedback = useMemo(() => createFeedback('flash'), []); // Can be 'buzzer', 'flash', or 'both'

  const source = useMemo(() => new RandomCharSource(DEFAULT_SESSION_CONFIG.effectiveAlphabet.join('')), []);

  // Create IO adapter
  const io = useMemo(() => {
    return createIOAdapter({
      audioEngine,
      feedback,
      onReveal: (char: string) => {
        console.log(`[UI] onReveal called with '${char}'`);
        if (DEFAULT_SESSION_CONFIG.mode === 'active') {
          // In active mode, use this for replay overlay
          setReplayOverlay(char);
        } else {
          // In passive mode, use this for normal reveal
          setRevealedChar(char);
        }
      },
      onHide: () => {
        console.log(`[UI] onHide called`);
        if (DEFAULT_SESSION_CONFIG.mode === 'active') {
          setReplayOverlay(null);
        } else {
          setRevealedChar(null);
        }
      },
      onSnapshot: (snap: SessionSnapshot) => setSnapshot(snap),
      replayDuration: 1500  // Show replay for 1.5 seconds
    });
  }, [audioEngine, feedback]);

  // Create session runner
  const runner = useMemo(() => createSessionRunner({ clock, io, input, source }), [clock, io, input, source]);

  // Subscribe to session snapshots
  useEffect(() => {
    const unsub = runner.subscribe((snap) => {
      setSnapshot(snap);
    });
    return () => unsub();
  }, [runner]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only capture alphanumeric and punctuation keys
      if (e.key.length === 1) {
        input.push({ at: performance.now(), key: e.key });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [input]);

  // Stop session and go back
  const stopSession = useCallback(() => {
    runner.stop();
    navigate('/');
  }, [runner, navigate]);

  // Handle click to start when audio not ready
  const handleStartClick = async () => {
    const success = await initializeAudio();

    if (success) {
      setStudyPhase('countdown');
    } else {
      console.error('[StudyPage] Audio initialization failed');
      // Could show error UI here
    }
  };

  // Auto-start countdown if audio is actually initialized
  useEffect(() => {
    if (audioActuallyReady && studyPhase === 'waiting') {
      setStudyPhase('countdown');
    }
  }, []); // Only run once on mount

  // Run countdown when phase changes to 'countdown'
  useEffect(() => {
    if (studyPhase !== 'countdown') return;

    const runCountdown = async () => {
      // Audio should already be initialized if we got here
      if (!isAudioReady()) {
        console.error('[StudyPage] Audio not ready during countdown - this should not happen');
        // Don't try to initialize here - no user gesture context
        return;
      }

      // Countdown from 3 to 1
      for (let i = 3; i > 0; i--) {
        setCountdownNumber(i);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Move to session phase
      setStudyPhase('session');
    };

    runCountdown();
  }, [studyPhase, isAudioReady, initializeAudio]);

  // Start morse session when phase changes to 'session'
  useEffect(() => {
    if (studyPhase !== 'session') return;
    runner.start(DEFAULT_SESSION_CONFIG);
  }, [studyPhase, runner]);


  // Format time display
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate accuracy
  const accuracy = snapshot.stats && (snapshot.stats.correct + snapshot.stats.incorrect + snapshot.stats.timeout) > 0
    ? Math.round((snapshot.stats.correct / (snapshot.stats.correct + snapshot.stats.incorrect + snapshot.stats.timeout)) * 100)
    : 0;

  // Handle feedback flash
  useEffect(() => {
    if (feedbackFlash) {
      const timer = setTimeout(() => setFeedbackFlash(null), 150);
      return () => clearTimeout(timer);
    }
  }, [feedbackFlash]);

  // Get morse pattern for current character
  const getMorsePattern = (char: string | null) => {
    if (!char) return '';
    const pattern = getMorsePatternFromAlphabet(char);
    return pattern ? pattern.join('') : '';
  };

  return (
    <div className="session-container">
      {/* Feedback Flash Overlay */}
      {feedbackFlash && (
        <div className={`feedback-flash ${feedbackFlash}`} />
      )}

      {/* Welcome Screen - waiting for audio initialization */}
      {studyPhase === 'waiting' && (
        <div className="audio-init-container">
          <div className="audio-init-card">
            <h2 className="audio-init-title">Welcome to CodeBeat</h2>
            <p className="audio-init-text">
              Click to start your practice session
            </p>
            <button
              className="btn btn-primary btn-large mt-6"
              onClick={handleStartClick}
            >
              Start Session
            </button>
            <div className="body-small text-muted mt-4">
              Session will start with a 3-2-1 countdown
            </div>
          </div>
        </div>
      )}

      {/* Session Header - only show during actual session */}
      {studyPhase === 'session' && (
        <div className="session-header">
        <div className="session-timer">
          <span className="label">Time Remaining</span>
          <span className="session-timer-value">
            {formatTime(snapshot.remainingMs)}
          </span>
        </div>

        <div className={`session-status status-${snapshot.phase}`}>
          <span className="phase-indicator">
            {snapshot.phase}
          </span>
        </div>

        <div className="session-stats">
          <div className="stat-item">
            <span className="stat-label">Accuracy</span>
            <span className="stat-value">{accuracy}%</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Characters</span>
            <span className="stat-value">{snapshot.previous.length}</span>
          </div>
        </div>
        </div>
      )}

      {/* Main Display Area - show during countdown and session */}
      {(studyPhase === 'countdown' || studyPhase === 'session') && (
        <div className="session-display">
        <div className="character-display">
          <div className={`current-character ${DEFAULT_SESSION_CONFIG.mode === 'passive' && !revealedChar ? 'placeholder' : ''}`}>
            {DEFAULT_SESSION_CONFIG.mode === 'active'
              ? (snapshot.currentChar ? '·' : '')
              : (revealedChar || (snapshot.currentChar ? '?' : '·'))
            }
          </div>

          {snapshot.currentChar && (
            <div className="morse-pattern">
              {getMorsePattern(snapshot.currentChar)}
            </div>
          )}

          {studyPhase === 'waiting' && (
            <p className="body-regular text-muted">
              Click the button above to begin
            </p>
          )}

          {snapshot.phase === 'running' && DEFAULT_SESSION_CONFIG.mode === 'active' && (
            <p className="body-regular text-muted">
              Type the character you hear
            </p>
          )}

          {snapshot.phase === 'running' && DEFAULT_SESSION_CONFIG.mode === 'passive' && (
            <p className="body-regular text-muted">
              Listen and watch for the character reveal
            </p>
          )}

          {snapshot.phase === 'ended' && (
            <div className="text-center">
              <h2 className="heading-2 mb-4">Session Complete!</h2>
              <p className="body-large text-success">{accuracy}% accuracy</p>
            </div>
          )}
        </div>

        {/* Character History */}
        {snapshot.previous.length > 0 && (
          <div className="character-history">
            {snapshot.previous.map((char, i) => (
              <div key={i} className="history-char correct">
                {char}
              </div>
            ))}
          </div>
        )}
        </div>
      )}

      {/* Session Stats Bar */}
      {studyPhase === 'session' && snapshot.phase !== 'idle' && (
        <div className="card">
          <div className="flex justify-between">
            <div className="stat-item">
              <span className="stat-label">Correct</span>
              <span className="stat-value text-success">{snapshot.stats?.correct ?? 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Incorrect</span>
              <span className="stat-value text-error">{snapshot.stats?.incorrect ?? 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Timeout</span>
              <span className="stat-value text-warning">{snapshot.stats?.timeout ?? 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* Session Controls */}
      {studyPhase === 'session' && (
        <div className="session-controls">
        <button
          className="btn btn-secondary"
          onClick={stopSession}
        >
          End Session
        </button>

        <div className="flex gap-4 text-muted body-small">
          <span>Mode: {DEFAULT_SESSION_CONFIG.mode}</span>
          <span>·</span>
          <span>Speed: {DEFAULT_SESSION_CONFIG.speedTier}</span>
          <span>·</span>
          <span>WPM: {DEFAULT_SESSION_CONFIG.wpm}</span>
        </div>
        </div>
      )}

      {/* Countdown Overlay */}
      {studyPhase === 'countdown' && (
        <div className="replay-overlay">
          <div className="replay-content animate-slide-up">
            <div className="replay-character">
              {countdownNumber}
            </div>
            <div className="replay-label">
              Get Ready!
            </div>
          </div>
        </div>
      )}

      {/* Replay Overlay */}
      {replayOverlay && (
        <div className="replay-overlay">
          <div className="replay-content animate-slide-up">
            <div className="replay-character">
              {replayOverlay}
            </div>
            <div className="morse-pattern" style={{ fontSize: '32px', marginBottom: '16px' }}>
              {getMorsePattern(replayOverlay)}
            </div>
            <div className="replay-label">
              Missed Character
            </div>
          </div>
        </div>
      )}
    </div>
  );
}