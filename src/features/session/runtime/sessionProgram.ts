/**
 * SessionRunner - The async conductor that orchestrates morse sessions
 */

import type { Clock } from './clock';
import type { IO, SessionSnapshot } from './io';
import type { InputBus } from './inputBus';
import type { SessionConfig } from '../../../core/types/domain';
import { calculateCharacterDurationMs, getInterCharacterSpacingMs } from '../../../core/morse/timing';
import { debug } from '../../../core/debug';
import { getMode } from '../modes/shared/registry';
import type { HandlerContext } from '../modes/shared/types';

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

  /**
   * Update snapshot from UI (for mode-specific state)
   */
  updateSnapshot(updates: Partial<SessionSnapshot>): void;
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
    startedAt: null,
    remainingMs: 0,
    emissions: []
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
    const snapshotCopy: SessionSnapshot = {
      ...snapshot,
      emissions: [...snapshot.emissions],
      practiceState: snapshot.practiceState ? {
        previous: [...snapshot.practiceState.previous],
        stats: { ...snapshot.practiceState.stats }
      } : undefined,
      liveCopyState: snapshot.liveCopyState ? {
        typedString: snapshot.liveCopyState.typedString
      } : undefined,
      wordPracticeState: snapshot.wordPracticeState ? {
        ...snapshot.wordPracticeState,
        distractors: [...snapshot.wordPracticeState.distractors],
        stats: { ...snapshot.wordPracticeState.stats }
      } : undefined
    };
    if (deps.io.snapshot) {
      deps.io.snapshot(snapshotCopy);
    }
    subscribers.forEach(fn => fn(snapshotCopy));
  };

  // Update stats from outcome (Practice mode only)
  const updateStats = (outcome: 'correct' | 'timeout' | 'incorrect') => {
    if (!snapshot.practiceState) {
      throw new Error('updateStats called but practiceState not initialized');
    }

    switch (outcome) {
      case 'correct':
        snapshot.practiceState.stats.correct++;
        break;
      case 'timeout':
        snapshot.practiceState.stats.timeout++;
        break;
      case 'incorrect':
        snapshot.practiceState.stats.incorrect++;
        break;
    }

    const stats = snapshot.practiceState.stats;
    const total = stats.correct + stats.timeout + stats.incorrect;
    stats.accuracy = total > 0 ? (stats.correct / total) * 100 : 0;
  };

  // Initialize session state and reset pause tracking
  function initializeSession(startTime: number, config: SessionConfig): void {
    // Reset pause state at session start
    isPaused = false;
    pausedAt = null;
    totalPausedMs = 0;
    pauseResolver = null;

    // Initialize session state with mode-specific state
    snapshot = {
      phase: 'running',
      startedAt: startTime,
      remainingMs: config.lengthMs,
      emissions: [],
      // Initialize mode-specific state based on mode
      practiceState: config.mode === 'practice' ? {
        previous: [],
        stats: {
          correct: 0,
          incorrect: 0,
          timeout: 0,
          accuracy: 0
        }
      } : undefined,
      liveCopyState: config.mode === 'live-copy' ? {
        typedString: ''
      } : undefined,
      wordPracticeState: config.mode === 'word-practice' ? {
        currentWord: null,
        distractors: [],
        buttonWords: [],
        isPlaying: false,
        flashResult: null,
        clickedWord: null,
        stats: {
          attempts: 0,
          successes: 0,
          accuracy: 0
        }
      } : undefined
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
  }

  // Wait for session to be resumed if paused
  async function waitForResume(): Promise<void> {
    if (!isPaused) return;

    snapshot.phase = 'paused';
    publish();

    // Wait for resume
    await new Promise<void>(resolve => {
      pauseResolver = resolve;
    });

    // Clear resolver after resume
    pauseResolver = null;
  }

  // Check if session still has time remaining and update the remaining time in snapshot.
  // Returns true if session should continue, false if time is up.
  // Accounts for paused time so the session timer effectively pauses when session is paused.
  function checkSessionTime(startTime: number, config: SessionConfig): boolean {
    const elapsed = (deps.clock.now() - startTime) - totalPausedMs;
    const remaining = config.lengthMs - elapsed;

    // Update remaining time in snapshot
    snapshot.remainingMs = Math.max(0, remaining);

    return remaining > 0;
  }

  // Prepare for a new character emission by updating snapshot with character and timing info.
  // Records the character, start time, and calculated duration for statistics tracking.
  function prepareEmission(char: string, config: SessionConfig): void {
    // Record emission timing (for all modes)
    const emissionStartTime = deps.clock.now();

    // Calculate total emission duration: character audio + inter-character spacing
    const charAudioDurationMs = calculateCharacterDurationMs(char, config.wpm, config.extraWordSpacing);
    const interCharSpacingMs = getInterCharacterSpacingMs(config.wpm);
    const totalEmissionDurationMs = charAudioDurationMs + interCharSpacingMs;

    snapshot.emissions.push({
      char,
      startTime: emissionStartTime,
      duration: totalEmissionDurationMs
    });

    publish();
  }

  // Update remaining time after an emission completes.
  // Accounts for paused time to ensure timer effectively pauses when session is paused.
  function updateRemainingTime(startTime: number, config: SessionConfig): void {
    const newElapsed = (deps.clock.now() - startTime) - totalPausedMs;
    snapshot.remainingMs = Math.max(0, config.lengthMs - newElapsed);
  }

  // Perform session cleanup when session ends
  function cleanupSession(): void {
    // Log session end BEFORE publishing 'ended' phase
    // This ensures the sessionEnd event is in the collector before stats are calculated
    deps.io.log({
      type: 'sessionEnd',
      at: deps.clock.now()
    });

    snapshot.phase = 'ended';
    publish();
  }

  // Main conductor function
  async function run(config: SessionConfig, signal: AbortSignal): Promise<void> {
    const startTime = deps.clock.now();
    initializeSession(startTime, config);

    try {

      // Main session loop
      while (!signal.aborted) {
        // Check if paused and wait for resume
        await waitForResume();

        // Session might have been stopped while paused
        if (signal.aborted) break;

        // Check time budget before starting new emission
        if (!checkSessionTime(startTime, config)) {
          break; // Time's up
        }

        // Get next character and prepare emission
        const char = deps.source.next();
        prepareEmission(char, config);

        try {
          // Get mode implementation
          const mode = getMode(config.mode);

          // Create handler context
          const ctx: HandlerContext = {
            ...deps,
            snapshot,
            updateSnapshot: (updates) => {
              snapshot = { ...snapshot, ...updates };
            },
            updateStats,
            updateRemainingTime,
            publish,
          };

          // Delegate to mode handler
          await mode.handleCharacter(config, char, startTime, ctx, signal);

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
      cleanupSession();
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
        debug.log('[Session] Paused at', pausedAt);
      }
    },

    resume(): void {
      // Only resume if paused
      if (isPaused && pausedAt !== null) {
        const pauseDuration = deps.clock.now() - pausedAt;
        totalPausedMs += pauseDuration;
        debug.log('[Session] Resumed after', pauseDuration, 'ms pause. Total paused:', totalPausedMs, 'ms');

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
    },

    updateSnapshot(updates: Partial<SessionSnapshot>): void {
      snapshot = { ...snapshot, ...updates };
      publish();
    }
  };
}