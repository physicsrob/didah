/**
 * Input bus for handling keyboard events in a testable way
 */

export type KeyEvent = {
  at: number;  // timestamp in ms
  key: string; // the key pressed
};

export interface InputBus {
  /**
   * Push a key event to all listeners
   */
  push(event: KeyEvent): void;

  /**
   * Wait for the first event that matches the predicate
   */
  takeUntil(
    predicate: (event: KeyEvent) => boolean,
    signal?: AbortSignal
  ): Promise<KeyEvent>;

  /**
   * Observe all events (for logging incorrect keys)
   */
  observe(
    fn: (event: KeyEvent) => void,
    signal?: AbortSignal
  ): void;

  /**
   * Clear all listeners (useful for cleanup)
   */
  clear(): void;
}

/**
 * Simple implementation of InputBus
 */
export class SimpleInputBus implements InputBus {
  private listeners = new Set<(event: KeyEvent) => void>();
  private waiters: Array<{
    predicate: (event: KeyEvent) => boolean;
    resolve: (event: KeyEvent) => void;
    reject: (err: Error) => void;
  }> = [];

  push(event: KeyEvent): void {
    // Notify all observers
    this.listeners.forEach(listener => listener(event));

    // Check waiters for matches
    const matchingWaiter = this.waiters.find(w => w.predicate(event));
    if (matchingWaiter) {
      // Remove the waiter and resolve
      this.waiters = this.waiters.filter(w => w !== matchingWaiter);
      matchingWaiter.resolve(event);
    }
  }

  takeUntil(
    predicate: (event: KeyEvent) => boolean,
    signal?: AbortSignal
  ): Promise<KeyEvent> {
    return new Promise<KeyEvent>((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }

      const waiter = { predicate, resolve, reject };
      this.waiters.push(waiter);

      if (signal) {
        const onAbort = () => {
          const index = this.waiters.indexOf(waiter);
          if (index >= 0) {
            this.waiters.splice(index, 1);
            reject(new DOMException('Aborted', 'AbortError'));
          }
        };
        signal.addEventListener('abort', onAbort, { once: true });
      }
    });
  }

  observe(fn: (event: KeyEvent) => void, signal?: AbortSignal): void {
    this.listeners.add(fn);

    if (signal) {
      const onAbort = () => this.listeners.delete(fn);
      signal.addEventListener('abort', onAbort, { once: true });
    }
  }

  clear(): void {
    this.listeners.clear();
    this.waiters.forEach(w => w.reject(new Error('InputBus cleared')));
    this.waiters = [];
  }
}

/**
 * Test helper for simulating key events
 */
export class TestInputBus extends SimpleInputBus {
  /**
   * Simulate typing a character at a specific time
   */
  type(key: string, at: number): void {
    this.push({ key, at });
  }

  /**
   * Simulate typing a string of characters with timing
   */
  typeString(text: string, startAt: number, intervalMs: number): void {
    for (let i = 0; i < text.length; i++) {
      this.type(text[i], startAt + i * intervalMs);
    }
  }
}