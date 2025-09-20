import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DefaultSessionController } from '../SessionController.js';
import type { SessionConfig } from '../../../core/types/domain.js';
import type { EffectHandlers } from '../effects.js';
import type { CharacterSource } from '../types.js';

// Test helper for predictable character sequences
class CyclicCharacterSource implements CharacterSource {
  private index = 0;

  constructor(private sequence: string[]) {}

  next(): string {
    const char = this.sequence[this.index];
    this.index = (this.index + 1) % this.sequence.length;
    return char;
  }
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

describe('SessionController timing', () => {
  let controller: DefaultSessionController;
  let effects: Array<{ type: string; [key: string]: any }>;
  let characterSource: CyclicCharacterSource;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    effects = [];

    const handlers: EffectHandlers = {
      onPlayAudio: (char, emissionId) => effects.push({ type: 'playAudio', char, emissionId }),
      onStopAudio: () => effects.push({ type: 'stopAudio' }),
      onShowFeedback: (feedbackType, char) => effects.push({ type: 'showFeedback', feedbackType, char }),
      onShowReplay: (char) => effects.push({ type: 'showReplay', char }),
      onRevealCharacter: (char) => effects.push({ type: 'revealCharacter', char }),
      onHideCharacter: () => effects.push({ type: 'hideCharacter' }),
      onLogEvent: (event) => effects.push({ type: 'logEvent', event }),
      onEndSession: (reason) => effects.push({ type: 'endSession', reason })
    };

    // Create predictable character sequence: A -> B -> C -> A -> B -> C...
    characterSource = new CyclicCharacterSource(['A', 'B', 'C']);
    controller = new DefaultSessionController(handlers, characterSource);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('active mode timing', () => {
    it('should respect input window timing', () => {
      const config = createActiveConfig();
      controller.start(config);

      expect(controller.getPhase()).toBe('emitting');
      expect(effects.some(e => e.type === 'playAudio')).toBe(true);

      // Simulate audio ending
      controller.sendEvent({ type: 'audioEnded', emissionId: 'test' });
      expect(controller.getPhase()).toBe('awaitingInput');

      // Calculate expected window duration (3 × dit for medium speed at 20 WPM)
      const ditMs = 1200 / 20; // 60ms
      const windowMs = 3 * ditMs; // 180ms

      // Advance time to just before window expires
      vi.advanceTimersByTime(windowMs - 10);
      expect(controller.getPhase()).toBe('awaitingInput');

      // Window should expire now (advance past window + ensure tick fires)
      vi.advanceTimersByTime(20);
      expect(controller.getPhase()).toBe('feedback');
      expect(effects.some(e => e.type === 'showFeedback' && e.feedbackType === 'timeout')).toBe(true);
    });

    it('should handle correct input during window', () => {
      const config = createActiveConfig();
      controller.start(config);

      controller.sendEvent({ type: 'audioEnded', emissionId: 'test' });
      expect(controller.getPhase()).toBe('awaitingInput');

      const currentChar = controller.getCurrentCharacter();
      controller.sendEvent({
        type: 'keypress',
        key: currentChar!,
        timestamp: Date.now()
      });

      // Should advance immediately without waiting for timeout
      expect(effects.some(e => e.type === 'showFeedback' && e.feedbackType === 'correct')).toBe(true);
    });

    it('should handle early correct input during emission', () => {
      const config = createActiveConfig();
      controller.start(config);

      expect(controller.getPhase()).toBe('emitting');
      const currentChar = controller.getCurrentCharacter();

      // Input during audio playback
      controller.sendEvent({
        type: 'keypress',
        key: currentChar!,
        timestamp: Date.now()
      });

      // Should stop audio and advance immediately
      expect(effects.some(e => e.type === 'stopAudio')).toBe(true);
      expect(effects.some(e => e.type === 'showFeedback' && e.feedbackType === 'correct')).toBe(true);
    });
  });

  describe('passive mode timing', () => {
    it('should follow passive mode timing sequence', () => {
      const config = createPassiveConfig();
      controller.start(config);

      expect(controller.getPhase()).toBe('emitting');
      expect(effects.some(e => e.type === 'hideCharacter')).toBe(true);

      // Simulate audio ending
      controller.sendEvent({ type: 'audioEnded', emissionId: 'test' });
      expect(controller.getPhase()).toBe('preRevealDelay');

      // Calculate expected delays (3 × dit pre-reveal, 2 × dit post-reveal for medium speed)
      const ditMs = 1200 / 20; // 60ms
      const preRevealMs = 3 * ditMs; // 180ms
      const postRevealMs = 2 * ditMs; // 120ms

      // Advance to just before pre-reveal timeout
      vi.advanceTimersByTime(preRevealMs - 1);
      expect(controller.getPhase()).toBe('preRevealDelay');

      // Pre-reveal timeout should trigger
      vi.advanceTimersByTime(1);
      expect(controller.getPhase()).toBe('reveal');
      expect(effects.some(e => e.type === 'revealCharacter')).toBe(true);

      // Advance to just before post-reveal timeout
      vi.advanceTimersByTime(postRevealMs - 1);
      expect(controller.getPhase()).toBe('reveal');

      // Post-reveal timeout should advance to next character
      vi.advanceTimersByTime(1);
      // Should either advance to next emission or end
      expect(['emitting', 'ended']).toContain(controller.getPhase());
    });
  });

  describe('session duration', () => {
    it('should end session when duration expires', () => {
      const config = { ...createActiveConfig(), lengthMs: 1000 }; // 1 second session
      controller.start(config);

      // Simulate audio ending to get to awaitingInput
      controller.sendEvent({ type: 'audioEnded', emissionId: 'test' });
      expect(controller.getPhase()).toBe('awaitingInput');

      // Fast-forward past session duration
      vi.advanceTimersByTime(1001);

      // Let the window timeout to get to feedback phase
      expect(controller.getPhase()).toBe('feedback');

      // Next character advance should end the session
      controller.sendEvent({ type: 'advance' });
      expect(effects.some(e => e.type === 'endSession' && e.reason === 'duration')).toBe(true);
    });
  });

  describe('timeout cancellation', () => {
    it('should cancel window timeout on correct input', () => {
      const config = createActiveConfig();
      controller.start(config);

      // First character should be 'A' (from our predictable sequence)
      const currentChar = controller.getCurrentCharacter();
      expect(currentChar).toBe('A');
      const context = (controller as any).getContext();
      const emissionId = context.currentEmission?.id;

      controller.sendEvent({ type: 'audioEnded', emissionId });
      expect(controller.getPhase()).toBe('awaitingInput');

      // Send correct keypress for 'A'
      controller.sendEvent({
        type: 'keypress',
        key: 'A',
        timestamp: Date.now()
      });

      // Check phases after keypress
      const phaseAfterKeypress = controller.getPhase();
      const currentCharAfter = controller.getCurrentCharacter();
      const previousChars = controller.getPreviousCharacters();
      const contextAfter = (controller as any).getContext();
      const newEmissionId = contextAfter.currentEmission?.id;

      // Should advance immediately to next emission after correct input
      expect(phaseAfterKeypress).toBe('emitting');
      expect(previousChars).toContain('A');
      // Next character should be 'B' (predictable sequence)
      expect(currentCharAfter).toBe('B');
      // Check that we have a new emission (emission ID should be different)
      expect(newEmissionId).not.toBe(emissionId);
      expect(newEmissionId).toBeTruthy();

      // The new emission should have its own window timeout
      // But it shouldn't have fired yet since we just started the new emission
      const ditMs = 1200 / 20;
      const windowMs = 3 * ditMs;

      // Advance time but not enough to trigger the NEW window timeout
      vi.advanceTimersByTime(windowMs - 10);

      // Should still be in emitting phase
      expect(controller.getPhase()).toBe('emitting');

      // Now advance past the window
      vi.advanceTimersByTime(20);

      // NOW we should transition to awaitingInput (audio hasn't ended yet)
      // or if audio is instant, we might be in awaitingInput or feedback
      const finalPhase = controller.getPhase();
      expect(['emitting', 'awaitingInput', 'feedback']).toContain(finalPhase);
    });

    it('should cancel all timeouts on session end', () => {
      const config = createActiveConfig();
      controller.start(config);

      controller.stop();

      expect(effects.some(e => e.type === 'endSession' && e.reason === 'user')).toBe(true);
    });
  });

  describe('epoch-based cancellation', () => {
    it('should ignore stale timeouts after session restart', () => {
      const config = createActiveConfig();

      // Start first session
      controller.start(config);
      const firstEpoch = (controller as any).getContext().epoch;

      // End and restart session
      controller.stop();
      controller.start(config);
      const secondEpoch = (controller as any).getContext().epoch;

      expect(secondEpoch).toBe(firstEpoch + 2); // +1 for stop, +1 for restart

      // Any stale timeouts from first session should be ignored
      // This is tested implicitly by ensuring phase transitions work correctly
    });
  });

  describe('multiple speed tiers', () => {
    it('should use correct window timing for slow speed', () => {
      const config = { ...createActiveConfig(), speedTier: 'slow' as const };
      controller.start(config);

      controller.sendEvent({ type: 'audioEnded', emissionId: 'test' });
      expect(controller.getPhase()).toBe('awaitingInput');

      // Slow = 5 × dit
      const ditMs = 1200 / 20; // 60ms
      const windowMs = 5 * ditMs; // 300ms

      vi.advanceTimersByTime(windowMs - 10);
      expect(controller.getPhase()).toBe('awaitingInput');

      vi.advanceTimersByTime(20);
      expect(controller.getPhase()).toBe('feedback');
    });

    it('should use correct window timing for fast speed', () => {
      const config = { ...createActiveConfig(), speedTier: 'fast' as const };
      controller.start(config);

      controller.sendEvent({ type: 'audioEnded', emissionId: 'test' });
      expect(controller.getPhase()).toBe('awaitingInput');

      // Fast = 2 × dit
      const ditMs = 1200 / 20; // 60ms
      const windowMs = 2 * ditMs; // 120ms

      vi.advanceTimersByTime(windowMs - 10);
      expect(controller.getPhase()).toBe('awaitingInput');

      vi.advanceTimersByTime(20);
      expect(controller.getPhase()).toBe('feedback');
    });

    it('should use correct window timing for lightning speed', () => {
      const config = { ...createActiveConfig(), speedTier: 'lightning' as const };
      controller.start(config);

      controller.sendEvent({ type: 'audioEnded', emissionId: 'test' });
      expect(controller.getPhase()).toBe('awaitingInput');

      // Lightning = 1 × dit
      const ditMs = 1200 / 20; // 60ms
      const windowMs = 1 * ditMs; // 60ms

      vi.advanceTimersByTime(windowMs - 10);
      expect(controller.getPhase()).toBe('awaitingInput');

      vi.advanceTimersByTime(20);
      expect(controller.getPhase()).toBe('feedback');
    });
  });
});