/**
 * SessionRunner - The async conductor that orchestrates morse sessions
 */

import type { Clock } from './clock';
import type { IO, SessionSnapshot } from './io';
import type { InputBus } from './inputBus';
import { runPracticeEmission, runListenEmission, runLiveCopyEmission, type SessionConfig } from './charPrograms';
import { calculateCharacterDurationMs, getInterCharacterSpacingMs } from '../../../core/morse/timing';

/**
 * Character source interface
 */
export interface CharacterSource {
  next(): string;
  reset(): void;
}

/**
 * Simple random character source for testing
 */
export class RandomCharSource implements CharacterSource {
  private readonly chars: string[];

  constructor(alphabet: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789') {
    this.chars = alphabet.split('');
  }

  next(): string {
    return this.chars[Math.floor(Math.random() * this.chars.length)];
  }

  reset(): void {
    // No state to reset for random source
  }
}

/**
 * Session runner interface
 */
export interface SessionRunner {
  /**
   * Start a new session
   */
  start(config: SessionConfig): void;

  /**
   * Stop the current session
   */
  stop(): void;

  /**
   * Pause the current session (between emissions only)
   */
  pause(): void;

  /**
   * Resume a paused session
   */
  resume(): void;

  /**
   * Subscribe to session state updates
   */
  subscribe(fn: (snapshot: SessionSnapshot) => void): () => void;

  /**
   * Get current session snapshot
   */
  getSnapshot(): SessionSnapshot;
}

/**
 * Dependencies for creating a session runner
 */
export type SessionRunnerDeps = {
  clock: Clock;
  io: IO;
  input: InputBus;
  source: CharacterSource;
};

/**
 * Create a new session runner with the given dependencies
 */
export function createSessionRunner(deps: SessionRunnerDeps): SessionRunner {
  // State
  const subscribers = new Set<(snapshot: SessionSnapshot) => void>();
  let snapshot: SessionSnapshot = {
    phase: 'idle',
    currentChar: null,
    previous: [],
    startedAt: null,
    remainingMs: 0,
    emissions: [],
    stats: {
      correct: 0,
      incorrect: 0,
      timeout: 0,
      accuracy: 0
    }
  };
  let abortController: AbortController | null = null;
  let sessionPromise: Promise<void> | null = null;

  // Pause state
  let isPaused = false;
  let pausedAt: number | null = null;
  let totalPausedMs = 0;
  let pauseResolver: (() => void) | null = null;

  // Publish snapshot to all subscribers
  const publish = () => {
    // Create a new object so React detects the change (deep clone)
    const snapshotCopy = {
      ...snapshot,
      previous: [...snapshot.previous],
      emissions: [...snapshot.emissions],
      stats: snapshot.stats ? { ...snapshot.stats } : undefined
    };
    if (deps.io.snapshot) {
      deps.io.snapshot(snapshotCopy);
    }
    subscribers.forEach(fn => fn(snapshotCopy));
  };

  // Update stats from outcome
  const updateStats = (outcome: 'correct' | 'timeout' | 'incorrect') => {
    if (!snapshot.stats) {
      snapshot.stats = { correct: 0, incorrect: 0, timeout: 0, accuracy: 0 };
    }

    switch (outcome) {
      case 'correct':
        snapshot.stats.correct++;
        break;
      case 'timeout':
        snapshot.stats.timeout++;
        break;
      case 'incorrect':
        snapshot.stats.incorrect++;
        break;
    }

    const total = snapshot.stats.correct + snapshot.stats.timeout + snapshot.stats.incorrect;
    snapshot.stats.accuracy = total > 0 ? (snapshot.stats.correct / total) * 100 : 0;
  };

  // Main conductor function
  async function run(config: SessionConfig, signal: AbortSignal): Promise<void> {
    const startTime = deps.clock.now();

    // Reset pause state at session start
    isPaused = false;
    pausedAt = null;
    totalPausedMs = 0;
    pauseResolver = null;

    try {
      // Initialize session state
      snapshot = {
        phase: 'running',
        currentChar: null,
        previous: [],
        startedAt: startTime,
        remainingMs: config.lengthMs,
        emissions: [],
        stats: {
          correct: 0,
          incorrect: 0,
          timeout: 0,
          accuracy: 0
        }
      };
      publish();

      // Log session start
      deps.io.log({
        type: 'sessionStart',
        at: startTime,
        config
      });

      // Reset the character source
      deps.source.reset();

      // Main session loop
      while (!signal.aborted) {
        // Check if paused and wait for resume
        if (isPaused) {
          snapshot.phase = 'paused';
          publish();

          // Wait for resume
          await new Promise<void>(resolve => {
            pauseResolver = resolve;
          });

          // Clear resolver after resume
          pauseResolver = null;

          // Session might have been stopped while paused
          if (signal.aborted) break;
        }

        // Check time budget before starting new emission (accounting for paused time)
        const elapsed = (deps.clock.now() - startTime) - totalPausedMs;
        const remaining = config.lengthMs - elapsed;

        if (remaining <= 0) {
          break; // Time's up
        }

        // Update remaining time
        snapshot.remainingMs = Math.max(0, remaining);

        // Get next character
        const char = deps.source.next();
        snapshot.currentChar = char;

        // Record emission timing (for all modes)
        const emissionStartTime = deps.clock.now();

        // Calculate total emission duration: character audio + inter-character spacing
        const charAudioDurationMs = calculateCharacterDurationMs(char, config.wpm);
        const interCharSpacingMs = getInterCharacterSpacingMs(config.wpm);
        const totalEmissionDurationMs = charAudioDurationMs + interCharSpacingMs;

        snapshot.emissions.push({
          char,
          startTime: emissionStartTime,
          duration: totalEmissionDurationMs
        });

        publish();

        try {
          // Run emission based on mode
          switch (config.mode) {
            case 'practice': {
              const outcome = await runPracticeEmission(
                config,
                char,
                deps.io,
                deps.input,
                deps.clock,
                signal
              );
              updateStats(outcome);

              // Update history IMMEDIATELY
              const historyItem = { char, result: outcome as 'correct' | 'incorrect' | 'timeout' };
              snapshot.previous = [...snapshot.previous, historyItem];
              snapshot.currentChar = null;

              // Update remaining time (accounting for paused time)
              const newElapsed = (deps.clock.now() - startTime) - totalPausedMs;
              snapshot.remainingMs = Math.max(0, config.lengthMs - newElapsed);

              // Publish immediately so UI updates right away
              publish();

              // Handle replay AFTER history update (for incorrect or timeout)
              if (config.replay && (outcome === 'incorrect' || outcome === 'timeout') && deps.io.replay) {
                console.log(`[Session] Replaying character '${char}' after ${outcome}`);
                await deps.io.replay(char, config.wpm);
              }
              break;
            }

            case 'listen': {
              await runListenEmission(
                config,
                char,
                deps.io,
                deps.clock,
                signal
              );

              // For listen mode, add to history after emission
              const historyItem = { char, result: 'listen' as const };
              snapshot.previous = [...snapshot.previous, historyItem];
              snapshot.currentChar = null;

              // Update remaining time (accounting for paused time)
              const newElapsed = (deps.clock.now() - startTime) - totalPausedMs;
              snapshot.remainingMs = Math.max(0, config.lengthMs - newElapsed);

              // Publish snapshot
              publish();
              break;
            }

            case 'live-copy': {
              // Live Copy mode - transmission only, no input handling
              await runLiveCopyEmission(
                config,
                char,
                deps.io,
                deps.clock,
                signal
              );

              // Clear current character after emission
              snapshot.currentChar = null;

              // Update remaining time (accounting for paused time)
              const newElapsed = (deps.clock.now() - startTime) - totalPausedMs;
              snapshot.remainingMs = Math.max(0, config.lengthMs - newElapsed);

              // Publish immediately so UI can update
              publish();
              break;
            }
          }

          // Add inter-character spacing for practice mode
          // This provides a pause between practice attempts, giving users a moment before the next character
          // Listen and Live Copy modes handle their spacing internally within their emission functions
          if (config.mode === 'practice') {
            const interCharSpacingMs = getInterCharacterSpacingMs(config.wpm);
            console.log(`[Spacing] Adding inter-character spacing: ${interCharSpacingMs}ms (3 dits)`);
            await deps.clock.sleep(interCharSpacingMs, signal);
          }

        } catch (error) {
          // Handle abort
          if ((error as Error)?.name === 'AbortError') {
            break;
          }
          // Log other errors but continue session
          console.error('Emission error:', error);
        }
      }
    } finally {
      // Session ended - always run cleanup
      snapshot.phase = 'ended';
      snapshot.currentChar = null;
      publish();

      // Log session end
      deps.io.log({
        type: 'sessionEnd',
        at: deps.clock.now()
      });
    }
  }

  return {
    start(config: SessionConfig): void {
      // Stop any existing session
      if (abortController) {
        this.stop();
      }

      // Create new abort controller
      abortController = new AbortController();

      // Start the conductor
      sessionPromise = run(config, abortController.signal)
        .catch(error => {
          if (error?.name !== 'AbortError') {
            console.error('Session error:', error);
          }
        })
        .finally(() => {
          abortController = null;
          sessionPromise = null;
        });
    },

    async stop(): Promise<void> {
      // Reset pause state when stopping
      isPaused = false;
      pausedAt = null;
      totalPausedMs = 0;

      if (abortController) {
        abortController.abort();
        abortController = null;
      }
      // Wait for the session to actually end
      if (sessionPromise) {
        await sessionPromise;
      }
    },

    pause(): void {
      // Only pause if running
      if (!isPaused && snapshot.phase === 'running') {
        isPaused = true;
        pausedAt = deps.clock.now();
        console.log('[Session] Paused at', pausedAt);
      }
    },

    resume(): void {
      // Only resume if paused
      if (isPaused && pausedAt !== null) {
        const pauseDuration = deps.clock.now() - pausedAt;
        totalPausedMs += pauseDuration;
        console.log('[Session] Resumed after', pauseDuration, 'ms pause. Total paused:', totalPausedMs, 'ms');

        isPaused = false;
        pausedAt = null;
        snapshot.phase = 'running';

        // Unblock the session loop
        if (pauseResolver) {
          pauseResolver();
        }

        publish();
      }
    },

    subscribe(fn: (snapshot: SessionSnapshot) => void): () => void {
      subscribers.add(fn);
      fn(snapshot); // Send current state immediately
      return () => subscribers.delete(fn);
    },

    getSnapshot(): SessionSnapshot {
      return snapshot;
    }
  };
}