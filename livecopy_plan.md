# Live Copy Mode Implementation Plan

## Overview

Live Copy mode is a continuous Morse code copying practice mode where:
- Audio plays continuously at standard Morse spacing
- Users type what they hear in real-time
- Evaluation happens with a delay (characters are revealed after the next character starts)
- Two feedback modes: immediate corrections or end-of-session grading

## Architecture

### Core Concept: Two Parallel Processes

1. **Transmission Process**: Plays Morse audio on a fixed schedule
2. **Evaluation Process**: Collects user input and evaluates with proper timing

These processes run independently and are reconciled through a pure function that transforms event streams into display state.

## Implementation Layers

### Layer 1: Runtime (Transmission Only)
**Location**: `src/features/session/runtime/charPrograms.ts`

**Purpose**: Handle audio transmission with proper Morse timing

```typescript
async function runLiveCopyEmission(
  cfg: SessionConfig,
  char: string,
  io: IO,
  clock: Clock,
  sessionSignal: AbortSignal
): Promise<void> {
  const startTime = clock.now();

  // Play audio (wait for completion)
  await io.playChar(char, cfg.wpm);
  const endTime = clock.now();

  // Log transmission event with timing
  io.log({
    type: 'live-copy-transmitted',
    char,
    startTime,
    endTime
  });

  // Standard Morse inter-character spacing (3 dits)
  const ditMs = wpmToDitMs(cfg.wpm);
  await clock.sleep(ditMs * 3, sessionSignal);
}
```

**Key decisions**:
- Does NOT handle input
- Does NOT evaluate correctness
- Just transmits and logs timing

### Layer 2: Live Copy Evaluator (Business Logic)
**New Location**: `src/features/session/livecopy/evaluator.ts`

**Purpose**: Pure function that evaluates Live Copy state from event streams

```typescript
// Event types
export type TransmitEvent = {
  type: 'transmitted'
  char: string
  startTime: number
  endTime: number
}

export type TypedEvent = {
  type: 'typed'
  char: string
  time: number
}

export type LiveCopyEvent = TransmitEvent | TypedEvent

// Display state for each character
export type CharDisplay = {
  char: string                // The correct character
  status: 'pending' | 'correct' | 'wrong' | 'missed'
  typed?: string              // What user actually typed (if wrong)
  revealed: boolean           // Whether to show the correction yet
}

// Complete state including scoring
export type LiveCopyState = {
  display: CharDisplay[]
  score: {
    correct: number
    wrong: number
    missed: number
    total: number
    accuracy: number         // percentage
  }
  currentPosition: number    // Where user is in the sequence
}

// Configuration for evaluation
export type LiveCopyConfig = {
  offset: number             // Milliseconds after char starts (default 100)
  feedbackMode: 'immediate' | 'end'
}

// Main evaluation function (pure)
export function evaluateLiveCopy(
  events: LiveCopyEvent[],
  currentTime: number,
  config: LiveCopyConfig
): LiveCopyState {
  // Implementation details below
}
```

**Evaluation Algorithm**:

1. **Parse events** into transmitted and typed arrays
2. **Calculate windows** for each transmitted character:
   - Input window: `startTime + offset` to `nextStartTime + offset`
   - Reveal time: `nextStartTime + offset`
3. **Align typed characters** to windows:
   - Find which typed character (if any) falls in each window
   - Use FIRST character typed in each window
4. **Determine status** for each position:
   - `correct`: User typed correct character in window
   - `wrong`: User typed wrong character in window
   - `missed`: User typed nothing in window
   - `pending`: Window hasn't closed yet
5. **Determine reveal state**:
   - For immediate mode: Reveal when typed (wrong) or at reveal time (missed)
   - For end mode: Never reveal during session
6. **Calculate score** from statuses

**Key behaviors**:
- Characters typed show immediately (even before evaluation)
- Corrections appear at proper reveal time
- Only first character in each window counts
- Windows are based on transmission timing + offset

### Layer 3: Event Collection Hook
**New Location**: `src/features/session/livecopy/useLiveCopy.ts`

**Purpose**: React hook to collect events and manage timing

```typescript
export function useLiveCopy(isActive: boolean) {
  const [events, setEvents] = useState<LiveCopyEvent[]>([]);
  const [currentTime, setCurrentTime] = useState(0);

  // Collect keyboard events
  useEffect(() => {
    if (!isActive) return;

    const handleKey = (e: KeyboardEvent) => {
      // Ignore special keys
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Handle backspace
      if (e.key === 'Backspace') {
        e.preventDefault();
        // Remove last typed event
        setEvents(prev => {
          const typed = prev.filter(e => e.type === 'typed');
          if (typed.length === 0) return prev;

          const lastTyped = typed[typed.length - 1];
          return prev.filter(e => e !== lastTyped);
        });
        return;
      }

      // Handle character input
      if (e.key.length === 1) {
        e.preventDefault();
        setEvents(prev => [...prev, {
          type: 'typed',
          char: e.key.toUpperCase(),
          time: performance.now()
        }]);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isActive]);

  // Update current time for reveal timing
  useEffect(() => {
    if (!isActive) return;

    const timer = setInterval(() => {
      setCurrentTime(performance.now());
    }, 50); // 50ms for smooth reveals

    return () => clearInterval(timer);
  }, [isActive]);

  // Add transmission events as they arrive
  const addTransmitEvent = useCallback((event: TransmitEvent) => {
    setEvents(prev => [...prev, event]);
  }, []);

  const reset = useCallback(() => {
    setEvents([]);
    setCurrentTime(performance.now());
  }, []);

  return { events, currentTime, addTransmitEvent, reset };
}
```

### Layer 4: UI Component (Display Only)
**Location**: `src/components/LiveCopy.tsx` (refactored)

**Purpose**: Pure display component

```typescript
import { LiveCopyState } from '../features/session/livecopy/evaluator';

export function LiveCopyDisplay({
  state,
  phase
}: {
  state: LiveCopyState
  phase: 'idle' | 'running' | 'ended'
}) {
  if (phase === 'ended') {
    return <LiveCopyResults state={state} />;
  }

  return (
    <div className="livecopy-display">
      <div className="character-stream font-mono text-2xl">
        {state.display.map((char, i) => {
          // Determine what to show
          let content = '';
          let className = '';

          if (!char.revealed && char.typed) {
            // User typed something, not evaluated yet
            content = char.typed;
            className = 'text-gray-800'; // Neutral
          } else if (char.revealed) {
            // Evaluation complete
            content = char.char; // Show correct char
            className =
              char.status === 'correct' ? 'text-green-600' :
              char.status === 'wrong' ? 'text-red-600' :
              char.status === 'missed' ? 'text-red-400' :
              'text-gray-400';
          } else if (char.status === 'pending') {
            // Nothing typed yet, window still open
            content = '_'; // Or empty
            className = 'text-gray-300';
          }

          return (
            <span key={i} className={className}>
              {content}
            </span>
          );
        })}
      </div>

      {/* Live statistics */}
      <div className="stats mt-4">
        <span>Accuracy: {state.score.accuracy}%</span>
        <span className="ml-4">Position: {state.currentPosition}/{state.score.total}</span>
      </div>
    </div>
  );
}

function LiveCopyResults({ state }: { state: LiveCopyState }) {
  return (
    <div className="results p-4 bg-gray-50 rounded">
      <h3>Session Complete</h3>
      <div>Correct: {state.score.correct}</div>
      <div>Wrong: {state.score.wrong}</div>
      <div>Missed: {state.score.missed}</div>
      <div>Accuracy: {state.score.accuracy}%</div>

      <div className="mt-4">
        <h4>Your Copy:</h4>
        <div className="font-mono">
          {state.display.map((char, i) => (
            <span
              key={i}
              className={
                char.status === 'correct' ? 'text-green-600' :
                char.status === 'wrong' ? 'text-red-600' :
                'text-red-400'
              }
            >
              {char.typed || '_'}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### Layer 5: Integration in StudyPage
**Location**: `src/pages/StudyPage.tsx`

**Purpose**: Wire everything together

```typescript
import { useLiveCopy } from '../features/session/livecopy/useLiveCopy';
import { evaluateLiveCopy } from '../features/session/livecopy/evaluator';
import { LiveCopyDisplay } from '../components/LiveCopy';

export function StudyPage() {
  // ... existing code ...

  // Live Copy mode integration
  const isLiveCopyActive =
    config?.mode === 'live-copy' &&
    studyPhase === 'session' &&
    snapshot.phase === 'running';

  const {
    events,
    currentTime,
    addTransmitEvent,
    reset: resetLiveCopy
  } = useLiveCopy(isLiveCopyActive);

  // Collect transmission events from runtime
  useEffect(() => {
    // Subscribe to IO snapshot updates
    const unsubscribe = runner?.subscribe((snapshot) => {
      // Look for transmission events in the log
      const lastEvent = snapshot.log?.[snapshot.log.length - 1];
      if (lastEvent?.type === 'live-copy-transmitted') {
        addTransmitEvent(lastEvent);
      }
    });

    return unsubscribe;
  }, [runner, addTransmitEvent]);

  // Evaluate Live Copy state
  const liveCopyState = useMemo(
    () => {
      if (config?.mode !== 'live-copy') return null;

      return evaluateLiveCopy(
        events,
        currentTime,
        {
          offset: 100, // 100ms after char starts
          feedbackMode: config.liveCopyFeedback || 'immediate'
        }
      );
    },
    [events, currentTime, config]
  );

  // Reset on new session
  useEffect(() => {
    if (studyPhase === 'countdown') {
      resetLiveCopy();
    }
  }, [studyPhase, resetLiveCopy]);

  // ... existing render code ...

  // In render, replace character display for Live Copy
  {config?.mode === 'live-copy' && liveCopyState ? (
    <LiveCopyDisplay
      state={liveCopyState}
      phase={snapshot.phase}
    />
  ) : (
    <CharacterHistory items={snapshot.previous} />
  )}
}
```

## Implementation Steps

### Step 1: Update Runtime
1. Modify `runLiveCopyEmission` to log timing events
2. Ensure IO interface supports `live-copy-transmitted` event type
3. Test transmission timing with mock IO

### Step 2: Create Evaluator Module
1. Create `src/features/session/livecopy/` directory
2. Implement `evaluator.ts` with types and pure function
3. Write comprehensive tests for evaluation logic
4. Test edge cases:
   - User starts late
   - User types ahead
   - Backspace handling
   - Multiple chars in one window

### Step 3: Create Event Collection Hook
1. Implement `useLiveCopy.ts` hook
2. Test keyboard event handling
3. Test timing updates
4. Test event accumulation

### Step 4: Update UI Component
1. Refactor `LiveCopy.tsx` to use new state shape
2. Remove old `applyCorrections` logic
3. Implement proper reveal timing display
4. Add session-end results view

### Step 5: Wire Everything Together
1. Update `StudyPage.tsx` to use new hooks
2. Connect transmission events from runtime
3. Test end-to-end flow
4. Verify timing behavior matches spec

### Step 6: Testing & Polish
1. Add integration tests for complete flow
2. Test both feedback modes (immediate/end)
3. Verify timing windows work correctly
4. Test performance with long sessions
5. Add any missing TypeScript types

## Key Technical Decisions

### Why Pure Function for Evaluation?
- Deterministic and testable
- Can be memoized for performance
- Easy to reason about
- No hidden state or side effects

### Why Separate Event Streams?
- Clean separation between transmission and input
- Can replay sessions for debugging
- Events are immutable and auditable
- Easy to add features like session recording

### Why 50ms Timer for Current Time?
- Smooth reveal animations
- Responsive to window boundaries
- Low overhead
- Can be adjusted for performance

### Why Offset of 100ms?
- Gives users time to process audio start
- Matches human reaction time
- Can be made configurable later
- Consistent with Morse code learning practices

## Success Criteria

1. **Timing Correctness**
   - Characters reveal at `nextCharStart + 100ms`
   - Input windows align properly
   - No timing drift over long sessions

2. **User Experience**
   - Typed characters appear immediately
   - Corrections appear at right time
   - Clear visual feedback
   - Smooth performance

3. **Code Quality**
   - Pure evaluation function with tests
   - Clean separation of concerns
   - No memory leaks
   - TypeScript types throughout

4. **Feature Completeness**
   - Both feedback modes work
   - Backspace handling
   - Accurate scoring
   - Session results display

## Future Enhancements

1. **Configurable offset** - Let users adjust the 100ms offset
2. **Session recording** - Save event streams for replay
3. **Advanced scoring** - Partial credit, timing bonuses
4. **Statistics tracking** - Historical performance data
5. **Export functionality** - Download session results
6. **Adaptive difficulty** - Adjust speed based on performance