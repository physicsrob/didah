/**
 * Active Session Page
 *
 * Focused practice interface with minimal UI for distraction-free learning.
 * Handles the actual Morse code session with just a header and character display.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getMorsePattern as getMorsePatternFromAlphabet } from '../core/morse/alphabet.js';
import { SystemClock } from '../features/session/runtime/clock.js';
import { SimpleInputBus } from '../features/session/runtime/inputBus.js';
import { createIOAdapter } from '../features/session/runtime/ioAdapter.js';
import type { SessionSnapshot, LogEvent } from '../features/session/runtime/io.js';
import { createSessionRunner } from '../features/session/runtime/sessionProgram.js';
import { createCharacterSource } from '../features/sources';
import type { SourceContent } from '../features/sources';
import { createFeedback } from '../features/session/services/feedback/index.js';
import { useAudio } from '../hooks/useAudio';
import { debug } from '../core/debug';
import { useSettings } from '../features/settings/hooks/useSettings';
import { SessionStatsCalculator } from '../features/statistics/sessionStatsCalculator';
import { getMode } from '../features/session/modes/shared/registry';
import '../styles/main.css';
import '../styles/activeSession.css';

type SessionPhase = 'waiting' | 'countdown' | 'active' | 'paused';

export function ActiveSessionPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { initializeAudio, getAudioEngine, isAudioReady } = useAudio();
  const { settings } = useSettings();

  // Get config, source content, and source name from navigation state
  const config = location.state?.config;
  const sourceContent = location.state?.sourceContent as SourceContent | null;

  // Redirect to config page if no config or sourceContent provided
  useEffect(() => {
    if (!config || !sourceContent) {
      navigate('/session-config');
    }
  }, [config, sourceContent, navigate]);

  // Get mode definition (will be null if config missing, component will not render)
  const mode = config ? getMode(config.mode) : null;

  // Check if audio is actually ready
  const audioActuallyReady = isAudioReady();

  const [snapshot, setSnapshot] = useState<SessionSnapshot>({
    phase: 'idle',
    startedAt: null,
    remainingMs: 0,
    emissions: [],
    // Mode-specific state will be initialized by sessionProgram.ts when session starts
  });

  const [replayOverlay, setReplayOverlay] = useState<string | null>(null);
  const [feedbackFlash, setFeedbackFlash] = useState<string | null>(null);
  const [sessionPhase, setSessionPhase] = useState<SessionPhase>('waiting');
  const [countdownNumber, setCountdownNumber] = useState<number>(3);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);  // Use ref to avoid recreating IO adapter
  const eventCollector = useRef<LogEvent[]>([]);  // Collect events for statistics

  // Create runtime dependencies
  const clock = useMemo(() => new SystemClock(), []);
  const input = useMemo(() => new SimpleInputBus(), []);
  const audioEngine = useMemo(() => getAudioEngine(), [getAudioEngine]);

  // Create feedback
  const feedback = useMemo(() => {
    if (!config) return null;

    const feedbackType = config.feedback;

    // Don't create any feedback for 'none' or when only using flash
    if (feedbackType === 'none' || feedbackType === 'flash') {
      return null;
    }

    // Create buzzer feedback for 'buzzer' or 'both'
    let fb = null;
    if (feedbackType === 'buzzer' || feedbackType === 'both') {
      if (!settings) {
        throw new Error('Settings must be loaded before creating feedback');
      }
      fb = createFeedback('buzzer', settings.buzzerVolume);
    }

    if (fb && audioEngine) {
      const audioContext = audioEngine.getAudioContext();
      if (audioContext) {
        fb.initialize?.(audioContext);
      }
    }

    return fb;
  }, [config, audioEngine, settings]);

  // Create character source
  const source = useMemo(() => {
    if (!config || !sourceContent) return null;
    return createCharacterSource(sourceContent, config.effectiveAlphabet);
  }, [sourceContent, config]);

  // Create IO adapter
  const io = useMemo(() => {
    if (!config) return null;
    return createIOAdapter({
      audioEngine,
      feedback: feedback || undefined,
      feedbackType: config.feedback,
      mode: config.mode,
      onReveal: (char: string) => {
        // Don't show replays when paused
        if (config.mode === 'practice' && config.replay && !isPausedRef.current) {
          setReplayOverlay(char);
        }
      },
      onHide: () => {
        setReplayOverlay(null);
      },
      onSnapshot: (snap: SessionSnapshot) => setSnapshot(snap),
      onFlash: (type: 'error' | 'warning' | 'success') => {
        setFeedbackFlash(type);
      },
      onLog: (event: LogEvent) => {
        eventCollector.current.push(event);
      },
      replayDuration: 1500,
      isPaused: () => isPausedRef.current,
      extraWordSpacing: config.extraWordSpacing
    });
  }, [audioEngine, feedback, config]);

  // Create session runner
  const runner = useMemo(() => {
    if (!io || !source) return null;
    return createSessionRunner({ clock, io, input, source });
  }, [clock, io, input, source]);

  // Handle pause/resume
  const handlePause = useCallback(() => {
    if (!runner) return;
    runner.pause();
    setIsPaused(true);
    isPausedRef.current = true;
    // Hide any active replay overlay when pausing
    setReplayOverlay(null);
  }, [runner]);

  const handleResume = useCallback(() => {
    if (!runner) return;
    runner.resume();
    setIsPaused(false);
    isPausedRef.current = false;
  }, [runner]);

  // Mode-specific keyboard input
  // Note: 'paused' is treated as 'active' for mode purposes (isPaused flag handles the pause state)
  const modeSessionPhase: 'waiting' | 'countdown' | 'active' = sessionPhase === 'paused' ? 'active' : sessionPhase;
  // Use optional chaining since useKeyboardInput is optional (Listen mode doesn't define it)
  if (mode && runner && config) {
    mode.useKeyboardInput?.({
      input,
      sessionPhase: modeSessionPhase,
      isPaused,
      snapshot,
      updateSnapshot: runner.updateSnapshot,
      onPause: handlePause,
      config
    });
  }

  // Navigate to completion page with full statistics
  const navigateToCompletion = useCallback((delay: number = 0) => {
    if (!config) return;

    // Calculate comprehensive statistics
    const calculator = new SessionStatsCalculator();
    const fullStatistics = calculator.calculateStats(eventCollector.current, config);
    debug.log('Session statistics calculated:', fullStatistics);

    const doNavigate = () => {
      navigate('/session-complete', {
        state: {
          fullStatistics,
          liveCopyTyped: config.mode === 'live-copy' ? snapshot.liveCopyState?.typedString : null,
          liveCopyTransmitted: config.mode === 'live-copy' ? snapshot.emissions.map(e => e.char) : null
        }
      });
    };

    if (delay > 0) {
      setTimeout(doNavigate, delay);
    } else {
      doNavigate();
    }
  }, [navigate, config, snapshot.liveCopyState?.typedString, snapshot.emissions]);

  // Subscribe to session snapshots
  useEffect(() => {
    if (!runner) return;

    const unsub = runner.subscribe((snap) => {
      setSnapshot(snap);

      // Navigate to completion page when session ends
      if (snap.phase === 'ended') {
        // Wait a moment for the last stats to be visible
        navigateToCompletion(500);
      }
    });
    return () => unsub();
  }, [runner, navigateToCompletion]);

  const handleEndSession = useCallback(() => {
    if (!runner) return;

    // Stop the runner
    runner.stop();
    // Navigate immediately to completion page
    navigateToCompletion();
  }, [runner, navigateToCompletion]);

  // Handle click to start when audio not ready
  const handleStartClick = async () => {
    const success = await initializeAudio();
    if (success) {
      setSessionPhase('countdown');
    }
  };

  // Auto-start countdown if audio is ready
  useEffect(() => {
    if (audioActuallyReady && sessionPhase === 'waiting') {
      setSessionPhase('countdown');
    }
  }, [audioActuallyReady, sessionPhase]);

  // Run countdown
  useEffect(() => {
    if (sessionPhase !== 'countdown') return;

    const runCountdown = async () => {
      if (!isAudioReady()) return;

      for (let i = 3; i > 0; i--) {
        setCountdownNumber(i);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      setSessionPhase('active');
    };

    runCountdown();
  }, [sessionPhase, isAudioReady]);

  // Start session when active
  useEffect(() => {
    if (sessionPhase !== 'active' || !runner || !config) return;
    runner.start(config);
  }, [sessionPhase, runner, config]);

  // Format time display
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle feedback flash
  useEffect(() => {
    if (feedbackFlash) {
      const timer = setTimeout(() => setFeedbackFlash(null), 150);
      return () => clearTimeout(timer);
    }
  }, [feedbackFlash]);

  // Cleanup
  useEffect(() => {
    if (!runner) return;
    return () => {
      runner.stop();
    };
  }, [runner]);

  // Early return if required data is missing (redirect effect will handle navigation)
  if (!config || !sourceContent || !mode) {
    return null;
  }

  const getSourceDisplay = () => {
    return config.sourceName || 'Unknown';
  };

  return (
    <div className="active-session-wrapper bg-gradient-primary">
      <div className="active-session-container">
        {/* Feedback Flash Overlay */}
        {feedbackFlash && (
          <div className={`feedback-flash ${feedbackFlash}`} />
        )}

      {/* Welcome Screen */}
      {sessionPhase === 'waiting' && (
        <div className="welcome-container">
          <div className="welcome-card">
            <h2 className="welcome-title">MorseAcademy</h2>
            <p className="welcome-text">Click to start your practice session</p>
            <button className="btn btn-primary" onClick={handleStartClick}>
              Start Session
            </button>
            <div className="welcome-hint">Session will start with a 3-2-1 countdown</div>
          </div>
        </div>
      )}

      {/* Session Header - only during active session */}
      {sessionPhase === 'active' && (
        <div className="session-header">
          <div className="header-left">
            <button className="pause-button" onClick={handlePause}>
              Pause
            </button>
            <div className="header-info">
              <div className="info-wpm">{config.wpm} WPM</div>
              <div className="info-source">{getSourceDisplay()}</div>
            </div>
          </div>
          {config.mode !== 'runner' && (
            <div className="timer">{formatTime(snapshot.remainingMs)}</div>
          )}
        </div>
      )}

      {/* Main Display Area */}
      {(sessionPhase === 'countdown' || sessionPhase === 'active') && (
        <div className="session-display-area">
          {mode.renderDisplay({ snapshot })}
        </div>
      )}

      {/* Countdown Overlay */}
      {sessionPhase === 'countdown' && (
        <div className="overlay">
          <div className="overlay-content">
            <div className="countdown-number">{countdownNumber}</div>
            <div className="countdown-label">Get Ready!</div>
          </div>
        </div>
      )}

      {/* Pause Overlay */}
      {isPaused && (
        <div className="overlay">
          <div className="pause-modal">
            <h2 className="pause-title">Session Paused</h2>
            <div className="pause-buttons">
              <button className="btn btn-primary" onClick={handleResume}>
                Resume
              </button>
              <button className="btn btn-secondary" onClick={handleEndSession}>
                End Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Replay Overlay */}
      {replayOverlay && (
        <div className="overlay">
          <div className="overlay-content">
            <div className="replay-character">{replayOverlay}</div>
            <div className="morse-pattern">
              {getMorsePatternFromAlphabet(replayOverlay)?.join('') || ''}
            </div>
            <div className="replay-label">Missed Character</div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}