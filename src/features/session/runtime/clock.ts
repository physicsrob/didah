/**
 * Clock abstraction for deterministic time control in tests
 */

export interface Clock {
  /**
   * Get current time in milliseconds
   */
  now(): number;

  /**
   * Sleep for specified milliseconds, with cancellation support
   */
  sleep(ms: number, signal?: AbortSignal): Promise<void>;

  /**
   * Schedule a callback to run after specified milliseconds
   * Returns a timer ID that can be used to cancel
   */
  setTimeout(callback: () => void, ms: number): number;

  /**
   * Cancel a previously scheduled timeout
   */
  clearTimeout(id: number): void;
}

/**
 * Real system clock implementation using performance.now() and setTimeout
 */
export class SystemClock implements Clock {
  now(): number {
    return performance.now();
  }

  sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timeoutId = this.setTimeout(resolve, ms);

      const onAbort = () => {
        this.clearTimeout(timeoutId);
        reject(new DOMException('Aborted', 'AbortError'));
      };

      if (signal) {
        if (signal.aborted) {
          onAbort();
          return;
        }
        signal.addEventListener('abort', onAbort, { once: true });
      }
    });
  }

  setTimeout(callback: () => void, ms: number): number {
    return setTimeout(callback, ms) as unknown as number;
  }

  clearTimeout(id: number): void {
    clearTimeout(id);
  }
}

/**
 * Fake clock for testing with manual time control
 */
export class FakeClock implements Clock {
  private currentTime = 0;
  private nextTimerId = 1;
  private sleepers: Array<{
    resolveAt: number;
    resolve: () => void;
    reject: (err: Error) => void;
    signal?: AbortSignal;
  }> = [];
  private timers: Map<number, {
    callback: () => void;
    runAt: number;
  }> = new Map();

  now(): number {
    return this.currentTime;
  }

  sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }

      const sleeper = {
        resolveAt: this.currentTime + ms,
        resolve,
        reject,
        signal
      };

      this.sleepers.push(sleeper);

      if (signal) {
        const onAbort = () => {
          const index = this.sleepers.indexOf(sleeper);
          if (index >= 0) {
            this.sleepers.splice(index, 1);
            reject(new DOMException('Aborted', 'AbortError'));
          }
        };
        signal.addEventListener('abort', onAbort, { once: true });
      }
    });
  }

  setTimeout(callback: () => void, ms: number): number {
    const id = this.nextTimerId++;
    this.timers.set(id, {
      callback,
      runAt: this.currentTime + ms
    });
    return id;
  }

  clearTimeout(id: number): void {
    this.timers.delete(id);
  }

  /**
   * Advance time by specified milliseconds and resolve any sleepers and timers
   */
  advance(ms: number): void {
    this.currentTime += ms;

    // Process sleepers that should resolve
    const toResolve = this.sleepers.filter(s => s.resolveAt <= this.currentTime);
    this.sleepers = this.sleepers.filter(s => s.resolveAt > this.currentTime);

    for (const sleeper of toResolve) {
      if (!sleeper.signal?.aborted) {
        sleeper.resolve();
      }
    }

    // Process timers that should fire
    const timersToRun: Array<() => void> = [];
    for (const [id, timer] of this.timers) {
      if (timer.runAt <= this.currentTime) {
        timersToRun.push(timer.callback);
        this.timers.delete(id);
      }
    }

    // Run timer callbacks after cleaning up
    for (const callback of timersToRun) {
      callback();
    }
  }

  /**
   * Jump to specific time (useful for testing)
   */
  setTime(ms: number): void {
    if (ms < this.currentTime) {
      throw new Error('Cannot go back in time');
    }
    this.advance(ms - this.currentTime);
  }
}