# Morse Code App Architecture

## Overview

This document describes the ACTUAL architecture as implemented, following the runtime-based approach from `plan_update.md`. The system uses a linear, async/await-based design that prioritizes simplicity and readability over complex state machines.

## Core Architectural Principles

### Single Conductor Pattern
The entire session is orchestrated by a single async function that runs a straightforward loop: emit character → wait for input/timeout → feedback → next. This eliminates the complexity of distributed state management.

For Active mode: `playChar('H')` → `race(firstCorrectKey === 'H', timeout)` → feedback → next
For Passive mode: `playChar('H')` → `sleep(preReveal)` → `reveal('H')` → `sleep(postReveal)` → next

Everything is linear code—no distributed timers, no "audioEnded" events, no cross-layer epoch tracking.

### Centralized Timing
All timing operations go through a Clock abstraction with AbortSignal-based cancellation. The Clock provides:
- `now()`: Current time in milliseconds
- `sleep(ms, signal)`: Cancelable delay

No scattered setTimeout calls, no epoch accounting, no guards calling into other layers. All waits are centralized through `sleep` and `select`, making concurrency explicit only where needed.

### IO Abstraction
All side effects (audio, visual feedback, logging) are isolated behind a simple IO interface. The session logic calls IO methods directly without an intermediate "effects runner." The IO interface provides:
- `playChar(char)`: Start audio playback (async, resolves when done)
- `stopAudio()`: Stop current audio
- `reveal(char)` / `hide()`: Passive mode display control
- `feedback(kind, char)`: Trigger error feedback
- `replay(char)`: Show missed character with audio
- `log(event)`: Record session events

### Race/Select Utility
A small utility handles "first wins" scenarios (e.g., correct keypress vs timeout) with automatic cancellation of the loser. When one promise wins, the others are automatically aborted via their AbortSignals. This makes concurrent operations explicit and manageable, eliminating timer races and leaked timeouts.

## System Architecture

### 1. Core Domain (`/src/core/`)

**Morse Timing Engine** - Pure functions for timing calculations
- WPM to dit length conversion (1200/WPM ms formula)
- Speed tier multipliers (slow=5x, medium=3x, fast=2x, lightning=1x dit)
- Character duration calculations including intra-symbol spacing
- Passive mode reveal timings

**Morse Alphabet** - Character to Morse pattern mappings
- Complete coverage: letters, numbers, standard and advanced punctuation
- Case-insensitive lookups
- Pattern-based duration calculations

**Domain Types** - TypeScript definitions
- SessionConfig, SpeedTier, and other core types
- Shared across the application for type safety

### 2. Session Runtime (`/src/features/session/runtime/`)

**Clock** - Time abstraction for testability
- SystemClock for production (uses performance.now)
- Supports test clocks for deterministic testing
- AbortSignal integration for cancellation

**InputBus** - Keyboard input event stream
- Push/pull interface for key events
- Observable pattern for monitoring all keypresses
- Predicate-based waiting (e.g., wait for correct key)

**IO Interface** - Side effect abstraction
- playChar/stopAudio for Morse playback
- reveal/hide for passive mode display
- feedback for error indication
- replay for showing missed characters
- log for event recording

**Select Utility** - Race condition handler
- Manages concurrent promises (input vs timeout)
- Automatic cancellation of non-winners
- Clean AbortSignal propagation

**Character Programs** - Core emission logic
- runActiveEmission: handles active mode (input during audio, timeout windows)
- runPassiveEmission: handles passive mode (play, wait, reveal, wait)
- Centralized timing logic with proper Morse spacing

**Session Program** - Main orchestrator
- createSessionRunner: factory for session runners
- Single async loop managing the entire session
- Time budget enforcement
- Clean start/stop with AbortController

### 3. Audio & Feedback (`/src/features/session/services/`)

**AudioEngine** - WebAudio-based Morse generation
- Shaped envelopes to prevent clicks
- Dit/dah timing based on WPM
- Character-to-audio using alphabet patterns
- Async control (play, stop, dispose)

**Feedback Adapters** - Error indication
- BuzzerFeedback: audio-based error sound
- FlashFeedback: visual screen flash
- CombinedFeedback: both audio and visual
- Factory pattern for easy selection

### 4. UI Layer (`/src/pages/`)

**StudyPage** - Main practice interface
- React hooks connecting to runtime
- Session configuration controls
- Live display of current/previous characters
- Accuracy statistics within session
- Inline styles (tech debt)

Connection to runtime (simplified):
```javascript
// Create runtime dependencies
const clock = useMemo(() => new SystemClock(), [])
const input = useMemo(() => new SimpleInputBus(), [])
const io = useMemo(() => createIOAdapter({
  audioEngine,
  feedback,
  onReveal: setRevealedChar,
  onHide: () => setRevealedChar(null),
  onSnapshot: setSnapshot
}), [audioEngine, feedback])

// Create and subscribe to session runner
const runner = useMemo(() =>
  createSessionRunner({ clock, io, input, source }),
  [clock, io, input, source]
)

// Push keyboard events to input bus
useEffect(() => {
  const onKey = (e) => input.push({
    at: performance.now(),
    key: e.key
  })
  window.addEventListener('keydown', onKey)
  return () => window.removeEventListener('keydown', onKey)
}, [input])
```

**App** - Minimal wrapper
- Currently just renders StudyPage
- No routing implemented yet

## Data Flow

### Session Lifecycle

1. **Initialization**
   - User configures session (mode, speed, duration)
   - StudyPage creates runtime dependencies (Clock, InputBus, IO adapter)
   - Session runner created with dependencies

2. **Active Mode Flow**
   - Fetch character from source
   - Start audio playback (non-blocking) - input window opens immediately
   - Race: wait for correct key OR timeout
   - If correct: stop audio immediately, positive feedback, advance
   - If timeout: negative feedback, optional replay showing the character, advance
   - Add inter-character spacing (3 dits per Morse standard)
   - Repeat until time budget exhausted

   **Key policies:**
   - Input window opens at audio start (not after)
   - Latency measured from audio end to correct key (0 if pressed during audio)
   - On correct input during audio, stop playback immediately
   - On incorrect key, log it and optionally buzz, but don't advance
   - On timeout, show character replay if enabled
   - No retries - failed characters advance to next

3. **Passive Mode Flow**
   - Fetch character from source
   - Play audio (blocking - wait for completion)
   - Wait pre-reveal delay (2-3 dits depending on speed)
   - Show character
   - Wait post-reveal delay (1-3 dits depending on speed)
   - Hide character and advance
   - Repeat until time budget exhausted

   **Timing by speed tier:**
   - Slow: 3 dits → reveal → 3 dits
   - Medium: 3 dits → reveal → 2 dits
   - Fast: 2 dits → reveal → 1 dit
   - Lightning: 2 dits → reveal → 1 dit (same as fast)

### Input Handling

- Keyboard events captured at window level
- Pushed to InputBus with timestamp: `input.push({ at: performance.now(), key: e.key })`
- Active mode monitors for correct key while logging incorrect attempts
- Uses observable pattern to log all keypresses during input window
- Latency measured from audio end to correct key (or 0 if key pressed before audio ends)

### Timing Management

- **Dit length**: 1200/WPM milliseconds (standard CW formula)
- **Recognition windows** (Active mode):
  - Slow: 5×dit
  - Medium: 3×dit
  - Fast: 2×dit
  - Lightning: 1×dit
  - Minimum window enforced (at least 60ms or 1 dit, whichever is larger)
- **Passive mode delays**:
  - Pre-reveal: 2-3 dits depending on speed
  - Post-reveal: 1-3 dits depending on speed
- **Inter-character spacing**: 3 dits (Morse standard)
- **Intra-symbol spacing**: 1 dit between dits/dahs within a character

### Session End Policies

- **Time budget**: Session ends after current emission completes (no mid-tone cut)
- **User stop**: Aborts immediately via AbortController
- **No partial emissions**: Always complete or skip entire character

## What's NOT Implemented

### Storage & Persistence
- No event log persistence
- No session history
- No user settings storage
- No data export/import

### Statistics
- No historical tracking
- No accuracy over time
- No confusion matrix
- No study time aggregation

### Text Sources
- Only random letters implemented
- Missing: weighted words, RSS feeds, hard characters

### Multi-Page Application
- No routing
- No statistics page
- No settings page
- No text source configuration

## File Organization

```
/src
  /core                    # Domain logic (no UI dependencies)
    /morse
      alphabet.ts         # Morse patterns
      timing.ts           # Timing calculations
    /types
      domain.ts           # Shared types

  /features
    /session
      /runtime            # Main session orchestration
        clock.ts
        inputBus.ts
        io.ts
        select.ts
        charPrograms.ts
        sessionProgram.ts
        ioAdapter.ts
      /services
        audioEngine.ts    # WebAudio implementation
        /feedback         # Feedback implementations

    /sources              # Text source providers
      /providers
        randomLetters.ts  # Only one implemented

  /pages                  # React components
    StudyPage.tsx

  /tests                  # Test files
    timing.test.ts
    audioEngine.integration.test.ts

  /cli                    # CLI tools (should be moved)
```

## Key Design Decisions

### Why Runtime Over State Machine
The original plan called for a state machine with transitions and effects. The implemented runtime approach is simpler:
- **Linear code flow** - You can read the timing logic top-to-bottom in one function
- **Explicit timing** - Every delay and timeout is visible in the code path
- **Easier debugging** - Step through one async function instead of tracing state transitions
- **Simpler testing** - Inject fake clock and inputs, advance time deterministically
- **No distributed timers** - All timing goes through centralized Clock abstraction
- **Automatic cleanup** - AbortSignal cascades cancel all child operations

Example of the simplicity - Active mode in pseudocode:
```
async function runActiveEmission(char) {
  playChar(char)  // don't await
  result = race(correctKey(char), timeout(window))
  if (result === correct) {
    stopAudio()
    feedback('correct')
  } else {
    feedback('timeout')
    if (replay) await replay(char)
  }
}
```

Compare this to a state machine with states like `EMITTING`, `AWAITING_INPUT`, `FEEDBACK`, each with their own timers and transition logic.

### Why IO Abstraction
Separating side effects from logic enables:
- **Easy testing** - Mock IO for deterministic tests
- **Multiple implementations** - CLI vs browser vs future platforms
- **Clear boundaries** - Session logic doesn't know about DOM or WebAudio
- **Future flexibility** - Add new feedback types without touching core logic

The IO interface is intentionally minimal - just the operations needed for a session, no timing logic.

### Why InputBus
Decoupling input from session logic allows:
- **Testing without DOM** - Push synthetic events in tests
- **Multiple input sources** - Keyboard, touch, voice, etc.
- **Clean separation** - React components just push events, don't know about session logic
- **Observable pattern** - Monitor all attempts for logging incorrect keys

The InputBus uses a push/pull model: push events in, pull them out with predicates.

### Why Select/Race Utility
Managing concurrent operations (input vs timeout) needs careful handling:
- **Automatic cancellation** - Losing promises are aborted via their signals
- **No leaked timers** - AbortSignal ensures cleanup
- **Explicit concurrency** - Only where actually needed (the race)
- **Composable** - Can race any number of operations

## Future Architecture Considerations

### Adding Persistence
- Implement EventLog with localStorage/IndexedDB backend
- Add repository pattern for data access
- Include migration system for schema evolution

### Adding Statistics
- Build selectors that compute from event logs
- Add caching layer for expensive calculations
- Create chart components with time window controls

### Adding Multiple Pages
- Introduce React Router or TanStack Router
- Create layout component with navigation
- Add route guards for unsaved changes

### Production Deployment
- Add error boundaries
- Implement proper error logging
- Add performance monitoring
- Configure Vercel deployment
- Create RSS proxy serverless function

## Testing Strategy

### Unit Tests
- Pure functions (timing calculations, alphabet lookups)
- Runtime logic with fake clock and inputs
- Select utility race conditions
- Character emission flows with deterministic timing

Example test approach with fake clock:
```
const clock = new FakeClock()
const input = new SimpleInputBus()
const io = mockIO()

// Start emission
runActiveEmission(config, 'A', io, input, clock, signal)

// Advance time, push input
clock.advance(100)
input.push({ at: 100, key: 'A' })

// Verify correct outcome
```

### Integration Tests
- Audio engine with actual WebAudio
- Full session flow with mock IO
- React component rendering
- End-to-end session with time advancement

### What's NOT Tested
- Audio playback quality
- Visual feedback appearance
- Browser compatibility
- Performance under load

### Test Coverage Goals
- Core logic: 100% coverage (timing, alphabet, runtime)
- UI components: Smoke tests (renders without crashing)
- Integration: Happy paths + key edge cases

## Performance Considerations

### Current State
- No performance optimizations
- Inline styles parsed on each render
- No memoization of expensive calculations
- No code splitting

### Future Optimizations
- Extract styles to CSS modules
- Memoize timing calculations
- Precompute audio buffers
- Implement virtual scrolling for long character lists
- Add React.memo where beneficial

## Security Considerations

### Current Risks
- No input validation on session config
- No rate limiting on session starts
- No protection against localStorage quota

### Future Mitigations
- Validate all user inputs
- Add rate limiting
- Handle quota errors gracefully
- Sanitize any user-generated content

## Conclusion

The implemented architecture prioritizes simplicity and correctness over premature optimization. The runtime approach has proven easier to understand and debug than the originally planned state machine. The main gaps are in persistence, statistics, and multi-page support rather than core functionality.

Next steps should focus on adding data persistence and basic statistics before expanding to multiple text sources or advanced features. The architecture is flexible enough to support these additions without major refactoring.
