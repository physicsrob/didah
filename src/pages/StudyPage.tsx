/**
 * Study Page Component (New Runtime Version)
 *
 * Main interface for Morse code practice sessions using the new SessionRunner runtime.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { SystemClock } from '../features/session/runtime/clock.js';
import { SimpleInputBus } from '../features/session/runtime/inputBus.js';
import { createIOAdapter } from '../features/session/runtime/ioAdapter.js';
import type { SessionSnapshot } from '../features/session/runtime/io.js';
import { createSessionRunner } from '../features/session/runtime/sessionProgram.js';
import { RandomCharSource } from '../features/session/runtime/sessionProgram.js';
import { AudioEngine, DEFAULT_AUDIO_CONFIG } from '../features/session/services/audioEngine.js';
import { createFeedback } from '../features/session/services/feedback/index.js';
import type { SessionConfig } from '../core/types/domain.js';

// Default session configuration
const DEFAULT_SESSION_CONFIG: SessionConfig = {
  mode: 'active',
  lengthMs: 60000, // 1 minute
  speedTier: 'medium',
  sourceId: 'randomLetters',
  feedback: 'flash',
  replay: true,
  effectiveAlphabet: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],
  wpm: 20,  // Standard speed
};

export function StudyPage() {
  const [snapshot, setSnapshot] = useState<SessionSnapshot>({
    phase: 'idle',
    currentChar: null,
    previous: [],
    startedAt: null,
    remainingMs: 0,
    stats: { correct: 0, incorrect: 0, timeout: 0, accuracy: 0 },
  });

  const [revealedChar, setRevealedChar] = useState<string | null>(null);
  const [replayOverlay] = useState<string | null>(null);
  const [feedbackFlash, setFeedbackFlash] = useState<string | null>(null);
  const [isAudioInitialized, setIsAudioInitialized] = useState(false);

  // Create runtime dependencies
  const clock = useMemo(() => new SystemClock(), []);
  const input = useMemo(() => new SimpleInputBus(), []);
  const audioEngine = useMemo(() => new AudioEngine(DEFAULT_AUDIO_CONFIG), []);
  const feedback = useMemo(() => createFeedback('flash'), []); // Can be 'buzzer', 'flash', or 'both'

  const source = useMemo(() => new RandomCharSource(DEFAULT_SESSION_CONFIG.effectiveAlphabet.join('')), []);

  // Create IO adapter
  const io = useMemo(() => {
    return createIOAdapter({
      audioEngine,
      feedback,
      onReveal: (char: string) => setRevealedChar(char),
      onHide: () => setRevealedChar(null),
      onSnapshot: (snap: SessionSnapshot) => setSnapshot(snap),
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

  // Initialize audio context on user interaction
  const initializeAudio = useCallback(async () => {
    if (!isAudioInitialized) {
      try {
        await audioEngine.initialize();
        setIsAudioInitialized(true);
      } catch (error) {
        console.error('Failed to initialize audio:', error);
      }
    }
  }, [audioEngine, isAudioInitialized]);

  // Start session
  const startSession = useCallback(async () => {
    await initializeAudio();
    // Update audio engine with session WPM before starting
    audioEngine.updateConfig({ wpm: DEFAULT_SESSION_CONFIG.wpm });
    runner.start(DEFAULT_SESSION_CONFIG);
  }, [runner, initializeAudio, audioEngine]);

  // Stop session
  const stopSession = useCallback(() => {
    runner.stop();
  }, [runner]);

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

  return (
    <div className={`study-page ${feedbackFlash ? `morse-flash-${feedbackFlash}` : ''}`}>
      <style>{`
        .study-page {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          min-height: 100vh;
          transition: background-color 0.15s ease-out;
        }

        .session-controls {
          background: #f5f5f5;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 2rem;
        }

        .session-controls h2 {
          margin: 0 0 1rem 0;
          color: #333;
        }

        .controls-row {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        button {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 1rem;
        }

        .start-btn {
          background: #4CAF50;
          color: white;
        }

        .start-btn:hover {
          background: #45a049;
        }

        .stop-btn {
          background: #f44336;
          color: white;
        }

        .stop-btn:hover {
          background: #da190b;
        }

        .session-display {
          background: #1a1a1a;
          color: #fff;
          padding: 2rem;
          border-radius: 8px;
          margin-bottom: 2rem;
          min-height: 300px;
          position: relative;
        }

        .session-hud {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1rem;
          font-size: 0.9rem;
          color: #ccc;
        }

        .hud-item {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .hud-label {
          font-size: 0.8rem;
          opacity: 0.8;
        }

        .hud-value {
          font-size: 1.1rem;
          font-weight: bold;
        }

        .character-display {
          text-align: center;
          margin: 2rem 0;
        }

        .current-character {
          font-size: 5rem;
          font-weight: bold;
          font-family: 'Courier New', monospace;
          margin-bottom: 1rem;
          min-height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .current-character.hidden {
          color: #555;
        }

        .previous-characters {
          font-family: 'Courier New', monospace;
          font-size: 1.2rem;
          background: #333;
          padding: 1rem;
          border-radius: 4px;
          min-height: 60px;
          overflow-wrap: break-word;
          letter-spacing: 0.2em;
        }

        .instructions {
          text-align: center;
          color: #999;
          font-style: italic;
          margin-top: 1rem;
        }

        .phase-indicator {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: bold;
          text-transform: uppercase;
        }

        .phase-idle { background: #666; color: white; }
        .phase-running { background: #2196F3; color: white; }
        .phase-ended { background: #4CAF50; color: white; }

        .stats-bar {
          display: flex;
          gap: 2rem;
          justify-content: center;
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #444;
        }

        .stat-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .stat-label {
          color: #999;
          font-size: 0.9rem;
        }

        .stat-value {
          font-weight: bold;
          font-size: 1.1rem;
        }

        .stat-value.correct { color: #4CAF50; }
        .stat-value.incorrect { color: #f44336; }
        .stat-value.timeout { color: #ff9800; }

        /* Flash feedback styles */
        .morse-flash-incorrect {
          background-color: rgba(255, 67, 54, 0.2);
        }

        .morse-flash-correct {
          background-color: rgba(76, 175, 80, 0.2);
        }

        .morse-flash-timeout {
          background-color: rgba(255, 152, 0, 0.2);
        }

        /* Replay overlay */
        .replay-overlay {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0, 0, 0, 0.9);
          color: white;
          font-size: 8rem;
          font-weight: bold;
          padding: 2rem 4rem;
          border-radius: 16px;
          z-index: 1000;
          font-family: 'Courier New', monospace;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }

        .config-info {
          background: #2a2a2a;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          font-size: 0.9rem;
          color: #aaa;
        }

        .config-info span {
          margin: 0 0.5rem;
        }
      `}</style>

      <h1>Morse Code Practice (New Runtime)</h1>

      <div className="session-controls">
        <h2>Session Controls</h2>
        <div className="controls-row">
          {snapshot.phase === 'idle' || snapshot.phase === 'ended' ? (
            <button className="start-btn" onClick={startSession}>
              Start Practice Session
            </button>
          ) : (
            <button className="stop-btn" onClick={stopSession}>
              Stop Session
            </button>
          )}

          <span className={`phase-indicator phase-${snapshot.phase}`}>
            {snapshot.phase}
          </span>

          {!isAudioInitialized && (
            <span style={{ color: '#ff9800', fontSize: '0.9rem' }}>
              Click Start to initialize audio
            </span>
          )}
        </div>

        <div className="config-info" style={{ marginTop: '1rem' }}>
          <span>📝 Mode: {DEFAULT_SESSION_CONFIG.mode}</span>
          <span>⚡ Speed: {DEFAULT_SESSION_CONFIG.speedTier}</span>
          <span>📡 WPM: {DEFAULT_SESSION_CONFIG.wpm}</span>
          <span>⏱️ Duration: {DEFAULT_SESSION_CONFIG.lengthMs / 1000}s</span>
        </div>
      </div>

      <div className="session-display">
        <div className="session-hud">
          <div className="hud-item">
            <span className="hud-label">Time Remaining</span>
            <span className="hud-value">{formatTime(snapshot.remainingMs)}</span>
          </div>
          <div className="hud-item">
            <span className="hud-label">Accuracy</span>
            <span className="hud-value">{accuracy}%</span>
          </div>
          <div className="hud-item">
            <span className="hud-label">Characters</span>
            <span className="hud-value">{snapshot.previous.length}</span>
          </div>
        </div>

        <div className="character-display">
          <div className={`current-character ${DEFAULT_SESSION_CONFIG.mode === 'passive' && !revealedChar ? 'hidden' : ''}`}>
            {DEFAULT_SESSION_CONFIG.mode === 'active'
              ? (snapshot.currentChar || '·')
              : (revealedChar || (snapshot.currentChar ? '?' : '·'))
            }
          </div>

          {snapshot.phase === 'idle' && (
            <div className="instructions">
              Click "Start Practice Session" to begin
            </div>
          )}

          {snapshot.phase === 'running' && DEFAULT_SESSION_CONFIG.mode === 'active' && (
            <div className="instructions">
              Type the character you hear
            </div>
          )}

          {snapshot.phase === 'running' && DEFAULT_SESSION_CONFIG.mode === 'passive' && (
            <div className="instructions">
              Listen and watch for the character reveal
            </div>
          )}

          {snapshot.phase === 'ended' && (
            <div className="instructions">
              Session complete! {accuracy}% accuracy
            </div>
          )}
        </div>

        <div className="previous-characters">
          {snapshot.previous.length > 0 ? snapshot.previous.join(' ') : 'Previous characters will appear here'}
        </div>

        {snapshot.phase !== 'idle' && (
          <div className="stats-bar">
            <div className="stat-item">
              <span className="stat-label">Correct:</span>
              <span className="stat-value correct">{snapshot.stats?.correct ?? 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Incorrect:</span>
              <span className="stat-value incorrect">{snapshot.stats?.incorrect ?? 0}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Timeout:</span>
              <span className="stat-value timeout">{snapshot.stats?.timeout ?? 0}</span>
            </div>
          </div>
        )}
      </div>

      {/* Replay overlay */}
      {replayOverlay && (
        <div className="replay-overlay">
          {replayOverlay}
        </div>
      )}
    </div>
  );
}