import type { SessionContext, SessionEvent, TransitionResult, Effect } from './types.js';
import { getActiveWindowMs, getPassiveTimingMs } from '../../core/morse/timing.js';
import type { Emission, SessionConfig } from '../../core/types/domain.js';

export function transition(context: SessionContext, event: SessionEvent): TransitionResult {
  const effects: Effect[] = [];

  // Handle tick events - check for time-based transitions
  if (event.type === 'tick') {
    return handleTick(context, event, effects);
  }

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
          epoch: context.epoch + 1,
          pendingTimeouts: new Set()
        };

        // Start first emission
        const firstEmission = createEmission(event.config);

        newContext.currentEmission = firstEmission;
        effects.push(
          { type: 'playAudio', char: firstEmission.char, emissionId: firstEmission.id },
          { type: 'logEvent', event: firstEmission }
        );

        // Schedule phase transition based on mode
        if (event.config.mode === 'active') {
          // No timeout needed - tick handler will manage timing
        } else {
          // Passive mode - hide character initially
          effects.push({ type: 'hideCharacter' });
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
          // Transition to awaiting input if window is still open
          return {
            context: { ...context, phase: 'awaitingInput' },
            effects
          };
        } else {
          // Passive mode - transition to pre-reveal delay phase
          return {
            context: { ...context, phase: 'preRevealDelay' },
            effects
          };
        }
      }

      if (event.type === 'keypress' && context.config?.mode === 'active') {
        return handleActiveInput(context, event, effects);
      }

      // Timeout handling removed - tick handler manages timing

      break;

    case 'awaitingInput':
      if (event.type === 'keypress') {
        return handleActiveInput(context, event, effects);
      }

      // Timeout handling removed - tick handler manages timing
      break;

    case 'feedback':
      if (event.type === 'advance') {
        return advanceToNextCharacter(context, effects);
      }
      break;

    case 'preRevealDelay':
      // Tick handler manages timing transitions
      break;

    case 'reveal':
      // Tick handler manages timing transitions
      break;


    default:
      break;
  }

  // Handle end event from any state (moved outside switch)
  if (event.type === 'end') {
    // No timeouts to cancel in tick-based system
    effects.push({ type: 'endSession', reason: event.reason });

    return {
      context: {
        ...context,
        phase: 'ended',
        epoch: context.epoch + 1,
        pendingTimeouts: new Set()
      },
      effects
    };
  }

  return { context, effects };
}

function handleActiveInput(
  context: SessionContext,
  event: { type: 'keypress'; key: string; timestamp: number },
  effects: Effect[]
): TransitionResult {
  if (!context.currentEmission || !context.config) {
    return { context, effects };
  }

  // Check if input is within the allowed window
  const withinWindow = isInputWithinWindow(event.timestamp, context.currentEmission, context.config);

  if (!withinWindow) {
    // Input came too late - just log as late input, no phase change
    effects.push(
      { type: 'logEvent', event: { type: 'timeout', at: event.timestamp, emissionId: context.currentEmission.id } }
    );
    return { context, effects };
  }

  const isCorrect = event.key.toLowerCase() === context.currentEmission.char.toLowerCase();
  const latencyMs = event.timestamp - context.currentEmission.startedAt;

  if (isCorrect) {
    // Correct input within window - stop audio and mark for immediate advance
    effects.push(
      { type: 'stopAudio' },
      { type: 'showFeedback', feedbackType: 'correct', char: context.currentEmission.char },
      { type: 'logEvent', event: {
        type: 'correct',
        at: event.timestamp,
        emissionId: context.currentEmission.id,
        latencyMs
      } }
    );

    // Mark context to indicate we should advance immediately on next tick
    return {
      context: {
        ...context,
        phase: 'feedback',
        // Store the advance trigger for tick handler to pick up
        pendingAdvance: true
      },
      effects
    };
  } else {
    // Incorrect input within window - log but don't change phase
    effects.push(
      { type: 'showFeedback', feedbackType: 'incorrect', char: context.currentEmission.char },
      { type: 'logEvent', event: {
        type: 'incorrect',
        at: event.timestamp,
        emissionId: context.currentEmission.id,
        expected: context.currentEmission.char,
        got: event.key
      } }
    );

    return { context, effects };
  }
}

function advanceToNextCharacter(context: SessionContext, effects: Effect[]): TransitionResult {
  if (!context.config || !context.currentEmission) {
    return { context, effects };
  }

  // Add current character to previous characters
  const previousCharacters = [...context.previousCharacters, context.currentEmission.char];

  // Check if session should end
  const startedAt = context.startedAt ?? Date.now();
  const shouldEnd = shouldEndSession(context.config, startedAt);

  if (shouldEnd) {
    effects.push({ type: 'endSession', reason: 'duration' });
    return {
      context: {
        ...context,
        phase: 'ended',
        previousCharacters,
        currentEmission: null
      },
      effects
    };
  }

  // Get next emission
  const nextEmission = createEmission(context.config);

  // Start next emission
  effects.push(
    { type: 'playAudio', char: nextEmission.char, emissionId: nextEmission.id },
    { type: 'logEvent', event: nextEmission }
  );

  const newContext: SessionContext = {
    ...context,
    phase: 'emitting',
    currentEmission: nextEmission,
    previousCharacters
  };

  // Schedule next phase transition
  if (context.config.mode === 'active') {
    // No timeout needed - tick handler will manage timing
  } else {
    // Passive mode - hide character
    effects.push({ type: 'hideCharacter' });
  }

  return { context: newContext, effects };
}

// Helper functions

function createEmission(config: any): Emission {
  const char = getRandomCharacter(config.effectiveAlphabet);
  const now = Date.now();
  return {
    id: `emission-${now}-${Math.random().toString(36).substr(2, 9)}`,
    char,
    startedAt: now,
    windowCloseAt: now + 1000 // placeholder
  };
}

function getRandomCharacter(alphabet: string[]): string {
  return alphabet[Math.floor(Math.random() * alphabet.length)];
}

function shouldEndSession(config: any, startedAt: number): boolean {
  return Date.now() - startedAt >= config.lengthMs;
}

function isInputWithinWindow(
  inputTimestamp: number,
  emission: Emission,
  config: SessionConfig
): boolean {
  if (config.mode !== 'active') return true;

  const windowMs = getActiveWindowMs(config.wpm, config.speedTier);
  const windowEnd = emission.startedAt + windowMs;
  return inputTimestamp <= windowEnd;
}

function handleTick(
  context: SessionContext,
  event: { type: 'tick'; timestamp: number },
  effects: Effect[]
): TransitionResult {
  if (!context.config || !context.currentEmission) {
    return { context, effects };
  }

  const currentTime = event.timestamp;

  // Check for session duration expiry
  if (context.startedAt && currentTime - context.startedAt >= context.config.lengthMs) {
    effects.push({ type: 'endSession', reason: 'duration' });
    return {
      context: { ...context, phase: 'ended' },
      effects
    };
  }

  // Check for pending advance (from correct keypress)
  if (context.pendingAdvance) {
    const advanceResult = advanceToNextCharacter(context, effects);
    return {
      context: { ...advanceResult.context, pendingAdvance: undefined },
      effects: advanceResult.effects
    };
  }

  // Handle active mode window expiry
  if (context.phase === 'awaitingInput' && context.config.mode === 'active') {
    const windowMs = getActiveWindowMs(context.config.wpm, context.config.speedTier);
    const windowEnd = context.currentEmission.startedAt + windowMs;

    if (currentTime > windowEnd) {
      // Window expired - transition to feedback
      effects.push(
        { type: 'showFeedback', feedbackType: 'timeout', char: context.currentEmission.char },
        { type: 'logEvent', event: { type: 'timeout', at: currentTime, emissionId: context.currentEmission.id } }
      );

      if (context.config.replay) {
        effects.push({ type: 'showReplay', char: context.currentEmission.char });
      }

      return {
        context: { ...context, phase: 'feedback' },
        effects
      };
    }
  }

  // Handle passive mode timing
  if (context.config.mode === 'passive') {
    const delays = getPassiveTimingMs(context.config.wpm, context.config.speedTier);

    if (context.phase === 'preRevealDelay') {
      const revealTime = context.currentEmission.startedAt + delays.preRevealMs;
      if (currentTime >= revealTime) {
        effects.push({ type: 'revealCharacter', char: context.currentEmission.char });
        return {
          context: { ...context, phase: 'reveal' },
          effects
        };
      }
    }

    if (context.phase === 'reveal') {
      const postRevealTime = context.currentEmission.startedAt + delays.preRevealMs + delays.postRevealMs;
      if (currentTime >= postRevealTime) {
        return advanceToNextCharacter(context, effects);
      }
    }
  }

  // No transitions needed
  return { context, effects };
}