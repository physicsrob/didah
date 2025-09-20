/**
 * SessionRunner - The async conductor that orchestrates morse sessions
 */

import type { Clock } from './clock';
import type { IO, SessionSnapshot } from './io';
import type { InputBus } from './inputBus';
import { runActiveEmission, runPassiveEmission, type SessionConfig } from './charPrograms';

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
  let subscribers = new Set<(snapshot: SessionSnapshot) => void>();
  let snapshot: SessionSnapshot = {
    phase: 'idle',
    currentChar: null,
    previous: [],
    startedAt: null,
    remainingMs: 0,
    stats: {
      correct: 0,
      incorrect: 0,
      timeout: 0,
      accuracy: 0
    }
  };
  let abortController: AbortController | null = null;
  let sessionPromise: Promise<void> | null = null;

  // Publish snapshot to all subscribers
  const publish = () => {
    if (deps.io.snapshot) {
      deps.io.snapshot(snapshot);
    }
    subscribers.forEach(fn => fn(snapshot));
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

    try {
      // Initialize session state
      snapshot = {
        phase: 'running',
        currentChar: null,
        previous: [],
        startedAt: startTime,
        remainingMs: config.lengthMs,
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
        // Check time budget before starting new emission
        const elapsed = deps.clock.now() - startTime;
        const remaining = config.lengthMs - elapsed;

        if (remaining <= 0) {
          break; // Time's up
        }

        // Update remaining time
        snapshot.remainingMs = Math.max(0, remaining);

        // Get next character
        const char = deps.source.next();
        snapshot.currentChar = char;
        publish();

        try {
          // Run emission based on mode
          if (config.mode === 'active') {
            const outcome = await runActiveEmission(
              config,
              char,
              deps.io,
              deps.input,
              deps.clock,
              signal
            );
            updateStats(outcome);
          } else {
            await runPassiveEmission(
              config,
              char,
              deps.io,
              deps.clock,
              signal
            );
          }

          // Move character to previous list
          snapshot.previous = [...snapshot.previous, char];
          snapshot.currentChar = null;

          // Update remaining time
          const newElapsed = deps.clock.now() - startTime;
          snapshot.remainingMs = Math.max(0, config.lengthMs - newElapsed);
          publish();

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
      if (abortController) {
        abortController.abort();
        abortController = null;
      }
      // Wait for the session to actually end
      if (sessionPromise) {
        await sessionPromise;
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