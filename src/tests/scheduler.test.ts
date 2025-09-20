import { describe, it, expect } from 'vitest';
import {
  generateSessionSchedule,
  getNextEvent,
  getEventsUntil,
  shouldEndSession
} from '../features/session/services/scheduler';
import type { SessionConfig } from '../core/types/domain';
import { calculateCharacterDurationMs, wpmToDitMs } from '../core/morse/timing';

describe('Session Scheduler', () => {
  const baseConfig: SessionConfig = {
    mode: 'active',
    lengthMs: 60000, // 1 minute
    speedTier: 'medium',
    sourceId: 'random',
    feedback: 'both',
    replay: true,
    effectiveAlphabet: ['A', 'B', 'C'],
    wpm: 20
  };

  describe('generateSessionSchedule', () => {
    it('generates correct schedule for active mode', () => {
      const config: SessionConfig = { ...baseConfig, mode: 'active' };
      const characters = ['A', 'B'];
      const schedule = generateSessionSchedule(config, characters, 0);

      expect(schedule.events.length).toBeGreaterThan(0);

      // Should have emit events for each character
      const emitEvents = schedule.events.filter(e => e.type === 'emit');
      expect(emitEvents).toHaveLength(2);

      // Should have window open/close events for active mode
      const windowEvents = schedule.events.filter(e =>
        e.type === 'windowOpen' || e.type === 'windowClose'
      );
      expect(windowEvents.length).toBeGreaterThan(0);

      // Should end with sessionEnd event
      const lastEvent = schedule.events[schedule.events.length - 1];
      expect(lastEvent.type).toBe('sessionEnd');
    });

    it('generates correct schedule for passive mode', () => {
      const config: SessionConfig = { ...baseConfig, mode: 'passive' };
      const characters = ['A', 'B'];
      const schedule = generateSessionSchedule(config, characters, 0);

      // Should have emit events
      const emitEvents = schedule.events.filter(e => e.type === 'emit');
      expect(emitEvents).toHaveLength(2);

      // Should have reveal events for passive mode
      const revealEvents = schedule.events.filter(e => e.type === 'reveal');
      expect(revealEvents).toHaveLength(2);

      // Should NOT have window events in passive mode
      const windowEvents = schedule.events.filter(e =>
        e.type === 'windowOpen' || e.type === 'windowClose'
      );
      expect(windowEvents).toHaveLength(0);
    });

    it('respects different speed tiers', () => {
      const slowConfig: SessionConfig = { ...baseConfig, speedTier: 'slow' };
      const fastConfig: SessionConfig = { ...baseConfig, speedTier: 'fast' };

      const slowSchedule = generateSessionSchedule(slowConfig, ['A'], 0);
      const fastSchedule = generateSessionSchedule(fastConfig, ['A'], 0);

      // Fast schedule should have shorter window durations
      const slowWindow = slowSchedule.events.find(e => e.type === 'windowClose');
      const fastWindow = fastSchedule.events.find(e => e.type === 'windowClose');

      expect(slowWindow).toBeDefined();
      expect(fastWindow).toBeDefined();
      expect(slowWindow!.timestamp).toBeGreaterThan(fastWindow!.timestamp);
    });

    it('creates emissions with correct properties', () => {
      const schedule = generateSessionSchedule(baseConfig, ['A'], 1000);
      const emitEvent = schedule.events.find(e => e.type === 'emit') as any;

      expect(emitEvent).toBeDefined();
      expect(emitEvent.emission.id).toContain('emission-0-A');
      expect(emitEvent.emission.char).toBe('A');
      expect(emitEvent.emission.startedAt).toBe(1000);
      expect(emitEvent.emission.windowCloseAt).toBeGreaterThan(1000);
    });

    it('limits schedule to session duration', () => {
      const shortConfig: SessionConfig = { ...baseConfig, lengthMs: 100 }; // Very short
      const manyChars = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

      const schedule = generateSessionSchedule(shortConfig, manyChars, 0);
      const sessionEndEvent = schedule.events.find(e => e.type === 'sessionEnd');

      expect(sessionEndEvent).toBeDefined();
      expect(sessionEndEvent!.timestamp).toBeLessThanOrEqual(100);

      // Should have fewer emit events than characters due to time limit
      const emitEvents = schedule.events.filter(e => e.type === 'emit');
      expect(emitEvents.length).toBeLessThan(manyChars.length);
    });
  });

  describe('getNextEvent', () => {
    it('returns the next event after given timestamp', () => {
      const schedule = generateSessionSchedule(baseConfig, ['A', 'B'], 0);
      const firstEvent = schedule.events[0];
      const nextEvent = getNextEvent(schedule, firstEvent.timestamp);

      expect(nextEvent).toBeDefined();
      expect(nextEvent!.timestamp).toBeGreaterThan(firstEvent.timestamp);
    });

    it('returns null when no more events', () => {
      const schedule = generateSessionSchedule(baseConfig, ['A'], 0);
      const lastTimestamp = Math.max(...schedule.events.map(e => e.timestamp));
      const nextEvent = getNextEvent(schedule, lastTimestamp);

      expect(nextEvent).toBeNull();
    });
  });

  describe('getEventsUntil', () => {
    it('returns all events up to given timestamp', () => {
      const schedule = generateSessionSchedule(baseConfig, ['A', 'B'], 0);
      const midTimestamp = schedule.events[2].timestamp;
      const events = getEventsUntil(schedule, midTimestamp);

      // Should include events at midTimestamp and before
      expect(events.length).toBeGreaterThanOrEqual(3);
      events.forEach(event => {
        expect(event.timestamp).toBeLessThanOrEqual(midTimestamp);
      });
    });

    it('returns empty array for timestamp before all events', () => {
      const schedule = generateSessionSchedule(baseConfig, ['A'], 100);
      const events = getEventsUntil(schedule, 50);

      expect(events).toHaveLength(0);
    });
  });

  describe('shouldEndSession', () => {
    it('returns true when session end event reached', () => {
      const schedule = generateSessionSchedule(baseConfig, ['A'], 0);
      const sessionEndEvent = schedule.events.find(e => e.type === 'sessionEnd')!;

      expect(shouldEndSession(schedule, sessionEndEvent.timestamp, 0)).toBe(true);
      expect(shouldEndSession(schedule, sessionEndEvent.timestamp + 1, 0)).toBe(true);
    });

    it('returns false before session end', () => {
      const schedule = generateSessionSchedule(baseConfig, ['A'], 0);
      const sessionEndEvent = schedule.events.find(e => e.type === 'sessionEnd')!;

      expect(shouldEndSession(schedule, sessionEndEvent.timestamp - 1, 0)).toBe(false);
    });
  });

  describe('event ordering', () => {
    it('maintains chronological order of events', () => {
      const schedule = generateSessionSchedule(baseConfig, ['A', 'B'], 0);

      for (let i = 1; i < schedule.events.length; i++) {
        expect(schedule.events[i].timestamp).toBeGreaterThanOrEqual(
          schedule.events[i - 1].timestamp
        );
      }
    });

    it('follows correct sequence for active mode', () => {
      const config: SessionConfig = { ...baseConfig, mode: 'active' };
      const schedule = generateSessionSchedule(config, ['A'], 0);

      // Should be: emit -> windowOpen -> windowClose -> sessionEnd
      const eventTypes = schedule.events.map(e => e.type);
      expect(eventTypes[0]).toBe('emit');
      expect(eventTypes[1]).toBe('windowOpen');
      expect(eventTypes[2]).toBe('windowClose');
      expect(eventTypes[eventTypes.length - 1]).toBe('sessionEnd');
    });

    it('follows correct sequence for passive mode', () => {
      const config: SessionConfig = { ...baseConfig, mode: 'passive' };
      const schedule = generateSessionSchedule(config, ['A'], 0);

      // Should be: emit -> reveal -> sessionEnd
      const eventTypes = schedule.events.map(e => e.type);
      expect(eventTypes[0]).toBe('emit');
      expect(eventTypes[1]).toBe('reveal');
      expect(eventTypes[eventTypes.length - 1]).toBe('sessionEnd');
    });

    it('should have correct timing intervals for passive slow mode', () => {
      const config: SessionConfig = {
        mode: 'passive',
        lengthMs: 10000,
        speedTier: 'slow',
        sourceId: 'test',
        feedback: 'buzzer',
        replay: false,
        effectiveAlphabet: [],
        wpm: 5
      };

      const schedule = generateSessionSchedule(config, ['T', 'E'], 0);

      // At 5 WPM:
      // - Dit = 240ms
      // - Dah = 720ms
      // - Passive slow: 3×dit (720ms) delays for pre/post reveal

      // T (dah = 720ms):
      // - 0ms: Emit T
      // - 720ms: Audio ends
      // - 720ms + 720ms = 1440ms: Reveal T
      // - 1440ms + 720ms = 2160ms: Next char

      // E (dit = 240ms):
      // - 2160ms: Emit E
      // - 2400ms: Audio ends
      // - 2400ms + 720ms = 3120ms: Reveal E
      // - 3120ms + 720ms = 3840ms: Session continues

      const events = schedule.events;

      // Find T events
      const tEmit = events.find(e => e.type === 'emit' && (e as any).emission.char === 'T');
      const tReveal = events.find(e => e.type === 'reveal' && e.emissionId === (tEmit as any).emission.id);

      // Find E events
      const eEmit = events.find(e => e.type === 'emit' && (e as any).emission.char === 'E');
      const eReveal = events.find(e => e.type === 'reveal' && e.emissionId === (eEmit as any).emission.id);

      expect(tEmit?.timestamp).toBe(0);
      expect(tReveal?.timestamp).toBe(1440);
      expect(eEmit?.timestamp).toBe(2160);
      expect(eReveal?.timestamp).toBe(3120);
    });
  });

  describe('precise timing calculations', () => {
    it('uses accurate character durations for single-element characters', () => {
      const config: SessionConfig = {
        ...baseConfig,
        mode: 'active',
        wpm: 20,
        speedTier: 'medium'
      };

      // E is single dit (.), T is single dah (-)
      const schedule = generateSessionSchedule(config, ['E', 'T'], 0);

      // At 20 WPM: dit = 60ms
      // E duration = 60ms (single dit)
      // T duration = 180ms (single dah = 3 dits)
      // Medium speed window = 3 × dit = 180ms

      const eEmit = schedule.events.find(e => e.type === 'emit' && (e as any).emission.char === 'E');
      const eWindowOpen = schedule.events.find(e => e.type === 'windowOpen' && e.emissionId === (eEmit as any).emission.id);
      const eWindowClose = schedule.events.find(e => e.type === 'windowClose' && e.emissionId === (eEmit as any).emission.id);

      const tEmit = schedule.events.find(e => e.type === 'emit' && (e as any).emission.char === 'T');
      const tWindowOpen = schedule.events.find(e => e.type === 'windowOpen' && e.emissionId === (tEmit as any).emission.id);

      expect(eEmit?.timestamp).toBe(0);
      expect(eWindowOpen?.timestamp).toBe(60); // After E audio (60ms)
      expect(eWindowClose?.timestamp).toBe(240); // 60ms + 180ms window
      expect(tEmit?.timestamp).toBe(240); // Next char starts after window close
      expect(tWindowOpen?.timestamp).toBe(420); // 240ms + T audio (180ms)
    });

    it('uses accurate character durations for multi-element characters', () => {
      const config: SessionConfig = {
        ...baseConfig,
        mode: 'active',
        wpm: 10,
        speedTier: 'slow'
      };

      // H is .... (4 dits + 3 intra-symbol spacing)
      const schedule = generateSessionSchedule(config, ['H'], 0);

      // At 10 WPM: dit = 120ms
      // H duration = 4 dits + 3 spacing = 7 × 120ms = 840ms
      // Slow speed window = 5 × dit = 600ms

      const hEmit = schedule.events.find(e => e.type === 'emit' && (e as any).emission.char === 'H');
      const hWindowOpen = schedule.events.find(e => e.type === 'windowOpen');
      const hWindowClose = schedule.events.find(e => e.type === 'windowClose');

      expect(hEmit?.timestamp).toBe(0);
      expect(hWindowOpen?.timestamp).toBe(840); // After H audio
      expect(hWindowClose?.timestamp).toBe(1440); // 840ms + 600ms window
    });

    it('verifies passive mode timing with accurate durations', () => {
      const config: SessionConfig = {
        ...baseConfig,
        mode: 'passive',
        wpm: 5,
        speedTier: 'slow'
      };

      // H is .... (4 dits + 3 intra-symbol spacing)
      const schedule = generateSessionSchedule(config, ['H'], 0);

      // At 5 WPM: dit = 240ms
      // H duration = 4 dits + 3 spacing = 7 × 240ms = 1680ms
      // Passive slow: pre-reveal = 3 dits = 720ms, post-reveal = 3 dits = 720ms

      const hEmit = schedule.events.find(e => e.type === 'emit' && (e as any).emission.char === 'H');
      const hReveal = schedule.events.find(e => e.type === 'reveal');

      expect(hEmit?.timestamp).toBe(0);
      expect(hReveal?.timestamp).toBe(1680 + 720); // Audio duration + pre-reveal delay
      expect(hReveal?.timestamp).toBe(2400);
    });

    it('handles punctuation with complex patterns correctly', () => {
      const config: SessionConfig = {
        ...baseConfig,
        mode: 'active',
        wpm: 20,
        speedTier: 'fast'
      };

      // Period (.) is .-.-.- (6 elements + 5 spacing = 17 dits total)
      const schedule = generateSessionSchedule(config, ['.'], 0);

      // At 20 WPM: dit = 60ms
      // Period duration = 17 × 60ms = 1020ms
      // Fast speed window = 2 × dit = 120ms

      const periodEmit = schedule.events.find(e => e.type === 'emit' && (e as any).emission.char === '.');
      const periodWindowOpen = schedule.events.find(e => e.type === 'windowOpen');
      const periodWindowClose = schedule.events.find(e => e.type === 'windowClose');

      expect(periodEmit?.timestamp).toBe(0);
      expect(periodWindowOpen?.timestamp).toBe(1020); // After period audio
      expect(periodWindowClose?.timestamp).toBe(1140); // 1020ms + 120ms window
    });

    it('matches calculateCharacterDurationMs for all test characters', () => {
      const config: SessionConfig = {
        ...baseConfig,
        wpm: 15,
        mode: 'active',
        speedTier: 'medium'
      };

      const testChars = ['E', 'T', 'A', 'N', 'I', 'S', 'H', 'R'];
      const schedule = generateSessionSchedule(config, testChars, 0);

      let expectedTime = 0;
      const ditMs = wpmToDitMs(15); // 80ms
      const windowMs = 3 * ditMs; // medium = 3 dits = 240ms

      testChars.forEach((char, index) => {
        const charDuration = calculateCharacterDurationMs(char, 15);
        const emitEvent = schedule.events.find(
          e => e.type === 'emit' && (e as any).emission.char === char
        );

        expect(emitEvent?.timestamp).toBe(expectedTime);

        // Next char starts after: char duration + window duration
        expectedTime += charDuration + windowMs;
      });
    });

    it('handles unknown characters with zero duration', () => {
      const config: SessionConfig = {
        ...baseConfig,
        wpm: 20,
        mode: 'active',
        speedTier: 'medium'
      };

      // '$' is not in Morse alphabet
      const schedule = generateSessionSchedule(config, ['A', '$', 'B'], 0);

      const aEmit = schedule.events.find(e => e.type === 'emit' && (e as any).emission.char === 'A');
      const dollarEmit = schedule.events.find(e => e.type === 'emit' && (e as any).emission.char === '$');
      const bEmit = schedule.events.find(e => e.type === 'emit' && (e as any).emission.char === 'B');

      // A duration at 20 WPM = 5 × 60ms = 300ms
      // Window = 3 × 60ms = 180ms

      expect(aEmit?.timestamp).toBe(0);
      expect(dollarEmit?.timestamp).toBe(480); // 300ms + 180ms
      expect(bEmit?.timestamp).toBe(660); // $ has 0 duration, so 480ms + 0ms + 180ms window
    });
  });
});