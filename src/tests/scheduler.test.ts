import { describe, it, expect } from 'vitest';
import {
  generateSessionSchedule,
  getNextEvent,
  getEventsUntil,
  shouldEndSession,
  type ScheduleEvent
} from '../features/session/services/scheduler';
import type { SessionConfig } from '../core/types/domain';

describe('Session Scheduler', () => {
  const baseConfig: SessionConfig = {
    mode: 'active',
    lengthMs: 60000, // 1 minute
    speedTier: 'medium',
    sourceId: 'random',
    feedback: 'both',
    replay: true,
    effectiveAlphabet: ['A', 'B', 'C']
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
  });
});