# New Modes Implementation Plan

## Executive Summary

We're restructuring MorseAcademy's study modes to provide three distinct learning experiences:
1. **Practice** (formerly Active) - Interactive mode where the system waits for user input
2. **Listen** (formerly Passive) - Pure listening mode with timed character reveals
3. **Live Copy** (new) - Real-world simulation where code plays continuously

This document outlines the complete implementation plan to achieve this restructuring.

## Background & Motivation

The current implementation has two modes:
- **Active Mode**: Users hear Morse code and type what they hear, with the system waiting (up to a timeout) for their response
- **Passive Mode**: Users listen to characters which are revealed after playing

While Active mode is effective for learning, it doesn't simulate real-world Morse code copying where the transmission continues regardless of whether you're keeping up. The new **Live Copy** mode addresses this gap by providing a continuous stream that users must copy in real-time.

## User Experience Flow

### Current Flow
```
HomePage ("Start Session" button)
    → SessionConfigPage (choose Active/Passive)
    → StudyPage
```

### New Flow
```
HomePage (3 mode buttons: "Practice", "Listen", "Live Copy")
    → SessionConfigPage (configuration adapted to selected mode)
    → StudyPage
```

## Mode Specifications

### Practice Mode (formerly Active)
- **Behavior**: System plays a character and waits for user input (with timeout)
- **Input Window**: Opens immediately when audio starts
- **Timeout**: Based on speed tier (slow=5×dit, medium=3×dit, fast=2×dit, lightning=1×dit)
- **Feedback**: Immediate on correct/incorrect/timeout
- **Replay**: Optional replay of missed characters
- **Advancement**: Only after user responds or timeout

### Listen Mode (formerly Passive)
- **Behavior**: Characters play and are revealed after a delay
- **No Input**: Pure listening experience
- **Timing**: Speed tier affects reveal delays
- **Display**: Shows character after audio completes

### Live Copy Mode (new)
- **Behavior**: Continuous transmission at configured WPM
- **Input Window**: Entire character duration + small buffer
- **No Timeout**: Stream continues regardless of input
- **No Stopping**: Audio plays to completion even if user types correctly
- **Scoring**: Evaluates whatever was typed during the window
- **Advancement**: Automatic based on timing, not user input
- **No Replay**: Mimics real-world conditions

## Architecture Overview

The codebase uses a runtime-based orchestration pattern with:
- **Clock abstraction** for testable timing
- **InputBus** for keyboard event handling
- **IO interface** for side effects
- **Character emission functions** for each mode

Adding Live Copy mode fits cleanly into this architecture by adding a new emission function.

## Implementation Plan

### Phase 1: Complete Mode Rename (Active→Practice, Passive→Listen)
**Goal**: Get the app fully working with renamed modes before adding Live Copy

#### Phase 1.1: Update Type Definitions
**Files to modify**:
- `src/core/types/domain.ts`
  - Line 9: `mode: "active" | "passive"` → `mode: "practice" | "listen"`
  - Line 19: Same change for SessionConfig type
- `src/features/session/runtime/charPrograms.ts`
  - Line 14: Update SessionConfig mode type

#### Phase 1.2: Rename Emission Functions
**File**: `src/features/session/runtime/charPrograms.ts`

**Changes**:
1. Rename `runActiveEmission` → `runPracticeEmission`
2. Rename `runPassiveEmission` → `runListenEmission`
3. Update all exports

#### Phase 1.3: Update Session Orchestrator
**File**: `src/features/session/runtime/sessionProgram.ts`

**Changes**:
1. Update imports for renamed functions
2. Update mode conditionals (lines 181-209):
   - Replace `'active'` with `'practice'`
   - Replace `'passive'` with `'listen'`
3. Update any mode-related comments

#### Phase 1.4: Update UI Components
**Files to modify**:
- `src/pages/StudyPage.tsx`
  - Update mode references in state and display
  - Update any mode-related text (e.g., "Active" → "Practice")
- `src/pages/SessionConfigPage.tsx`
  - Line 8: Update SessionMode type
  - Lines 90-112: Update mode selector values and labels
  - Update any conditional logic checking mode values
- `src/pages/HomePage.tsx` (if it references modes)
- `src/pages/SettingsPage.tsx` (if it exists and references modes)

#### Phase 1.5: Update Tests
**Files**: All test files in `src/tests/` and `src/features/session/runtime/__tests__/`

**Changes**:
1. Global search and replace:
   - `'active'` → `'practice'`
   - `'passive'` → `'listen'`
   - `runActiveEmission` → `runPracticeEmission`
   - `runPassiveEmission` → `runListenEmission`

#### Phase 1.6: Update Other References
**Global search for any remaining references**:
- Search for string literals `'active'` and `'passive'`
- Check localStorage keys
- Check any configuration files
- Update comments and documentation references

**At the end of Phase 1, the app should be fully functional with Practice and Listen modes**

### Phase 2: Add Live Copy Scaffolding (App Remains Functional)
**Goal**: Add all UI and type system support for Live Copy mode, with temporary fallback behavior

#### Phase 2.1: Update Type System
**Files to modify**:
- `src/core/types/domain.ts`
  - Line 9 & 19: `mode: "practice" | "listen"` → `mode: "practice" | "listen" | "live-copy"`
- `src/pages/SessionConfigPage.tsx`
  - Update SessionMode type to include 'live-copy'

#### Phase 2.2: Update HomePage with Three Mode Buttons
**File**: `src/pages/HomePage.tsx`

**Changes**:
1. Remove single "Start Session" button
2. Add three buttons:
   - "Practice" → navigates to `/session-config` with `state: {mode: 'practice'}`
   - "Listen" → navigates to `/session-config` with `state: {mode: 'listen'}`
   - "Live Copy" → navigates to `/session-config` with `state: {mode: 'live-copy'}`
3. Each button should initialize audio (maintaining user gesture context)
4. Add brief descriptions under each button

#### Phase 2.3: Update SessionConfigPage
**File**: `src/pages/SessionConfigPage.tsx`

**Changes**:
1. Accept mode from navigation state: `const { mode } = useLocation().state`
2. Remove mode selection UI (since mode is pre-selected from HomePage)
3. Handle 'live-copy' mode in conditional logic:
   - Hide replay option for Live Copy (like Listen mode)
   - Hide feedback options for Live Copy
   - Show appropriate helper text for each mode
4. Update any mode === 'active' checks to mode === 'practice'
5. Update any mode === 'passive' checks to mode === 'listen'

#### Phase 2.4: Add Temporary Live Copy Handler in Session Orchestrator
**File**: `src/features/session/runtime/sessionProgram.ts`

**Changes**:
1. Update the mode conditional to handle 'live-copy':
```typescript
switch(config.mode) {
  case 'practice':
    // existing practice mode logic
    break;
  case 'listen':
    // existing listen mode logic
    break;
  case 'live-copy':
    // TODO: Implement real Live Copy logic
    // For now, fall back to practice mode behavior
    await runPracticeEmission(...)
    // Log that this is temporary
    console.log('Live Copy mode currently using Practice mode logic (temporary)')
    break;
}
```

#### Phase 2.5: Update StudyPage Display
**File**: `src/pages/StudyPage.tsx`

**Changes**:
1. Update mode display to show "Live Copy" when mode === 'live-copy'
2. Ensure all mode checks handle the new 'live-copy' value

**At the end of Phase 2:**
- App remains fully functional
- All three modes are selectable
- Practice and Listen work as before
- Live Copy works but behaves like Practice mode (temporarily)
- UI properly reflects all three modes
- Type system supports all three modes

### Phase 3: Implement Real Live Copy Behavior
**Goal**: Replace the temporary Live Copy implementation with the actual continuous transmission mode

## Refined Architecture (Updated)

### Core Insight
Live Copy is architecturally similar to Listen mode - both are transmission modes with fixed timing. The key difference is Live Copy collects parallel user input.

**Design Principle**: Treat Live Copy as a transmission mode (like Listen) with parallel input collection, NOT as an interactive mode (like Practice).

### Architecture Overview

1. **Runtime Layer**: Handles only transmission (like Listen mode)
   - Plays audio on schedule
   - Logs transmitted characters
   - No input handling or scoring

2. **UI Layer**: Handles all interaction
   - Multi-line textarea for user input
   - Real-time corrections (Mode 2)
   - Final grading (Mode 1)

3. **Two Sub-Modes**:
   - **Mode 1**: Grade at end of session only
   - **Mode 2**: Live corrections - replace wrong characters with correct ones in red

#### Phase 3.1: Create Live Copy Emission Function
**File**: `src/features/session/runtime/charPrograms.ts`

**New function**: `runLiveCopyEmission`

```typescript
export async function runLiveCopyEmission(
  cfg: SessionConfig,
  char: string,
  io: IO,
  clock: Clock,
  sessionSignal: AbortSignal
): Promise<void> {
  // Simple transmission-only logic (similar to Listen mode)
  // 1. Play audio (await completion)
  await io.playChar(char, cfg.wpm);

  // 2. Log transmitted character for UI tracking
  io.log({ type: 'transmitted', at: clock.now(), char });

  // 3. Add standard inter-character spacing (3 dits)
  const ditMs = wpmToDitMs(cfg.wpm);
  await clock.sleep(ditMs * 3, sessionSignal);

  // No input handling, no scoring - UI owns that
}
```

#### Phase 3.2: Update SessionSnapshot Type
**File**: `src/features/session/runtime/io.ts`

Add transmitted characters tracking:
```typescript
export type SessionSnapshot = {
  // ... existing fields ...
  transmittedChars?: string[]; // For Live Copy mode
}
```

#### Phase 3.3: Wire Up Live Copy in Session Orchestrator
**File**: `src/features/session/runtime/sessionProgram.ts`

**Changes**:
1. Import `runLiveCopyEmission`
2. Replace the temporary live-copy case:
```typescript
case 'live-copy': {
  await runLiveCopyEmission(config, char, deps.io, deps.clock, signal);

  // Track transmitted character in snapshot
  snapshot.transmittedChars = [...(snapshot.transmittedChars || []), char];

  // Update remaining time
  const newElapsed = deps.clock.now() - startTime;
  snapshot.remainingMs = Math.max(0, config.lengthMs - newElapsed);

  publish();
  break;
}
```
Note: Inter-character spacing is handled inside `runLiveCopyEmission`

#### Phase 3.4: Update StudyPage UI for Live Copy
**File**: `src/pages/StudyPage.tsx`

**Changes**:
1. Add state for user input and correction display
```typescript
const [userInput, setUserInput] = useState('');
const [showCorrections, setShowCorrections] = useState(false);
```

2. Replace character history with textarea for Live Copy mode:
```tsx
{config?.mode === 'live-copy' ? (
  <div className="live-copy-container">
    {/* Show transmitted characters as reference */}
    <div className="transmitted-chars">
      {snapshot.transmittedChars?.join('') || ''}
    </div>

    {/* Multi-line textarea for user input */}
    <textarea
      className="live-copy-input"
      value={userInput}
      onChange={(e) => setUserInput(e.target.value)}
      disabled={snapshot.phase === 'ended'}
      placeholder="Type what you hear..."
      rows={4}
      autoFocus
    />
  </div>
) : (
  <CharacterHistory items={snapshot.previous} />
)}
```

3. Implement Mode 2 correction logic:
```typescript
// For immediate feedback mode
useEffect(() => {
  if (config?.mode === 'live-copy' && config?.liveCopyFeedback === 'immediate') {
    const transmitted = snapshot.transmittedChars?.join('') || '';
    const userLen = userInput.length;
    const transLen = transmitted.length;

    // Apply corrections when user is behind
    if (userLen < transLen) {
      const corrected = userInput.padEnd(transLen, ' ');
      const correctedArray = corrected.split('');

      // Replace incorrect characters with correct ones
      for (let i = userLen; i < transLen; i++) {
        if (correctedArray[i] !== transmitted[i]) {
          // In real implementation, mark these as red
          correctedArray[i] = transmitted[i];
        }
      }

      setUserInput(correctedArray.join(''));
    }
  }
}, [snapshot.transmittedChars]);
```

#### Phase 3.5: Add Configuration for Live Copy Sub-Modes
**File**: `src/pages/SessionConfigPage.tsx`

Add feedback mode selector for Live Copy:
```tsx
{mode === 'live-copy' && (
  <div className="form-group mb-4">
    <label className="form-label">Feedback Mode</label>
    <div className="flex gap-3">
      <button
        className={`btn ${liveCopyFeedback === 'end' ? 'btn-primary' : 'btn-secondary'}`}
        onClick={() => setLiveCopyFeedback('end')}
      >
        End of Session
      </button>
      <button
        className={`btn ${liveCopyFeedback === 'immediate' ? 'btn-primary' : 'btn-secondary'}`}
        onClick={() => setLiveCopyFeedback('immediate')}
      >
        Live Corrections
      </button>
    </div>
  </div>
)}
```

#### Phase 3.6: Add Tests for Live Copy
**Goal**: Ensure live-copy mode is properly tested

**New test files**:
- `src/features/session/runtime/__tests__/liveCopyEmission.test.ts` - Test transmission timing
- Integration tests for full live-copy sessions

**Updates to existing tests**:
- Add live-copy cases to session orchestrator tests
- Verify that Live Copy doesn't handle input in runtime
- Test UI textarea behavior separately

### Phase 4: Final Polish
**Goal**: Clean up any remaining issues

**Tasks**:
- Update any remaining documentation
- Remove console.log from temporary implementation
- Verify statistics work for all three modes
- Check settings persistence
- Manual testing of all three modes
- Update STATUS.md to reflect new modes

## Testing Plan

### Unit Tests
- Test each emission function independently
- Verify timing calculations for live-copy mode
- Test partial credit scoring logic

### Integration Tests
- Full session flow for each mode
- Mode transitions
- Configuration persistence

### Manual Testing Checklist
- [ ] Practice mode works as before (formerly Active)
- [ ] Listen mode works as before (formerly Passive)
- [ ] Live Copy mode plays continuously
- [ ] Live Copy accepts input during playback
- [ ] Live Copy doesn't stop audio early
- [ ] Configuration page adapts to selected mode
- [ ] Statistics track all three modes correctly
- [ ] Settings persist between sessions

## Architectural Decisions (Finalized)

### Key Design Decisions

1. **Live Copy = Transmission Mode**: Architecturally similar to Listen mode, not Practice mode
2. **Runtime Simplicity**: Runtime only handles transmission, no input processing
3. **UI Owns Input**: All user input handling and grading happens in the UI layer
4. **Multi-line Textarea**: Better UX for continuous typing with backspace support
5. **Two Feedback Modes**:
   - **End of Session**: Grade and show results after completion
   - **Live Corrections**: Replace wrong characters with correct ones in red as you go

### Scoring (Deferred)
- Initially: Exact position matching only
- Future: Can add tolerance/fuzzy matching
- Statistics and detailed scoring to be implemented later

### Implementation Benefits

1. **Clean Separation of Concerns**
   - Runtime: Audio transmission and timing
   - UI: Input collection and feedback

2. **Reuses Existing Patterns**
   - Live Copy emission ≈ Listen emission
   - No new complex state machines

3. **Testable**
   - Runtime remains pure and deterministic
   - UI logic can be tested separately

4. **Extensible**
   - Easy to add scoring algorithms later
   - Can experiment with different feedback styles in UI

## Success Criteria

1. Three distinct modes accessible from homepage
2. Each mode provides its intended learning experience
3. No regression in existing functionality
4. Tests pass for all modes
5. Configuration persists appropriately
6. Statistics track accurately for all modes

