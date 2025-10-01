/**
 * Select/race utility for "first wins" with automatic cancellation
 */

import type { Clock } from './clock';

export type SelectArm<T> = {
  run: (signal: AbortSignal) => Promise<T>;
};

export type SelectResult<T> = {
  value: T;
  winner: number;
};

/**
 * Race multiple async operations, automatically cancelling losers
 *
 * @param arms Array of operations to race
 * @param parentSignal Optional parent signal for cancellation
 * @returns The value and index of the winner
 */
export async function select<T>(
  arms: SelectArm<T>[],
  parentSignal?: AbortSignal
): Promise<SelectResult<T>> {
  if (arms.length === 0) {
    throw new Error('select requires at least one arm');
  }

  // Create our own abort controller for cancelling losers
  const abortController = new AbortController();

  // Check if already aborted
  if (parentSignal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  // Link to parent signal if provided
  let linkAbort: (() => void) | undefined;

  return await new Promise((resolve, reject) => {
    let settled = false;

    linkAbort = () => {
      if (!settled) {
        settled = true;
        abortController.abort();
        reject(new DOMException('Aborted', 'AbortError'));
      }
    };

    if (parentSignal) {
      parentSignal.addEventListener('abort', linkAbort, { once: true });
    }

    arms.forEach((arm, index) => {
      arm.run(abortController.signal)
        .then(value => {
          if (!settled) {
            settled = true;
            abortController.abort(); // Cancel all losers
            if (parentSignal && linkAbort) {
              parentSignal.removeEventListener('abort', linkAbort);
            }
            resolve({ value, winner: index });
          }
        })
        .catch(error => {
          // Ignore abort errors from losers
          if (!settled && error?.name !== 'AbortError') {
            settled = true;
            abortController.abort();
            if (parentSignal && linkAbort) {
              parentSignal.removeEventListener('abort', linkAbort);
            }
            reject(error);
          }
        });
    });
  })
}

/**
 * Clock-aware timeout helper for select
 */
export function clockTimeout<T>(clock: Clock, ms: number, value: T): SelectArm<T> {
  return {
    run: (signal) =>
      new Promise<T>((resolve, reject) => {
        const timeoutId = clock.setTimeout(() => resolve(value), ms);

        if (signal.aborted) {
          clock.clearTimeout(timeoutId);
          reject(new DOMException('Aborted', 'AbortError'));
          return;
        }

        signal.addEventListener('abort', () => {
          clock.clearTimeout(timeoutId);
          reject(new DOMException('Aborted', 'AbortError'));
        }, { once: true });
      })
  };
}

/**
 * Helper to create an event-based arm for select
 */
export function waitForEvent<T>(
  promise: (signal: AbortSignal) => Promise<T>
): SelectArm<T> {
  return {
    run: promise
  };
}