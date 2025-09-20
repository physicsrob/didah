/**
 * Study Page Component
 *
 * Main interface for Morse code practice sessions with session controls,
 * character display, and input capture.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { DefaultSessionController, type SessionController } from '../features/session/SessionController.js';
import { AudioEffectHandler } from '../features/session/effects.js';
import { RandomLettersSource } from '../features/sources/providers/randomLetters.js';
import { DEFAULT_AUDIO_CONFIG } from '../features/session/services/audioEngine.js';
import type { SessionConfig } from '../core/types/domain.js';
import type { SessionPhase } from '../features/session/types.js';

// Default session configuration
const DEFAULT_SESSION_CONFIG: SessionConfig = {
  mode: 'active',
  lengthMs: 60000, // 1 minute
  speedTier: 'medium',
  sourceId: 'randomLetters',
  feedback: 'flash',
  replay: true,
  effectiveAlphabet: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'],
  wpm: 5,  // Slowed down for debugging
};

export function StudyPage() {
  const [sessionController, setSessionController] = useState<SessionController | null>(null);
  const [audioHandler, setAudioHandler] = useState<AudioEffectHandler | null>(null);
  const [phase, setPhase] = useState<SessionPhase>('idle');
  const [previousCharacters, setPreviousCharacters] = useState<string[]>([]);
  const [currentCharacter, setCurrentCharacter] = useState<string>('');
  const [isRevealed, setIsRevealed] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [isAudioInitialized, setIsAudioInitialized] = useState(false);

  // Initialize session controller and audio
  useEffect(() => {
    const characterSource = new RandomLettersSource({
      includeNumbers: false,
      includeStandardPunctuation: false,
      includeAdvancedPunctuation: false,
    });

    const audio = new AudioEffectHandler(DEFAULT_AUDIO_CONFIG);

    // Set up audio completion callback
    audio.onAudioEnded = (emissionId: string) => {
      // This will be called when audio finishes
      // We'll need to pass this to the controller somehow
    };

    // Set up effect handlers
    const audioHandlers = audio.getHandlers();
    const handlers = {
      ...audioHandlers,
      onRevealCharacter: (char: string) => {
        setCurrentCharacter(char);
        setIsRevealed(true);
      },
      onHideCharacter: () => {
        setIsRevealed(false);
      },
      onShowFeedback: (feedbackType: string, char: string) => {
        // Add CSS class for visual feedback
        document.body.classList.add(`morse-flash-${feedbackType}-medium`);
        setTimeout(() => {
          document.body.classList.remove(`morse-flash-${feedbackType}-medium`);
        }, 150);
      },
    };

    const controller = new DefaultSessionController(handlers, characterSource);

    // Store the audio completion callback in the controller
    // We need to fix this - the controller needs to be able to call handleEvent
    audio.onAudioEnded = (emissionId: string) => {
      controller.sendEvent({ type: 'audioEnded', emissionId });
    };

    // We'll poll the controller state for now
    // In a real app, we'd want to add a proper observer pattern to the controller
    const pollInterval = setInterval(() => {
      if (controller) {
        setPhase(controller.getPhase());
        setPreviousCharacters([...controller.getPreviousCharacters()]);

        const currentChar = controller.getCurrentCharacter();
        if (currentChar) {
          setCurrentCharacter(currentChar);
          // In active mode, character is immediately visible
          setIsRevealed(DEFAULT_SESSION_CONFIG.mode === 'active');
        }
      }
    }, 100);

    setSessionController(controller);
    setAudioHandler(audio);

    return () => {
      clearInterval(pollInterval);
      controller.stop();
      audio.dispose();
    };
  }, []);

  // Initialize audio context on user interaction
  const initializeAudio = useCallback(async () => {
    if (audioHandler && !isAudioInitialized) {
      try {
        await audioHandler.initialize();
        setIsAudioInitialized(true);
      } catch (error) {
        console.error('Failed to initialize audio:', error);
      }
    }
  }, [audioHandler, isAudioInitialized]);

  // Start session
  const startSession = useCallback(async () => {
    if (!sessionController) return;

    await initializeAudio();
    sessionController.start(DEFAULT_SESSION_CONFIG);
  }, [sessionController, initializeAudio]);

  // Stop session
  const stopSession = useCallback(() => {
    if (!sessionController) return;
    sessionController.stop();
  }, [sessionController]);

  // Handle keypress
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (!sessionController || (phase !== 'emitting' && phase !== 'awaitingInput')) return;

    const key = event.key.toUpperCase();
    if (/^[A-Z]$/.test(key)) {
      sessionController.sendEvent({
        type: 'keypress',
        key,
        timestamp: Date.now(),
      });
    }
  }, [sessionController, phase]);

  // Set up keyboard listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Session timer
  useEffect(() => {
    if (phase === 'idle' || phase === 'ended') {
      setSessionTime(0);
      return;
    }

    const interval = setInterval(() => {
      setSessionTime(t => t + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [phase]);

  return (
    <div className="study-page">
      <style>{`
        .study-page {
          max-width: 800px;
          margin: 0 auto;
          padding: 2rem;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
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
          min-height: 200px;
        }

        .session-hud {
          display: flex;
          justify-content: space-between;
          margin-bottom: 1rem;
          font-size: 0.9rem;
          color: #ccc;
        }

        .character-display {
          text-align: center;
          margin: 2rem 0;
        }

        .current-character {
          font-size: 4rem;
          font-weight: bold;
          font-family: 'Courier New', monospace;
          margin-bottom: 1rem;
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
          min-height: 40px;
          overflow-wrap: break-word;
        }

        .instructions {
          text-align: center;
          color: #999;
          font-style: italic;
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
        .phase-emitting { background: #ff9800; color: white; }
        .phase-awaitingInput { background: #2196F3; color: white; }
        .phase-ended { background: #4CAF50; color: white; }

        /* Flash feedback styles */
        .morse-flash-error-medium {
          background-color: rgba(255, 0, 0, 0.2);
          transition: background-color 0.05s ease-out;
        }

        .morse-flash-correct-medium {
          background-color: rgba(0, 255, 0, 0.2);
          transition: background-color 0.05s ease-out;
        }

        .morse-flash-timeout-medium {
          background-color: rgba(255, 165, 0, 0.2);
          transition: background-color 0.05s ease-out;
        }
      `}</style>

      <h1>Morse Code Practice</h1>

      <div className="session-controls">
        <h2>Session Controls</h2>
        <div className="controls-row">
          {phase === 'idle' || phase === 'ended' ? (
            <button className="start-btn" onClick={startSession}>
              Start Practice Session
            </button>
          ) : (
            <button className="stop-btn" onClick={stopSession}>
              Stop Session
            </button>
          )}

          <span className={`phase-indicator phase-${phase}`}>
            {phase}
          </span>

          {!isAudioInitialized && (
            <span style={{ color: '#ff9800', fontSize: '0.9rem' }}>
              Click Start to initialize audio
            </span>
          )}
        </div>
      </div>

      <div className="session-display">
        <div className="session-hud">
          <span>Time: {Math.floor(sessionTime / 60)}:{(sessionTime % 60).toString().padStart(2, '0')}</span>
          <span>Mode: Active | Medium Speed | 20 WPM</span>
          <span>Accuracy: {accuracy}%</span>
        </div>

        <div className="character-display">
          <div className={`current-character ${!isRevealed ? 'hidden' : ''}`}>
            {currentCharacter || '·'}
          </div>

          {phase === 'idle' && (
            <div className="instructions">
              Click "Start Practice Session" to begin
            </div>
          )}

          {(phase === 'emitting' || phase === 'awaitingInput') && (
            <div className="instructions">
              Type the character you hear: {isRevealed ? currentCharacter : '?'}
            </div>
          )}
        </div>

        <div className="previous-characters">
          <strong>Previous characters:</strong><br />
          {previousCharacters.join(' ') || 'None yet'}
        </div>
      </div>
    </div>
  );
}