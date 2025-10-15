/**
 * Active Session Page
 *
 * Focused practice interface with minimal UI for distraction-free learning.
 * Handles the actual Morse code session with just a header and character display.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { SessionConfig } from '../core/types/domain';
import type { SessionStatisticsWithMaps } from '../core/types/statistics';
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
import { evaluateLiveCopy } from '../features/session/modes/liveCopy/evaluator';
import { formatSpeedDisplay } from '../utils/speedDisplay';
import { isTouchDevice } from '../utils/deviceDetection';
import { VirtualKeyboard } from '../components/VirtualKeyboard';
import '../styles/main.css';
import '../styles/activeSession.css';

type SessionPhase = 'waiting' | 'countdown' | 'active' | 'paused';

type ActiveSessionPageProps = {
  config: SessionConfig;
  sourceContent: SourceContent;
  onComplete: (statistics: SessionStatisticsWithMaps) => void;
};

export function ActiveSessionPage({ config, sourceContent, onComplete }: ActiveSessionPageProps) {
  const { initializeAudio, getAudioEngine, isAudioReady } = useAudio();
  const { settings } = useSettings();

  // Get mode definition
  const mode = useMemo(() => getMode(config.mode), [config.mode]);

  // Check if audio is actually ready
  const audioActuallyReady = isAudioReady();

  const [snapshot, setSnapshot] = useState<SessionSnapshot>({
    phase: 'idle',
    startedAt: null,
    remainingMs: 0,
    emissions: [],
  });

  const [replayOverlay, setReplayOverlay] = useState<string | null>(null);
  const [feedbackFlash, setFeedbackFlash] = useState<string | null>(null);
  const [sessionPhase, setSessionPhase] = useState<SessionPhase>('waiting');
  const [countdownNumber, setCountdownNumber] = useState<number>(3);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  const eventCollector = useRef<LogEvent[]>([]);

  // Create runtime dependencies
  const clock = useMemo(() => new SystemClock(), []);
  const input = useMemo(() => new SimpleInputBus(), []);
  const audioEngine = useMemo(() => getAudioEngine(), [getAudioEngine]);

  // Create feedback
  const feedback = useMemo(() => {
    const feedbackType = config.feedback;

    if (feedbackType === 'none' || feedbackType === 'flash') {
      return null;
    }

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
  }, [config.feedback, audioEngine, settings]);

  // Create character source
  const source = useMemo(() => {
    return createCharacterSource(sourceContent, config.effectiveAlphabet, mode.emissionGranularity);
  }, [sourceContent, config.effectiveAlphabet, mode.emissionGranularity]);

  // Create IO adapter
  const io = useMemo(() => {
    return createIOAdapter({
      audioEngine,
      feedback: feedback || undefined,
      feedbackType: config.feedback,
      mode: config.mode,
      onReveal: (char: string) => {
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
  }, [audioEngine, feedback, config.mode, config.replay, config.feedback, config.extraWordSpacing]);

  // Create session runner
  const runner = useMemo(() => {
    return createSessionRunner({ clock, io, input, source });
  }, [clock, io, input, source]);

  // Handle pause/resume
  const handlePause = useCallback(() => {
    runner.pause();
    setIsPaused(true);
    isPausedRef.current = true;
    setReplayOverlay(null);
  }, [runner]);

  const handleResume = useCallback(() => {
    runner.resume();
    setIsPaused(false);
    isPausedRef.current = false;
  }, [runner]);

  // Mode-specific keyboard input
  const modeSessionPhase: 'waiting' | 'countdown' | 'active' = sessionPhase === 'paused' ? 'active' : sessionPhase;
  mode.useKeyboardInput?.({
    input,
    sessionPhase: modeSessionPhase,
    isPaused,
    snapshot,
    updateSnapshot: runner.updateSnapshot,
    onPause: handlePause,
    config
  });

  // Navigate to completion page with full statistics
  const completeSession = useCallback((delay: number = 0) => {
    // For Live Copy mode, evaluate the transcription before calculating stats
    if (config.mode === 'live-copy' && snapshot.liveCopyState) {
      const typedString = snapshot.liveCopyState.typedString;

      // Extract transmitted string from emission events
      const transmittedString = eventCollector.current
        .filter(e => e.type === 'emission')
        .map(e => e.char)
        .join('');

      // Evaluate the transcription
      const evaluation = evaluateLiveCopy(transmittedString, typedString, eventCollector.current);

      // Append evaluation events to the event log
      eventCollector.current.push(...evaluation.events);

      debug.log('Live Copy evaluation:', {
        transmitted: transmittedString,
        typed: typedString,
        accuracy: evaluation.metrics.accuracy,
        diffSegments: evaluation.diffSegments.length
      });

      // Calculate statistics with evaluation events included
      const calculator = new SessionStatsCalculator();
      const baseStatistics = calculator.calculateStats(eventCollector.current, config);

      // Add diff segments to statistics
      const fullStatistics = {
        ...baseStatistics,
        liveCopyDiff: evaluation.diffSegments
      };

      debug.log('Session statistics calculated:', fullStatistics);

      const doComplete = () => {
        onComplete(fullStatistics);
      };

      if (delay > 0) {
        setTimeout(doComplete, delay);
      } else {
        doComplete();
      }
    } else {
      // Non-Live Copy modes: calculate stats normally
      const calculator = new SessionStatsCalculator();
      const fullStatistics = calculator.calculateStats(eventCollector.current, config);
      debug.log('Session statistics calculated:', fullStatistics);

      const doComplete = () => {
        onComplete(fullStatistics);
      };

      if (delay > 0) {
        setTimeout(doComplete, delay);
      } else {
        doComplete();
      }
    }
  }, [onComplete, config, snapshot]);

  // Subscribe to session snapshots
  useEffect(() => {
    const unsub = runner.subscribe((snap) => {
      setSnapshot(snap);

      if (snap.phase === 'ended') {
        completeSession(500);
      }
    });
    return () => unsub();
  }, [runner, completeSession]);

  const handleEndSession = useCallback(async () => {
    // Stop the runner and wait for cleanup to complete
    // The subscription will call completeSession when it sees phase: 'ended'
    await runner.stop();
  }, [runner]);

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
    if (sessionPhase !== 'active') return;
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
    return () => {
      // Fire and forget - we don't need to wait during unmount
      runner.stop().catch(err => {
        console.error('Error stopping session during cleanup:', err);
      });
    };
  }, [runner]);

  const getSourceDisplay = () => {
    return config.sourceName || 'Unknown';
  };

  // Get formatted speed display
  const speedDisplay = useMemo(() => formatSpeedDisplay(config), [config]);

  // Determine if virtual keyboard should be shown
  const isTouch = useMemo(() => isTouchDevice(), []);
  const modeNeedsKeyboard = useMemo(() => {
    return ['practice', 'live-copy', 'runner'].includes(config.mode);
  }, [config.mode]);
  const showVirtualKeyboard = isTouch && modeNeedsKeyboard && sessionPhase === 'active' && !isPaused;

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

      {/* Session Header - only during active session, hidden for runner mode */}
      {sessionPhase === 'active' && config.mode !== 'runner' && (
        <div className="session-header">
          <div className="header-left">
            <button className="pause-button" onClick={handlePause}>
              Pause
            </button>
            <div className="header-info">
              <div className="info-wpm" title={speedDisplay.tooltip}>
                {speedDisplay.text}
              </div>
              <div className="info-source">{getSourceDisplay()}</div>
            </div>
          </div>
          <div className="timer">{formatTime(snapshot.remainingMs)}</div>
        </div>
      )}

      {/* Main Display Area */}
      {(sessionPhase === 'countdown' || sessionPhase === 'active') && (
        <div className={`session-display-area ${showVirtualKeyboard ? 'session-display-area-with-keyboard' : ''}`}>
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

      {/* Virtual Keyboard - Mobile only */}
      {showVirtualKeyboard && (
        <VirtualKeyboard
          alphabet={config.effectiveAlphabet}
          mode={config.mode}
          onKeyPress={(key) => {
            input.push({ at: performance.now(), key });
          }}
        />
      )}
      </div>
    </div>
  );
}
