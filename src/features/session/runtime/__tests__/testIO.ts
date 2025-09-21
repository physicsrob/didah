/**
 * Improved test IO implementation with semantic query methods
 * Focuses on outcomes rather than call counting
 */

import type { IO, LogEvent, SessionSnapshot } from '../io';
import type { Clock } from '../clock';
import { calculateCharacterDurationMs } from '../../../../core/morse/timing';

export class TestIO implements IO {
  private clock: Clock;

  // Track only what we actually assert on in tests
  private feedbackMap: Map<string, 'correct' | 'incorrect' | 'timeout'> = new Map();
  private replayedChars: Set<string> = new Set();
  private revealedChars: string[] = [];
  private hiddenCount: number = 0;
  private audioStopped: boolean = false;
  private loggedEvents: LogEvent[] = [];

  constructor(clock: Clock) {
    this.clock = clock;
  }

  // ============= IO Implementation =============

  async playChar(char: string, wpm: number): Promise<void> {
    const duration = calculateCharacterDurationMs(char, wpm);
    await this.clock.sleep(duration);
  }

  async stopAudio(): Promise<void> {
    this.audioStopped = true;
  }

  reveal(char: string): void {
    this.revealedChars.push(char);
  }

  hide(): void {
    this.hiddenCount++;
  }

  feedback(kind: 'correct' | 'incorrect' | 'timeout', char: string): void {
    this.feedbackMap.set(char, kind);
  }

  async replay(char: string, wpm: number): Promise<void> {
    this.replayedChars.add(char);
    const duration = calculateCharacterDurationMs(char, wpm);
    await this.clock.sleep(duration);
  }

  log(event: LogEvent): void {
    this.loggedEvents.push(event);
  }

  snapshot(_snapshot: SessionSnapshot): void {
    // Not needed for most tests
  }

  // ============= Semantic Query Methods =============

  /**
   * Get the feedback type for a specific character
   * Returns undefined if no feedback was given for this character
   */
  getFeedbackFor(char: string): 'correct' | 'incorrect' | 'timeout' | undefined {
    return this.feedbackMap.get(char);
  }

  /**
   * Check if a character was replayed
   */
  wasReplayed(char: string): boolean {
    return this.replayedChars.has(char);
  }

  /**
   * Get all replayed characters in order
   */
  getReplayedChars(): string[] {
    return Array.from(this.replayedChars);
  }

  /**
   * Get the sequence of revealed characters (passive mode)
   */
  getReveals(): string[] {
    return this.revealedChars;
  }

  /**
   * Check if audio was stopped (for early termination on correct input)
   */
  wasAudioStopped(): boolean {
    return this.audioStopped;
  }

  /**
   * Get the number of hide() calls (passive mode)
   */
  getHideCount(): number {
    return this.hiddenCount;
  }

  /**
   * Get logged events of a specific type
   */
  getLoggedEvents(type?: LogEvent['type']): LogEvent[] {
    if (!type) return this.loggedEvents;
    return this.loggedEvents.filter(e => e.type === type);
  }

  /**
   * Get incorrect key attempts for a specific character
   */
  getIncorrectAttempts(expectedChar: string): string[] {
    return this.loggedEvents
      .filter((e): e is Extract<LogEvent, { type: 'incorrect' }> =>
        e.type === 'incorrect' && e.expected === expectedChar)
      .map(e => e.got);
  }

  /**
   * Check if a specific event type was logged
   */
  hasLoggedEvent(type: LogEvent['type'], char?: string): boolean {
    return this.loggedEvents.some(e => {
      if (e.type !== type) return false;
      if (!char) return true;

      switch (e.type) {
        case 'emission':
        case 'correct':
        case 'timeout':
          return e.char === char;
        case 'incorrect':
          return e.expected === char;
        default:
          return true;
      }
    });
  }

  // ============= Test Helpers =============

  /**
   * Reset all tracking for a fresh test
   */
  reset(): void {
    this.feedbackMap.clear();
    this.replayedChars.clear();
    this.revealedChars = [];
    this.hiddenCount = 0;
    this.audioStopped = false;
    this.loggedEvents = [];
  }

  /**
   * Get a summary of what happened (useful for debugging failed tests)
   */
  getSummary(): string {
    const correct = Array.from(this.feedbackMap.entries())
      .filter(([_, type]) => type === 'correct')
      .map(([char]) => char);

    const timeouts = Array.from(this.feedbackMap.entries())
      .filter(([_, type]) => type === 'timeout')
      .map(([char]) => char);

    const incorrect = Array.from(this.feedbackMap.entries())
      .filter(([_, type]) => type === 'incorrect')
      .map(([char]) => char);

    return `
TestIO Summary:
  Correct: ${correct.join(', ') || 'none'}
  Timeouts: ${timeouts.join(', ') || 'none'}
  Incorrect: ${incorrect.join(', ') || 'none'}
  Replayed: ${Array.from(this.replayedChars).join(', ') || 'none'}
  Revealed: ${this.revealedChars.join(', ') || 'none'}
  Audio Stopped: ${this.audioStopped}
  Events Logged: ${this.loggedEvents.length}
    `.trim();
  }

  // ============= Legacy Support (for gradual migration) =============

  /**
   * Legacy method for backward compatibility
   * @deprecated Use semantic query methods instead
   */
  getCalls(method?: string): Array<{ method: string; args: any[] }> {
    // Build calls array on demand from our semantic tracking
    const calls: Array<{ method: string; args: any[] }> = [];

    // Add feedback calls
    for (const [char, type] of this.feedbackMap) {
      calls.push({ method: 'feedback', args: [type, char] });
    }

    // Add replay calls
    for (const char of this.replayedChars) {
      calls.push({ method: 'replay', args: [char, 20] }); // Assume default WPM
    }

    // Add reveal calls
    for (const char of this.revealedChars) {
      calls.push({ method: 'reveal', args: [char] });
    }

    // Add hide calls
    for (let i = 0; i < this.hiddenCount; i++) {
      calls.push({ method: 'hide', args: [] });
    }

    // Add stop audio calls
    if (this.audioStopped) {
      calls.push({ method: 'stopAudio', args: [] });
    }

    // Add log calls
    for (const event of this.loggedEvents) {
      calls.push({ method: 'log', args: [event] });
    }

    // Filter by method if specified
    return method ? calls.filter(c => c.method === method) : calls;
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated No longer needed
   */
  clear(): void {
    this.reset();
  }
}