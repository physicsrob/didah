import type { SessionContext, SessionEvent, TransitionResult, Effect, CharacterSource } from './types.js';
import { getActiveWindowMs, getPassiveTimingMs } from '../../core/morse/timing.js';
import type { Emission, SessionConfig } from '../../core/types/domain.js';

export function transition(context: SessionContext, event: SessionEvent, characterSource?: CharacterSource): TransitionResult {
  const effects: Effect[] = [];

  switch (context.phase) {
    case 'idle':
    case 'ended':
      if (event.type === 'start') {
        const newContext: SessionContext = {
          ...context,
          phase: 'emitting',
          config: event.config,
          startedAt: Date.now(),
          sessionId: Math.random().toString(36),
          epoch: context.epoch + 1, // Increment epoch on session start
          activeTimeouts: {}
        };

        // Start first emission
        const firstEmission = createEmission(event.config, characterSource);
        newContext.currentEmission = firstEmission;

        effects.push(
          { type: 'playAudio', char: firstEmission.char, emissionId: firstEmission.id },
          { type: 'logEvent', event: firstEmission }
        );

        // Schedule appropriate timeout based on mode
        if (event.config.mode === 'active') {
          const windowMs = getActiveWindowMs(event.config.wpm, event.config.speedTier);
          effects.push({ type: 'startRecognitionTimeout', delayMs: windowMs });
        } else {
          // Passive mode - hide character initially and schedule reveal
          effects.push({ type: 'hideCharacter' });
          const delays = getPassiveTimingMs(event.config.wpm, event.config.speedTier);
          effects.push({ type: 'startRevealTimeout', delayMs: delays.preRevealMs });
        }

        return { context: newContext, effects };
      }
      break;

    case 'emitting':
      if (event.type === 'audioEnded') {
        if (!context.config || !context.currentEmission) {
          return { context, effects };
        }

        if (context.config.mode === 'active') {
          // Active mode - transition to awaiting input (recognition timeout still running)
          return {
            context: { ...context, phase: 'awaitingInput' },
            effects
          };
        } else {
          // Passive mode - already scheduled reveal timeout when emission started
          return {
            context: { ...context, phase: 'preRevealDelay' },
            effects
          };
        }
      }

      if (event.type === 'keypress' && context.config?.mode === 'active') {
        return handleActiveInput(context, event, effects, characterSource);
      }

      if (event.type === 'timeout' && event.kind === 'window') {
        // Recognition window expired during emission
        return transitionToFeedback(context, effects, 'timeout');
      }
      break;

    case 'awaitingInput':
      if (event.type === 'keypress') {
        return handleActiveInput(context, event, effects, characterSource);
      }

      if (event.type === 'timeout' && event.kind === 'window') {
        // Recognition window expired
        return transitionToFeedback(context, effects, 'timeout');
      }
      break;

    case 'feedback':
      if (event.type === 'timeout' && event.kind === 'feedback') {
        // Feedback duration complete - advance to next
        return advanceToNextCharacter(context, effects, characterSource);
      }

      if (event.type === 'advance') {
        // Manual advance (for correct answers that skip feedback)
        return advanceToNextCharacter(context, effects, characterSource);
      }
      break;

    case 'preRevealDelay':
      if (event.type === 'timeout' && event.kind === 'preReveal') {
        // Time to reveal character
        if (!context.currentEmission || !context.config) {
          return { context, effects };
        }

        effects.push({ type: 'revealCharacter', char: context.currentEmission.char });

        // Schedule post-reveal delay
        const delays = getPassiveTimingMs(context.config.wpm, context.config.speedTier);
        effects.push({ type: 'startPostRevealTimeout', delayMs: delays.postRevealMs });

        return {
          context: { ...context, phase: 'reveal' },
          effects
        };
      }
      break;

    case 'reveal':
      if (event.type === 'timeout' && event.kind === 'postReveal') {
        // Post-reveal delay complete - advance to next
        return advanceToNextCharacter(context, effects, characterSource);
      }
      break;

    case 'postRevealDelay':
      if (event.type === 'timeout' && event.kind === 'postReveal') {
        return advanceToNextCharacter(context, effects, characterSource);
      }
      break;

    default:
      break;
  }

  // Handle end event from any state
  if (event.type === 'end') {
    effects.push(
      { type: 'cancelAllTimeouts' },
      { type: 'endSession', reason: event.reason }
    );

    return {
      context: {
        ...context,
        phase: 'ended',
        epoch: context.epoch + 1, // Increment epoch on session end
        activeTimeouts: {}
      },
      effects
    };
  }

  return { context, effects };
}

function handleActiveInput(
  context: SessionContext,
  event: { type: 'keypress'; key: string; timestamp: number },
  effects: Effect[],
  characterSource?: CharacterSource
): TransitionResult {
  if (!context.currentEmission || !context.config) {
    return { context, effects };
  }

  // Check if input is within the allowed window
  const windowMs = getActiveWindowMs(context.config.wpm, context.config.speedTier);
  const windowEnd = context.currentEmission.startedAt + windowMs;
  const withinWindow = event.timestamp <= windowEnd;

  if (!withinWindow) {
    // Input came too late - ignore it
    return { context, effects };
  }

  const isCorrect = event.key.toLowerCase() === context.currentEmission.char.toLowerCase();
  const latencyMs = event.timestamp - context.currentEmission.startedAt;

  if (isCorrect) {
    // Correct input - stop audio, cancel recognition timeout, and advance immediately
    effects.push(
      { type: 'stopAudio' },
      { type: 'cancelRecognitionTimeout' },
      { type: 'showFeedback', feedbackType: 'correct', char: context.currentEmission.char },
      { type: 'logEvent', event: {
        type: 'correct',
        at: event.timestamp,
        emissionId: context.currentEmission.id,
        latencyMs
      }}
    );

    // Immediately advance to next character (no feedback delay for correct)
    return advanceToNextCharacter(context, effects, characterSource);
  } else {
    // Incorrect input - show feedback but don't change phase
    effects.push(
      { type: 'showFeedback', feedbackType: 'incorrect', char: context.currentEmission.char },
      { type: 'logEvent', event: {
        type: 'incorrect',
        at: event.timestamp,
        emissionId: context.currentEmission.id,
        expected: context.currentEmission.char,
        got: event.key
      }}
    );

    // Stay in current phase, recognition timeout will handle advancement
    return { context, effects };
  }
}

function transitionToFeedback(
  context: SessionContext,
  effects: Effect[],
  reason: 'timeout'
): TransitionResult {
  if (!context.currentEmission || !context.config) {
    return { context, effects };
  }

  effects.push(
    { type: 'showFeedback', feedbackType: 'timeout', char: context.currentEmission.char },
    { type: 'logEvent', event: {
      type: 'timeout',
      at: Date.now(),
      emissionId: context.currentEmission.id
    }}
  );

  if (context.config.replay) {
    effects.push({ type: 'showReplay', char: context.currentEmission.char });
  }

  // Schedule advancement after feedback
  const feedbackDurationMs = 500; // Could be configurable
  effects.push({ type: 'startFeedbackTimeout', delayMs: feedbackDurationMs });

  return {
    context: { ...context, phase: 'feedback' },
    effects
  };
}

function advanceToNextCharacter(context: SessionContext, effects: Effect[], characterSource?: CharacterSource): TransitionResult {
  if (!context.config || !context.currentEmission) {
    return { context, effects };
  }

  // Add current character to previous characters
  const previousCharacters = [...context.previousCharacters, context.currentEmission.char];

  // Check if session should end
  const startedAt = context.startedAt ?? Date.now();
  const shouldEnd = Date.now() - startedAt >= context.config.lengthMs;

  if (shouldEnd) {
    effects.push(
      { type: 'cancelAllTimeouts' },
      { type: 'endSession', reason: 'duration' }
    );

    return {
      context: {
        ...context,
        phase: 'ended',
        previousCharacters,
        currentEmission: null,
        epoch: context.epoch + 1, // Increment epoch on session end
        activeTimeouts: {}
      },
      effects
    };
  }

  // Create next emission
  const nextEmission = createEmission(context.config, characterSource);

  // Start next emission
  effects.push(
    { type: 'playAudio', char: nextEmission.char, emissionId: nextEmission.id },
    { type: 'logEvent', event: nextEmission }
  );

  const newContext: SessionContext = {
    ...context,
    phase: 'emitting',
    currentEmission: nextEmission,
    previousCharacters,
    activeTimeouts: {} // Clear timeout tracking for new emission
    // Don't increment epoch - this is normal progression within a session
  };

  // Schedule timeout for next character
  if (context.config.mode === 'active') {
    // Schedule recognition window timeout
    const windowMs = getActiveWindowMs(context.config.wpm, context.config.speedTier);
    effects.push({ type: 'startRecognitionTimeout', delayMs: windowMs });
  } else {
    // Passive mode - hide character and schedule reveal
    effects.push({ type: 'hideCharacter' });
    const delays = getPassiveTimingMs(context.config.wpm, context.config.speedTier);
    effects.push({ type: 'startRevealTimeout', delayMs: delays.preRevealMs });
  }

  return { context: newContext, effects };
}

// Helper functions

function createEmission(config: SessionConfig, characterSource?: CharacterSource): Emission {
  const char = characterSource ? characterSource.next() : getRandomCharacter(config.effectiveAlphabet);
  const now = Date.now();
  const windowMs = config.mode === 'active'
    ? getActiveWindowMs(config.wpm, config.speedTier)
    : 0; // Passive mode doesn't use windowCloseAt

  return {
    id: `emission-${now}-${Math.random().toString(36).substr(2, 9)}`,
    char,
    startedAt: now,
    windowCloseAt: now + windowMs
  };
}

function getRandomCharacter(alphabet: string[]): string {
  return alphabet[Math.floor(Math.random() * alphabet.length)];
}