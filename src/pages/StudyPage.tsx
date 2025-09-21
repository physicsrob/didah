/**
 * Study Page Component (New Runtime Version)
 *
 * Main interface for Morse code practice sessions using the new SessionRunner runtime.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getMorsePattern as getMorsePatternFromAlphabet } from '../core/morse/alphabet.js';
import { SystemClock } from '../features/session/runtime/clock.js';
import { SimpleInputBus } from '../features/session/runtime/inputBus.js';
import { createIOAdapter } from '../features/session/runtime/ioAdapter.js';
import type { SessionSnapshot, HistoryItem } from '../features/session/runtime/io.js';
import { createSessionRunner } from '../features/session/runtime/sessionProgram.js';
import { RandomCharSource } from '../features/session/runtime/sessionProgram.js';
import { createFeedback } from '../features/session/services/feedback/index.js';
import { useAudio } from '../contexts/useAudio';
import '../styles/main.css';
import '../styles/studyPage.css';

type StudyPhase = 'waiting' | 'countdown' | 'session';

// Character History component for continuous text display
function CharacterHistory({ items }: { items: HistoryItem[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the right when items change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [items]);

  return (
    <div className="character-history-container">
      <div className="character-history-text" ref={scrollRef}>
        {items.length === 0 ? (
          <span className="history-placeholder">Session started. Characters will appear here...</span>
        ) : (
          items.map((item, i) => (
            <span key={i} className={`char-${item.result}`}>
              {item.char}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

export function StudyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { initializeAudio, getAudioEngine, isAudioReady } = useAudio();

  // Get config from navigation state
  const config = location.state?.config;

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

  const [replayOverlay, setReplayOverlay] = useState<string | null>(null);
  const [feedbackFlash, setFeedbackFlash] = useState<string | null>(null);

  // Always start in 'waiting' state, we'll auto-advance if needed
  const [studyPhase, setStudyPhase] = useState<StudyPhase>('waiting');
  const [countdownNumber, setCountdownNumber] = useState<number>(3);

  // Create runtime dependencies
  const clock = useMemo(() => new SystemClock(), []);
  const input = useMemo(() => new SimpleInputBus(), []);
  const audioEngine = useMemo(() => getAudioEngine(), [getAudioEngine]);

  // Create feedback and initialize buzzer if needed
  const feedback = useMemo(() => {
    console.log('[StudyPage] Creating feedback with type:', config?.feedback || 'flash');
    // Only create BuzzerFeedback for buzzer or both modes
    // Flash is handled by onFlash callback in ioAdapter
    const feedbackType = config?.feedback || 'flash';
    let fb = null;
    if (feedbackType === 'buzzer' || feedbackType === 'both') {
      fb = createFeedback('buzzer');  // Only create buzzer
      console.log('[StudyPage] Created feedback instance:', fb.constructor.name);
    } else {
      console.log('[StudyPage] No feedback instance created (flash handled by overlay)');
    }

    // Initialize buzzer with AudioContext if it has buzzer component
    if (fb && audioEngine) {
      // Access AudioContext from audioEngine - it should have this property
      const audioContext = (audioEngine as unknown as { audioContext?: AudioContext }).audioContext;
      if (audioContext && 'initialize' in fb) {
        (fb as { initialize: (ctx: AudioContext) => void }).initialize(audioContext);
        console.log('[StudyPage] Initialized buzzer with AudioContext');
      }
    }

    return fb;
  }, [config?.feedback, audioEngine]);

  const source = useMemo(() => new RandomCharSource(config?.effectiveAlphabet?.join('') || 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'), [config?.effectiveAlphabet]);

  // Create IO adapter
  const io = useMemo(() => {
    return createIOAdapter({
      audioEngine,
      feedback: feedback || undefined,  // May be null for flash-only mode
      feedbackType: config?.feedback,  // Pass the feedback type
      onReveal: (char: string) => {
        console.log(`[UI] onReveal called with '${char}'`);
        // Only used for active mode replay overlay
        if (config?.mode === 'practice' && config?.replay) {
          setReplayOverlay(char);
        }
        // Passive mode reveals are handled through character history in snapshot
      },
      onHide: () => {
        console.log(`[UI] onHide called`);
        setReplayOverlay(null);
      },
      onSnapshot: (snap: SessionSnapshot) => setSnapshot(snap),
      onFlash: (type: 'error' | 'warning' | 'success') => {
        setFeedbackFlash(type);
      },
      replayDuration: 1500  // Show replay for 1.5 seconds
    });
  }, [audioEngine, feedback, config?.mode, config?.replay, config?.feedback]);

  // Create session runner
  const runner = useMemo(() => createSessionRunner({ clock, io, input, source }), [clock, io, input, source]);

  // Subscribe to session snapshots
  useEffect(() => {
    if (config) {
      const unsub = runner.subscribe((snap) => {
        setSnapshot(snap);
      });
      return () => unsub();
    }
  }, [runner, config]);

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

  // Redirect to config page if no config provided
  useEffect(() => {
    if (!config) {
      navigate('/session-config');
    }
  }, [config, navigate]);

  // Auto-start countdown if audio is actually initialized
  useEffect(() => {
    if (audioActuallyReady && studyPhase === 'waiting') {
      setStudyPhase('countdown');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (studyPhase !== 'session' || !config) return;
    runner.start(config);
  }, [studyPhase, runner, config]);


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

  // Cleanup: Stop session when component unmounts or navigates away
  useEffect(() => {
    return () => {
      console.log('[StudyPage] Component unmounting - stopping session');
      runner.stop();
    };
  }, [runner]);

  // Early return if no config
  if (!config) {
    return null;
  }

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
          {/* Session Status Messages */}
          <div className="session-status-area">
            {snapshot.phase === 'running' && config?.mode === 'practice' && (
              <p className="body-regular text-muted">
                Type the character you hear
              </p>
            )}

            {snapshot.phase === 'running' && config?.mode === 'listen' && (
              <p className="body-regular text-muted">
                Listen to the characters
              </p>
            )}

            {snapshot.phase === 'running' && config?.mode === 'live-copy' && (
              <p className="body-regular text-muted">
                Copy the continuous transmission
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
          <CharacterHistory items={snapshot.previous} />
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
          <span>Mode: {config?.mode?.replace('-', ' ') || 'practice'}</span>
          <span>·</span>
          <span>Speed: {config?.speedTier || 'slow'}</span>
          <span>·</span>
          <span>WPM: {config?.wpm || 15}</span>
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
              {getMorsePatternFromAlphabet(replayOverlay)?.join('') || ''}
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