/**
 * Live Copy evaluation logic
 * Pure functions for evaluating Live Copy state from event streams
 */

// Constants
export const LIVE_COPY_INPUT_OFFSET_MS = 100;
export const LIVE_COPY_DISPLAY_UPDATE_INTERVAL_MS = 50;

// Event types
export type TransmitEvent = {
  type: 'transmitted';
  char: string;
  startTime: number;
  duration: number; // Total emission duration (character audio + inter-character spacing)
};

export type TypedEvent = {
  type: 'typed';
  char: string;
  time: number;
};

export type LiveCopyEvent = TransmitEvent | TypedEvent;

// Display state for each character
export type CharDisplay = {
  char: string; // The correct character
  status: 'pending' | 'correct' | 'wrong' | 'missed';
  typed?: string; // What user actually typed (if wrong)
};

// Complete state including scoring
export type LiveCopyState = {
  display: CharDisplay[];
  score: {
    correct: number;
    wrong: number;
    missed: number;
    total: number;
    accuracy: number; // percentage
  };
};

// Configuration for evaluation
export type LiveCopyConfig = {
  offset: number; // Milliseconds after char starts before input window opens
};

/**
 * Main evaluation function (pure)
 * Takes event streams and current time, returns display state
 */
export function evaluateLiveCopy(
  events: LiveCopyEvent[],
  currentTime: number,
  config: LiveCopyConfig
): LiveCopyState {
  // Separate events by type
  const allTransmitted = events.filter(
    (e): e is TransmitEvent => e.type === 'transmitted'
  );
  const typed = events.filter((e): e is TypedEvent => e.type === 'typed');

  // Only process characters whose input window has opened (startTime + offset)
  // This prevents showing underscores for characters that are transmitting but not ready for input
  const transmitted = allTransmitted.filter(tx => tx.startTime + config.offset <= currentTime);

  // Build display array for each transmitted character
  const display: CharDisplay[] = transmitted.map((tx) => {
    // Calculate input window for this character using explicit duration
    const windowStart = tx.startTime + config.offset;
    const windowEnd = tx.startTime + tx.duration + config.offset;

    // Find typed characters in this window (but only those that have already happened)
    const typedInWindow = typed.filter(
      (t) => t.time >= windowStart && t.time < windowEnd && t.time <= currentTime
    );

    // Use first character typed in window (if any)
    const firstTyped = typedInWindow[0];

    // Determine status
    let status: CharDisplay['status'];
    let typedChar: string | undefined;


    if (currentTime < windowStart) {
      // Window hasn't opened yet - character just transmitted
      status = 'pending';
    } else if (currentTime < windowEnd) {
      // Window is currently open
      status = 'pending';
      typedChar = firstTyped?.char;
    } else if (firstTyped) {
      // Window closed, user typed something
      if (firstTyped.char.toUpperCase() === tx.char.toUpperCase()) {
        status = 'correct';
      } else {
        status = 'wrong';
        typedChar = firstTyped.char;
      }
    } else {
      // Window closed, user typed nothing
      status = 'missed';
    }

    return {
      char: tx.char,
      status,
      typed: typedChar,
    };
  });

  // Calculate score
  const score = display.reduce(
    (acc, char) => {
      if (char.status === 'correct') acc.correct++;
      else if (char.status === 'wrong') acc.wrong++;
      else if (char.status === 'missed') acc.missed++;
      if (char.status !== 'pending') acc.total++;
      return acc;
    },
    { correct: 0, wrong: 0, missed: 0, total: 0, accuracy: 0 }
  );

  // Calculate accuracy percentage
  if (score.total > 0) {
    score.accuracy = Math.round((score.correct / score.total) * 100);
  }

  return {
    display,
    score,
  };
}