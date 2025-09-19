/**
 * Session Scheduler
 *
 * Generates precise timing schedules for character emissions, input windows,
 * and reveal timings based on session configuration and timing engine.
 */

import { SessionConfig, Emission } from '../../../core/types/domain';
import {
  wpmToDitMs,
  getActiveWindowMs,
  getPassiveTimingMs,
  type SpeedTier
} from '../../../core/morse/timing';

export type ScheduleEvent =
  | { type: 'emit'; timestamp: number; emission: Emission }
  | { type: 'windowOpen'; timestamp: number; emissionId: string }
  | { type: 'windowClose'; timestamp: number; emissionId: string }
  | { type: 'reveal'; timestamp: number; emissionId: string }
  | { type: 'sessionEnd'; timestamp: number };

export type SessionSchedule = {
  events: ScheduleEvent[];
  duration: number; // total session duration in ms
};

/**
 * Generate a complete session schedule for a given configuration and character sequence
 */
export function generateSessionSchedule(
  config: SessionConfig,
  characters: string[],
  startTime: number = 0
): SessionSchedule {
  const events: ScheduleEvent[] = [];
  let currentTime = startTime;

  const { wpm } = extractWpmFromConfig(config);
  const ditMs = wpmToDitMs(wpm);

  for (let i = 0; i < characters.length; i++) {
    const char = characters[i];
    const emissionId = `emission-${i}-${char}-${currentTime}`;

    // Estimate character duration (this is simplified - real Morse timing would be more complex)
    const charDurationMs = estimateCharacterDuration(char, ditMs);

    // Create emission
    const emission: Emission = {
      id: emissionId,
      char,
      startedAt: currentTime,
      windowCloseAt: 0, // Will be set based on mode
    };

    // Emit character
    events.push({
      type: 'emit',
      timestamp: currentTime,
      emission
    });

    // Schedule mode-specific events
    if (config.mode === 'active') {
      const windowDuration = getActiveWindowMs(wpm, config.speedTier);
      const windowOpenTime = currentTime + charDurationMs;
      const windowCloseTime = windowOpenTime + windowDuration;

      emission.windowCloseAt = windowCloseTime;

      events.push({
        type: 'windowOpen',
        timestamp: windowOpenTime,
        emissionId
      });

      events.push({
        type: 'windowClose',
        timestamp: windowCloseTime,
        emissionId
      });

      currentTime = windowCloseTime;

    } else { // passive mode
      const passiveTiming = getPassiveTimingMs(wpm, config.speedTier);
      const revealTime = currentTime + charDurationMs + passiveTiming.preRevealMs;

      emission.windowCloseAt = revealTime; // In passive mode, this is the reveal moment

      events.push({
        type: 'reveal',
        timestamp: revealTime,
        emissionId
      });

      currentTime = revealTime + passiveTiming.postRevealMs;
    }

    // Stop if we've reached the session duration
    if (currentTime >= config.lengthMs) {
      break;
    }
  }

  // Add session end event
  const sessionEndTime = Math.min(currentTime, startTime + config.lengthMs);
  events.push({
    type: 'sessionEnd',
    timestamp: sessionEndTime
  });

  return {
    events,
    duration: sessionEndTime - startTime
  };
}

/**
 * Get the next scheduled event after a given timestamp
 */
export function getNextEvent(
  schedule: SessionSchedule,
  currentTime: number
): ScheduleEvent | null {
  return schedule.events.find(event => event.timestamp > currentTime) || null;
}

/**
 * Get all events that should have occurred by a given timestamp
 */
export function getEventsUntil(
  schedule: SessionSchedule,
  currentTime: number
): ScheduleEvent[] {
  return schedule.events.filter(event => event.timestamp <= currentTime);
}

/**
 * Check if a session should be ended based on time
 */
export function shouldEndSession(
  schedule: SessionSchedule,
  currentTime: number,
  startTime: number
): boolean {
  const sessionEndEvent = schedule.events.find(e => e.type === 'sessionEnd');
  return sessionEndEvent ? currentTime >= sessionEndEvent.timestamp :
         currentTime >= (startTime + schedule.duration);
}

/**
 * Extract WPM from session config - simplified for now
 * In a real implementation, this would come from user settings
 */
function extractWpmFromConfig(config: SessionConfig): { wpm: number } {
  // Default WPM for now - this should come from user config
  return { wpm: 20 };
}

/**
 * Estimate character duration in milliseconds
 * This is a simplified version - real Morse timing would account for
 * actual dit/dah patterns per character
 */
function estimateCharacterDuration(char: string, ditMs: number): number {
  // Simplified: assume average character takes about 5 dits
  // Real implementation would use actual Morse patterns
  const avgDitsPerChar = 5;
  return avgDitsPerChar * ditMs;
}