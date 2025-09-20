/**
 * Clock implementations for CLI simulation
 */

import type { Clock } from '../features/session/runtime/clock';

/**
 * Instant clock - runs through all timing instantly with virtual timestamps
 */
export class InstantClock implements Clock {
  currentTime: number = 0;
  private timers: Map<number, { callback: () => void; time: number }> = new Map();
  private sleepers: Map<number, { resolve: () => void; reject: (err: any) => void; time: number }> = new Map();
  private nextTimerId: number = 1;
  private nextSleeperId: number = 1;

  now(): number {
    return this.currentTime;
  }

  async sleep(ms: number, signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    const sleeperId = this.nextSleeperId++;
    const targetTime = this.currentTime + ms;

    return new Promise<void>((resolve, reject) => {
      // Register the sleeper
      this.sleepers.set(sleeperId, {
        resolve,
        reject,
        time: targetTime
      });

      // Handle abort signal
      const onAbort = () => {
        this.sleepers.delete(sleeperId);
        reject(new DOMException('Aborted', 'AbortError'));
      };

      if (signal) {
        signal.addEventListener('abort', onAbort, { once: true });
      }

      // Schedule automatic advancement (for instant mode)
      // Use setTimeout(0) to allow other promises in the race to setup
      setTimeout(() => {
        if (!signal?.aborted && this.sleepers.has(sleeperId)) {
          this.advance(ms);
        }
      }, 0);
    });
  }

  setTimeout(callback: () => void, ms: number): number {
    const id = this.nextTimerId++;
    this.timers.set(id, {
      callback,
      time: this.currentTime + ms
    });

    // In instant mode, schedule the timer to fire automatically
    setTimeout(() => {
      if (this.timers.has(id)) {
        this.advance(ms);
      }
    }, 0);

    return id;
  }

  clearTimeout(id: number): void {
    this.timers.delete(id);
  }

  /**
   * Advance the clock by specified milliseconds
   * This will fire any timers and resolve any sleepers that should complete
   */
  advance(ms: number): void {
    const targetTime = this.currentTime + ms;

    // Find and execute all timers that should fire
    const toFire: Array<() => void> = [];
    for (const [id, timer] of this.timers.entries()) {
      if (timer.time <= targetTime) {
        toFire.push(timer.callback);
        this.timers.delete(id);
      }
    }

    // Find and resolve all sleepers that should complete
    const toResolve: Array<() => void> = [];
    for (const [id, sleeper] of this.sleepers.entries()) {
      if (sleeper.time <= targetTime) {
        toResolve.push(sleeper.resolve);
        this.sleepers.delete(id);
      }
    }

    // Update time
    this.currentTime = targetTime;

    // Execute callbacks after time update
    for (const callback of toFire) {
      callback();
    }

    // Resolve sleepers
    for (const resolve of toResolve) {
      resolve();
    }
  }
}

/**
 * Real-time clock - uses actual system time and delays
 */
export class RealtimeClock implements Clock {
  private startTime: number = Date.now();

  now(): number {
    return Date.now() - this.startTime;
  }

  sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }

      const timeoutId = setTimeout(resolve, ms);

      const onAbort = () => {
        clearTimeout(timeoutId);
        reject(new DOMException('Aborted', 'AbortError'));
      };

      if (signal) {
        signal.addEventListener('abort', onAbort, { once: true });
      }
    });
  }

  setTimeout(callback: () => void, ms: number): number {
    return setTimeout(callback, ms) as unknown as number;
  }

  clearTimeout(id: number): void {
    clearTimeout(id as unknown as NodeJS.Timeout);
  }
}