import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DefaultSessionController } from '../SessionController.js';
import type { SessionConfig } from '../../../core/types/domain.js';
import type { EffectHandlers } from '../effects.js';

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

describe('SessionController race conditions', () => {
  let controller: DefaultSessionController;
  let effects: Array<{ type: string; [key: string]: any }>;

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

    controller = new DefaultSessionController(handlers);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('timeout vs keypress races', () => {
    it('should handle keypress arriving just before timeout', () => {
      const config = createActiveConfig();
      controller.start(config);

      controller.sendEvent({ type: 'audioEnded', emissionId: 'test' });
      expect(controller.getPhase()).toBe('awaitingInput');

      const currentChar = controller.getCurrentCharacter();
      const ditMs = 1200 / 20; // 60ms
      const windowMs = 3 * ditMs; // 180ms

      // Advance to just before timeout
      vi.advanceTimersByTime(windowMs - 1);

      // Keypress arrives at the last moment
      controller.sendEvent({
        type: 'keypress',
        key: currentChar!,
        timestamp: Date.now()
      });

      // Should handle keypress, not timeout
      expect(effects.some(e => e.type === 'showFeedback' && e.feedbackType === 'correct')).toBe(true);
      expect(effects.some(e => e.type === 'showFeedback' && e.feedbackType === 'timeout')).toBe(false);

      // Timeout should now be cancelled, so advancing time shouldn't trigger it
      vi.advanceTimersByTime(10);
      expect(effects.filter(e => e.type === 'showFeedback' && e.feedbackType === 'timeout')).toHaveLength(0);
    });

    it('should handle timeout arriving just before keypress', () => {
      const config = createActiveConfig();
      controller.start(config);

      controller.sendEvent({ type: 'audioEnded', emissionId: 'test' });
      expect(controller.getPhase()).toBe('awaitingInput');

      const currentChar = controller.getCurrentCharacter();
      const ditMs = 1200 / 20;
      const windowMs = 3 * ditMs;

      // Let timeout fire (advance past window + ensure tick fires)
      vi.advanceTimersByTime(windowMs + 10);
      expect(controller.getPhase()).toBe('feedback');
      expect(effects.some(e => e.type === 'showFeedback' && e.feedbackType === 'timeout')).toBe(true);

      // Keypress arrives after timeout (should be ignored in feedback phase)
      const effectsBeforeKeypress = effects.length;
      controller.sendEvent({
        type: 'keypress',
        key: currentChar!,
        timestamp: Date.now()
      });

      // Should not generate additional feedback
      const newEffects = effects.slice(effectsBeforeKeypress);
      expect(newEffects.some(e => e.type === 'showFeedback')).toBe(false);
    });
  });

  describe('rapid successive keypresses', () => {
    it('should handle multiple rapid keypresses correctly', () => {
      const config = createActiveConfig();
      controller.start(config);

      controller.sendEvent({ type: 'audioEnded', emissionId: 'test' });
      const currentChar = controller.getCurrentCharacter();

      // Send multiple rapid keypresses
      controller.sendEvent({
        type: 'keypress',
        key: 'X', // wrong
        timestamp: Date.now()
      });

      controller.sendEvent({
        type: 'keypress',
        key: currentChar!, // correct
        timestamp: Date.now() + 5
      });

      controller.sendEvent({
        type: 'keypress',
        key: 'Y', // another wrong one
        timestamp: Date.now() + 10
      });

      // Advance time to trigger tick that processes pendingAdvance
      vi.advanceTimersByTime(20);

      // Should handle the first correct keypress and ignore subsequent ones
      const feedbackEvents = effects.filter(e => e.type === 'showFeedback');
      expect(feedbackEvents.some(e => e.feedbackType === 'incorrect')).toBe(true);
      expect(feedbackEvents.some(e => e.feedbackType === 'correct')).toBe(true);

      // Should have advanced due to correct input
      expect(['emitting', 'ended']).toContain(controller.getPhase());
    });
  });

  describe('session restart races', () => {
    it('should handle session end during active timing', () => {
      const config = createActiveConfig();
      controller.start(config);

      controller.sendEvent({ type: 'audioEnded', emissionId: 'test' });
      expect(controller.getPhase()).toBe('awaitingInput');

      // End session while in awaiting input
      controller.stop();
      expect(controller.getPhase()).toBe('ended');

      // Advance time past where timeout would have fired
      const ditMs = 1200 / 20;
      const windowMs = 3 * ditMs;
      vi.advanceTimersByTime(windowMs + 100);

      // Should remain ended, no stale timeout effects
      expect(controller.getPhase()).toBe('ended');
      expect(effects.filter(e => e.type === 'showFeedback' && e.feedbackType === 'timeout')).toHaveLength(0);
    });

    it('should handle rapid session start/stop/start', () => {
      const config = createActiveConfig();

      // Rapid start/stop/start
      controller.start(config);
      const firstSessionEffects = effects.length;

      controller.stop();
      const stopEffects = effects.length;

      controller.start(config);
      const restartEffects = effects.length;

      expect(restartEffects > stopEffects).toBe(true);
      expect(effects.filter(e => e.type === 'endSession')).toHaveLength(1);
      expect(effects.filter(e => e.type === 'playAudio')).toHaveLength(2); // One for each start
    });
  });

  describe('audio end vs session end races', () => {
    it('should handle session end during audio playback', () => {
      const config = createActiveConfig();
      controller.start(config);

      expect(controller.getPhase()).toBe('emitting');

      // End session while audio is playing
      controller.stop();
      expect(controller.getPhase()).toBe('ended');

      // Audio end event arrives after session ended
      controller.sendEvent({ type: 'audioEnded', emissionId: 'test' });

      // Should remain in ended state
      expect(controller.getPhase()).toBe('ended');
    });
  });

  describe('concurrent timing windows', () => {
    it('should handle overlapping timeout scenarios in passive mode', () => {
      const config = { ...createActiveConfig(), mode: 'passive' as const };
      controller.start(config);

      controller.sendEvent({ type: 'audioEnded', emissionId: 'test' });
      expect(controller.getPhase()).toBe('preRevealDelay');

      // End session during pre-reveal delay
      controller.stop();
      expect(controller.getPhase()).toBe('ended');

      // Advance time past where pre-reveal timeout would have fired
      const ditMs = 1200 / 20;
      const preRevealMs = 3 * ditMs;
      vi.advanceTimersByTime(preRevealMs + 100);

      // Should remain ended, no character reveal
      expect(controller.getPhase()).toBe('ended');
      expect(effects.filter(e => e.type === 'revealCharacter')).toHaveLength(0);
    });
  });

  describe('epoch validation', () => {
    it('should prevent stale timeout callbacks from different epochs', () => {
      const config = createActiveConfig();

      // Start first session (epoch 1)
      controller.start(config);
      const firstEpoch = (controller as any).getContext().epoch;

      controller.sendEvent({ type: 'audioEnded', emissionId: 'test' });
      expect(controller.getPhase()).toBe('awaitingInput');

      // End session (epoch 2)
      controller.stop();

      // Start new session (epoch 3)
      controller.start(config);
      const secondEpoch = (controller as any).getContext().epoch;
      expect(secondEpoch).toBeGreaterThan(firstEpoch);

      // Let time advance to trigger any stale timeouts from first session
      const ditMs = 1200 / 20;
      const windowMs = 3 * ditMs;
      vi.advanceTimersByTime(windowMs + 100);

      // New session should be unaffected by stale timeouts
      expect(controller.getPhase()).toBe('emitting'); // Still in new session
    });
  });

  describe('effect ordering consistency', () => {
    it('should maintain consistent effect ordering under race conditions', () => {
      const config = createActiveConfig();
      controller.start(config);

      const currentChar = controller.getCurrentCharacter();

      // Rapid sequence of events
      controller.sendEvent({ type: 'audioEnded', emissionId: 'test' });
      controller.sendEvent({
        type: 'keypress',
        key: currentChar!,
        timestamp: Date.now()
      });

      // Effects should be in logical order
      const playAudioIndex = effects.findIndex(e => e.type === 'playAudio');
      const stopAudioIndex = effects.findIndex(e => e.type === 'stopAudio');
      const feedbackIndex = effects.findIndex(e => e.type === 'showFeedback' && e.feedbackType === 'correct');

      expect(playAudioIndex).toBeGreaterThan(-1);
      expect(stopAudioIndex).toBeGreaterThan(playAudioIndex);
      expect(feedbackIndex).toBeGreaterThan(stopAudioIndex);
    });
  });
});