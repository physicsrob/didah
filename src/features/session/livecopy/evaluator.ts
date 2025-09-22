/**
 * Live Copy evaluation logic
 * Pure functions for evaluating Live Copy state from event streams
 */

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
  revealed: boolean; // Whether to show the correction yet
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
  currentPosition: number; // Where user is in the sequence
};

// Configuration for evaluation
export type LiveCopyConfig = {
  offset: number; // Milliseconds after char starts (default 100)
  feedbackMode: 'immediate' | 'end';
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
    const revealTime = windowEnd;

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

    // Determine if revealed
    let revealed: boolean;
    if (config.feedbackMode === 'immediate') {
      // In immediate mode:
      // - Only reveal when status is determined (window closed)
      // - While pending, show typed character but don't reveal correct answer
      if (status === 'correct' || status === 'wrong') {
        revealed = true;
      } else if (status === 'missed') {
        revealed = currentTime >= revealTime;
      } else {
        // Status is pending - don't reveal the correct answer yet
        // Let user see what they typed without distraction
        revealed = false;
      }
    } else {
      // End mode: never reveal during session
      revealed = false;
    }

    return {
      char: tx.char,
      status,
      typed: typedChar,
      revealed,
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

  // Current position is the number of evaluated characters
  const currentPosition = display.filter((d) => d.status !== 'pending').length;

  return {
    display,
    score,
    currentPosition,
  };
}

/**
 * Helper function to get the display text for a character
 */
export function getCharDisplayText(char: CharDisplay): string {
  if (!char.revealed && char.typed) {
    // User typed something, not evaluated yet
    return char.typed;
  } else if (char.revealed) {
    // Evaluation complete, show correct char
    return char.char;
  } else if (char.status === 'pending' && char.typed) {
    // User typed something in current window
    return char.typed;
  } else if (char.status === 'pending') {
    // Nothing typed yet, window still open
    return '_';
  } else {
    // Not revealed yet (end mode)
    return char.typed || '_';
  }
}

/**
 * Helper function to get the CSS class for a character
 */
export function getCharDisplayClass(char: CharDisplay): string {
  if (!char.revealed && char.typed) {
    // User typed something, not evaluated yet - neutral
    return 'text-gray-800';
  } else if (char.revealed) {
    // Evaluation complete
    switch (char.status) {
      case 'correct':
        return 'text-green-600';
      case 'wrong':
        return 'text-red-600';
      case 'missed':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  } else if (char.status === 'pending') {
    // Window still open
    return char.typed ? 'text-gray-800' : 'text-gray-300';
  } else {
    // Not revealed (end mode)
    return 'text-gray-800';
  }
}