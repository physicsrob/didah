import { describe, it, expect } from 'vitest';
import { transition } from '../transition.js';
import type { SessionContext, SessionEvent } from '../types.js';
import type { SessionConfig } from '../../../core/types/domain.js';

function createInitialContext(): SessionContext {
  return {
    phase: 'idle',
    config: null,
    startedAt: null,
    currentEmission: null,
    previousCharacters: [],
    sessionId: null,
    epoch: 0,
    pendingTimeouts: new Set()
  };
}

function createActiveConfig(): SessionConfig {
  return {
    mode: 'active',
    lengthMs: 60000,
    speedTier: 'medium',
    sourceId: 'random',
    feedback: 'both',
    replay: true,
    effectiveAlphabet: ['A', 'B', 'C'],
    wpm: 20
  };
}

function createPassiveConfig(): SessionConfig {
  return {
    mode: 'passive',
    lengthMs: 60000,
    speedTier: 'medium',
    sourceId: 'random',
    feedback: 'both',
    replay: false,
    effectiveAlphabet: ['A', 'B', 'C'],
    wpm: 20
  };
}

describe('transition', () => {
  describe('idle phase', () => {
    it('should transition to emitting when start event received', () => {
      const context = createInitialContext();
      const config = createActiveConfig();
      const event: SessionEvent = { type: 'start', config };

      const result = transition(context, event);

      expect(result.context.phase).toBe('emitting');
      expect(result.context.config).toBe(config);
      expect(result.context.epoch).toBe(1);
      expect(result.context.currentEmission).toBeTruthy();
      expect(result.effects).toContainEqual(
        expect.objectContaining({ type: 'playAudio' })
      );
      expect(result.effects).toContainEqual(
        expect.objectContaining({ type: 'logEvent' })
      );
    });

    it('should not schedule timeout for active mode (tick-based timing)', () => {
      const context = createInitialContext();
      const config = createActiveConfig();
      const event: SessionEvent = { type: 'start', config };

      const result = transition(context, event);

      // No timeout effects in tick-based system
      expect(result.effects).not.toContainEqual(
        expect.objectContaining({
          type: 'startTimeout'
        })
      );
      expect(result.context.phase).toBe('emitting');
    });

    it('should hide character for passive mode', () => {
      const context = createInitialContext();
      const config = createPassiveConfig();
      const event: SessionEvent = { type: 'start', config };

      const result = transition(context, event);

      expect(result.effects).toContainEqual(
        expect.objectContaining({ type: 'hideCharacter' })
      );
    });
  });

  describe('emitting phase - active mode', () => {
    function createEmittingActiveContext(): SessionContext {
      return {
        ...createInitialContext(),
        phase: 'emitting',
        config: createActiveConfig(),
        currentEmission: {
          id: 'test-1',
          char: 'A',
          startedAt: 1000,
          windowCloseAt: 1500
        },
        pendingTimeouts: new Set(['window-test-1'])
      };
    }

    it('should transition to awaitingInput when audio ends', () => {
      const context = createEmittingActiveContext();
      const event: SessionEvent = { type: 'audioEnded', emissionId: 'test-1' };

      const result = transition(context, event);

      expect(result.context.phase).toBe('awaitingInput');
    });

    it('should handle correct keypress during emission', () => {
      const context = createEmittingActiveContext();
      const event: SessionEvent = {
        type: 'keypress',
        key: 'A',
        timestamp: 1100 // Within window (1000 + 180ms = 1180)
      };

      const result = transition(context, event);

      expect(result.effects).toContainEqual(
        expect.objectContaining({ type: 'stopAudio' })
      );
      expect(result.effects).toContainEqual(
        expect.objectContaining({
          type: 'showFeedback',
          feedbackType: 'correct'
        })
      );
      expect(result.context.phase).toBe('feedback');
      expect(result.context.pendingAdvance).toBe(true);
    });

    it('should handle incorrect keypress during emission', () => {
      const context = createEmittingActiveContext();
      const event: SessionEvent = {
        type: 'keypress',
        key: 'B',
        timestamp: 1100 // Within window (1000 + 180ms = 1180)
      };

      const result = transition(context, event);

      expect(result.context.phase).toBe('emitting');
      expect(result.effects).toContainEqual(
        expect.objectContaining({
          type: 'showFeedback',
          feedbackType: 'incorrect'
        })
      );
      expect(result.effects).not.toContainEqual(
        expect.objectContaining({ type: 'stopAudio' })
      );
      expect(result.context.pendingAdvance).toBe(undefined);
    });

    it('should handle window expiry via tick during awaitingInput', () => {
      const context = {
        ...createEmittingActiveContext(),
        phase: 'awaitingInput' as const
      };
      const event: SessionEvent = {
        type: 'tick',
        timestamp: 1300 // past the window (1000 + 180ms = 1180)
      };

      const result = transition(context, event);

      expect(result.context.phase).toBe('feedback');
      expect(result.effects).toContainEqual(
        expect.objectContaining({
          type: 'showFeedback',
          feedbackType: 'timeout'
        })
      );
    });
  });

  describe('emitting phase - passive mode', () => {
    function createEmittingPassiveContext(): SessionContext {
      return {
        ...createInitialContext(),
        phase: 'emitting',
        config: createPassiveConfig(),
        currentEmission: {
          id: 'test-1',
          char: 'A',
          startedAt: 1000,
          windowCloseAt: 1500
        }
      };
    }

    it('should transition to preRevealDelay when audio ends', () => {
      const context = createEmittingPassiveContext();
      const event: SessionEvent = { type: 'audioEnded', emissionId: 'test-1' };

      const result = transition(context, event);

      expect(result.context.phase).toBe('preRevealDelay');
      // No timeout scheduling in tick-based system
      expect(result.effects).not.toContainEqual(
        expect.objectContaining({
          type: 'startTimeout'
        })
      );
    });
  });

  describe('awaitingInput phase', () => {
    function createAwaitingInputContext(): SessionContext {
      return {
        ...createInitialContext(),
        phase: 'awaitingInput',
        config: createActiveConfig(),
        currentEmission: {
          id: 'test-1',
          char: 'A',
          startedAt: 1000,
          windowCloseAt: 1500
        }
      };
    }

    it('should handle correct keypress', () => {
      const context = createAwaitingInputContext();
      const event: SessionEvent = {
        type: 'keypress',
        key: 'A',
        timestamp: 1100 // Within window (1000 + 180ms = 1180)
      };

      const result = transition(context, event);

      expect(result.effects).toContainEqual(
        expect.objectContaining({
          type: 'showFeedback',
          feedbackType: 'correct'
        })
      );
      expect(result.effects).toContainEqual(
        expect.objectContaining({ type: 'logEvent' })
      );
      expect(result.context.phase).toBe('feedback');
      expect(result.context.pendingAdvance).toBe(true);
    });

    it('should handle window expiry via tick', () => {
      const context = createAwaitingInputContext();
      const event: SessionEvent = {
        type: 'tick',
        timestamp: 1300 // past the window (1000 + 180ms = 1180)
      };

      const result = transition(context, event);

      expect(result.context.phase).toBe('feedback');
      expect(result.effects).toContainEqual(
        expect.objectContaining({
          type: 'showFeedback',
          feedbackType: 'timeout'
        })
      );
    });
  });

  describe('passive mode phases', () => {
    function createPreRevealContext(): SessionContext {
      return {
        ...createInitialContext(),
        phase: 'preRevealDelay',
        config: createPassiveConfig(),
        currentEmission: {
          id: 'test-1',
          char: 'A',
          startedAt: 1000,
          windowCloseAt: 1500
        }
      };
    }

    it('should transition from preRevealDelay to reveal via tick', () => {
      const context = createPreRevealContext();
      const event: SessionEvent = {
        type: 'tick',
        timestamp: 1180 // past preReveal delay (1000 + 180ms = 1180)
      };

      const result = transition(context, event);

      expect(result.context.phase).toBe('reveal');
      expect(result.effects).toContainEqual(
        expect.objectContaining({ type: 'revealCharacter' })
      );
      // No timeout scheduling in tick-based system
      expect(result.effects).not.toContainEqual(
        expect.objectContaining({
          type: 'startTimeout'
        })
      );
    });

    it('should advance from reveal phase via tick', () => {
      const context = {
        ...createPreRevealContext(),
        phase: 'reveal' as const
      };
      const event: SessionEvent = {
        type: 'tick',
        timestamp: 1300 // past postReveal delay (1000 + 180 + 120 = 1300)
      };

      const result = transition(context, event);

      // Should advance to next character (emitting or ended)
      expect(['emitting', 'ended']).toContain(result.context.phase);
    });
  });

  describe('end event handling', () => {
    it('should handle end event from any phase', () => {
      const context = {
        ...createInitialContext(),
        phase: 'emitting' as const,
        pendingTimeouts: new Set(['timeout-1', 'timeout-2'])
      };
      const event: SessionEvent = { type: 'end', reason: 'user' };

      const result = transition(context, event);

      expect(result.context.phase).toBe('ended');
      expect(result.context.pendingTimeouts.size).toBe(0);
      // No timeout cancellation effects in tick-based system
      expect(result.effects).not.toContainEqual(
        expect.objectContaining({ type: 'cancelTimeout' })
      );
      expect(result.effects).toContainEqual(
        expect.objectContaining({ type: 'endSession', reason: 'user' })
      );
    });
  });

  describe('advance event handling', () => {
    it('should advance to next character from feedback phase', () => {
      const context = {
        ...createInitialContext(),
        phase: 'feedback' as const,
        config: createActiveConfig(),
        currentEmission: {
          id: 'test-1',
          char: 'A',
          startedAt: 1000,
          windowCloseAt: 1500
        },
        previousCharacters: ['B'],
        startedAt: 1000
      };
      const event: SessionEvent = { type: 'advance' };

      const result = transition(context, event);

      expect(result.context.previousCharacters).toContain('A');
      // Should either start new emission or end session
      expect(['emitting', 'ended']).toContain(result.context.phase);
    });
  });
});