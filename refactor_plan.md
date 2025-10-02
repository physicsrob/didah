# Mode Architecture Refactor Plan

**Status**: 🟢 In Progress - Phase 1 & 2 Complete, ready for Phase 3
**Author**: Claude Code
**Date**: 2025-10-01
**Estimated Effort**: 4-6 hours
**Risk Level**: Medium (mitigated by incremental approach)

---

## Executive Summary

### Current Problem
Mode-specific business logic is scattered across multiple layer-based files:
- **Emission logic** in `charPrograms.ts` (all modes mixed)
- **Handler logic** in `sessionProgram.ts` (all modes mixed)
- **UI logic** in `ActiveSessionPage.tsx` (all modes mixed)

This makes it difficult to:
- Understand how a single mode works (requires reading 3+ files)
- Add new modes safely (easy to miss mode-specific requirements)
- Maintain modes independently (changes risk affecting other modes)
- Delete or temporarily disable modes (orphaned code left behind)

### Solution
Reorganize from **layer-first** to **feature-first** structure:
- Each mode gets its own directory with all related code
- Clear separation: emission logic → handler → UI → mode definition
- Type-safe registry ensures all modes are properly registered
- Shared code remains in utilities, no duplication

### Benefits
✅ **Locality of behavior** - All Practice mode code in `modes/practice/`
✅ **Safe mode addition** - Clear pattern to follow, type-enforced registration
✅ **Better testing** - Test mode logic without React, test UI separately
✅ **Easier onboarding** - "Read this one directory" vs "read these 5 files"
✅ **Reduced coupling** - Modes can't accidentally depend on each other

---

## Current State Analysis

### Existing File Structure
```
src/features/session/
├── runtime/
│   ├── charPrograms.ts          # All emission functions (Practice, Listen, Live Copy)
│   ├── sessionProgram.ts        # All handlers + orchestration with switch statement
│   ├── io.ts                    # IO interface
│   ├── ioAdapter.ts             # IO implementation
│   └── __tests__/
│       ├── charPrograms.test.ts
│       └── sessionProgram.test.ts
│
src/pages/
└── ActiveSessionPage.tsx         # All mode UI logic mixed together
```

### Code Distribution by Mode

#### Practice Mode Code Locations
1. **Emission**: `charPrograms.ts:42-200` - `runPracticeEmission()`
2. **Handler**: `sessionProgram.ts:246-285` - `handlePracticeMode()`
3. **Switch case**: `sessionProgram.ts:380-382` - `case 'practice':`
4. **UI Input**: `ActiveSessionPage.tsx:206-226` - keyboard handler
5. **UI Display**: `ActiveSessionPage.tsx:399-404` - display logic
6. **Tests**: `charPrograms.test.ts:14-249` - emission tests

#### Listen Mode Code Locations
1. **Emission**: `charPrograms.ts:202-242` - `runListenEmission()`
2. **Handler**: `sessionProgram.ts:287-312` - `handleListenMode()`
3. **Switch case**: `sessionProgram.ts:384-386` - `case 'listen':`
4. **UI Display**: `ActiveSessionPage.tsx:399-404` - same component, different data
5. **Tests**: `charPrograms.test.ts:251-380` - emission tests

#### Live Copy Mode Code Locations
1. **Emission**: `charPrograms.ts:244-268` - `runLiveCopyEmission()`
2. **Handler**: `sessionProgram.ts:314-337` - `handleLiveCopyMode()`
3. **Switch case**: `sessionProgram.ts:388-390` - `case 'live-copy':`
4. **UI State**: `ActiveSessionPage.tsx:64` - `liveCopyTyped` state
5. **UI Input**: `ActiveSessionPage.tsx:229-260` - keyboard handler with backspace
6. **UI Display**: `ActiveSessionPage.tsx:340-346` + `400-402` - typed display
7. **Tests**: Minimal (only in sessionProgram.test.ts)

### Current Coupling Issues

#### Issue 1: Switch Statement Not Type-Enforced
**Location**: `sessionProgram.ts:379-391`
```typescript
switch (config.mode) {
  case 'practice':
    await handlePracticeMode(...);
    break;
  case 'listen':
    await handleListenMode(...);
    break;
  case 'live-copy':
    await handleLiveCopyMode(...);
    break;
}
```
**Problem**: Adding a new `SessionMode` doesn't force adding a handler. Silent runtime failure possible.

#### Issue 2: Inconsistent Handler Contracts
**Location**: `sessionProgram.ts:246-337`

- `handlePracticeMode()`: Updates stats, manages history with results, handles replay
- `handleListenMode()`: Only manages history with 'listen' result, no stats
- `handleLiveCopyMode()`: Only clears currentChar, no history

**Problem**: No clear documentation of what a handler MUST do. Easy to forget requirements when adding a new mode.

#### Issue 3: Mode-Specific UI Logic Mixed
**Location**: `ActiveSessionPage.tsx`

```typescript
// Lines 206-226: Practice keyboard handler
useEffect(() => {
  if (config?.mode === 'live-copy') return;
  // ... Practice logic
}, []);

// Lines 229-260: Live Copy keyboard handler
useEffect(() => {
  if (config?.mode !== 'live-copy') return;
  // ... Live Copy logic
}, []);

// Lines 340-346: Live Copy display state
const liveCopyDisplay = useMemo(() => {
  return liveCopyTyped.split('').map(...);
}, [liveCopyTyped]);

// Lines 399-404: Mode-specific rendering
{config?.mode === 'live-copy'
  ? liveCopyDisplay
  : historyToDisplay(snapshot.previous)
}
```

**Problem**: All mode UI logic in one component. Hard to understand, easy to break with conditionals.

#### Issue 4: Shared Types Have Mode-Specific Values
**Location**: `io.ts:7`
```typescript
export interface HistoryItem {
  char: string;
  result: 'correct' | 'incorrect' | 'timeout' | 'listen';
}
```

**Problem**: 'listen' is hardcoded into a "shared" type. Adding new modes might require more hardcoded values.

---

## Target Architecture

### Directory Structure
```
src/features/session/modes/
├── practice/
│   ├── emission.ts          # runPracticeEmission() - pure logic
│   ├── handler.ts           # handlePracticeCharacter() - session integration
│   ├── ui.tsx               # PracticeDisplay, usePracticeInput
│   ├── index.ts             # Mode definition + public exports
│   └── __tests__/
│       ├── emission.test.ts
│       ├── handler.test.ts
│       └── ui.test.tsx
│
├── listen/
│   ├── emission.ts          # runListenEmission()
│   ├── handler.ts           # handleListenCharacter()
│   ├── ui.tsx               # ListenDisplay
│   ├── index.ts
│   └── __tests__/
│       ├── emission.test.ts
│       └── ui.test.tsx
│
├── liveCopy/
│   ├── emission.ts          # runLiveCopyEmission()
│   ├── handler.ts           # handleLiveCopyCharacter()
│   ├── ui.tsx               # LiveCopyDisplay, useLiveCopyInput
│   ├── index.ts
│   └── __tests__/
│       ├── emission.test.ts
│       ├── handler.test.ts
│       └── ui.test.tsx
│
└── shared/
    ├── types.ts             # ModeDefinition, HandlerContext, ModeDeps
    ├── registry.ts          # MODE_REGISTRY (type-safe)
    └── README.md            # Mode implementation guide
```

### Key Interfaces

#### `shared/types.ts`
```typescript
import type { SessionConfig } from '@/core/types/domain';
import type { IO } from '../../runtime/io';
import type { InputBus } from '../../runtime/inputBus';
import type { Clock } from '../../runtime/clock';
import type { SessionSnapshot } from '../../runtime/io';

/**
 * Dependencies available to mode handlers
 */
export interface ModeDeps {
  io: IO;
  input: InputBus;
  clock: Clock;
}

/**
 * Context passed to handlers for state updates
 * (Will be provided by sessionProgram.ts)
 */
export interface HandlerContext extends ModeDeps {
  snapshot: SessionSnapshot;
  updateSnapshot(updates: Partial<SessionSnapshot>): void;
  updateStats(outcome: 'correct' | 'incorrect' | 'timeout'): void;
  updateRemainingTime(startTime: number, config: SessionConfig): void;
  publish(): void;
}

/**
 * Complete mode definition
 */
export interface ModeDefinition {
  id: SessionMode;
  displayName: string;
  description: string;

  // Config capabilities
  usesSpeedTier: boolean;
  usesFeedback: boolean;
  usesReplay: boolean;
  usesStats: boolean;

  // Core implementation
  handleCharacter(
    config: SessionConfig,
    char: string,
    startTime: number,
    ctx: HandlerContext,
    signal: AbortSignal
  ): Promise<void>;

  // UI components
  renderDisplay(props: { snapshot: SessionSnapshot }): React.ReactNode;

  // UI hooks
  useKeyboardInput(
    input: InputBus,
    sessionPhase: 'waiting' | 'countdown' | 'active',
    isPaused: boolean,
    onPause?: () => void
  ): void;
}
```

#### `shared/registry.ts`
```typescript
import { practiceMode } from '../practice';
import { listenMode } from '../listen';
import { liveCopyMode } from '../liveCopy';
import type { SessionMode } from '@/core/types/domain';
import type { ModeDefinition } from './types';

/**
 * Type-safe mode registry
 *
 * TypeScript enforces:
 * - All SessionMode values have a registered mode
 * - All registered modes implement ModeDefinition
 * - Cannot add a mode without registering it here
 */
export const MODE_REGISTRY: Record<SessionMode, ModeDefinition> = {
  'practice': practiceMode,
  'listen': listenMode,
  'live-copy': liveCopyMode,
};

/**
 * Get a mode definition safely
 * @throws if mode is not registered (should never happen with proper types)
 */
export function getMode(mode: SessionMode): ModeDefinition {
  const def = MODE_REGISTRY[mode];
  if (!def) {
    throw new Error(`Unknown mode: ${mode}`);
  }
  return def;
}
```

### Updated Session Runner

**Location**: `sessionProgram.ts:354-405` (the main `run()` function)

```typescript
import { getMode } from '../modes/shared/registry';

async function run(config: SessionConfig, signal: AbortSignal): Promise<void> {
  const startTime = deps.clock.now();
  initializeSession(startTime, config);

  // Get mode implementation
  const mode = getMode(config.mode);

  try {
    while (!signal.aborted) {
      await waitForResume();
      if (signal.aborted) break;
      if (!checkSessionTime(startTime, config)) break;

      const char = deps.source.next();
      prepareEmission(char, config);

      try {
        // Create handler context
        const ctx: HandlerContext = {
          ...deps,
          snapshot,
          updateSnapshot: (updates) => { snapshot = { ...snapshot, ...updates }; },
          updateStats,
          updateRemainingTime,
          publish,
        };

        // Delegate to mode handler
        await mode.handleCharacter(config, char, startTime, ctx, signal);

      } catch (error) {
        if ((error as Error)?.name === 'AbortError') break;
        console.error('Emission error:', error);
      }
    }
  } finally {
    cleanupSession();
  }
}
```

### Updated Active Session Page

**Location**: `ActiveSessionPage.tsx`

```typescript
import { getMode } from '@/features/session/modes/shared/registry';

export function ActiveSessionPage() {
  // ... existing setup code ...

  // Get mode definition
  const mode = useMemo(() => getMode(config.mode), [config.mode]);

  // Mode handles its own keyboard input
  mode.useKeyboardInput(input, sessionPhase, isPaused, handlePause);

  return (
    <div className="active-session-wrapper bg-gradient-primary">
      <div className="active-session-container">
        {/* Feedback Flash */}
        {feedbackFlash && <div className={`feedback-flash ${feedbackFlash}`} />}

        {/* Welcome Screen */}
        {sessionPhase === 'waiting' && <WelcomeScreen onStart={handleStartClick} />}

        {/* Session Header */}
        {sessionPhase === 'active' && (
          <SessionHeader
            config={config}
            remainingMs={snapshot.remainingMs}
            onPause={handlePause}
          />
        )}

        {/* Mode-Specific Display */}
        {(sessionPhase === 'countdown' || sessionPhase === 'active') && (
          <div className="session-display-area">
            {mode.renderDisplay({ snapshot })}
          </div>
        )}

        {/* Shared Overlays */}
        {sessionPhase === 'countdown' && <CountdownOverlay number={countdownNumber} />}
        {isPaused && <PauseOverlay onResume={handleResume} onEnd={handleEndSession} />}
        {replayOverlay && <ReplayOverlay char={replayOverlay} />}
      </div>
    </div>
  );
}
```

---

## Migration Strategy

### Phase 0: Preparation (30 minutes) ✅ COMPLETE

#### Step 0.1: Create directory structure
```bash
mkdir -p src/features/session/modes/{practice,listen,liveCopy,shared}/__tests__
touch src/features/session/modes/shared/{types.ts,registry.ts,README.md}
```

#### Step 0.2: Create shared types
Create `modes/shared/types.ts` with the interfaces defined above.

#### Step 0.3: Run tests to establish baseline
```bash
npm test
npm run typecheck
```
**Success criteria**: All tests pass, no type errors.

#### Step 0.4: Create feature branch
```bash
git checkout -b refactor/mode-architecture
git add .
git commit -m "chore: prepare for mode architecture refactor"
```

---

### Phase 1: Practice Mode (90 minutes) ✅ COMPLETE

**Why Practice first?** It's the most complex mode with all features (feedback, replay, stats, input). If we can migrate Practice successfully, the others will be easier.

#### Step 1.1: Extract emission logic

**Create**: `modes/practice/emission.ts`

1. Copy `runPracticeEmission()` from `charPrograms.ts:42-200`
2. Update imports to use relative paths
3. Export the function

```typescript
/**
 * Practice Mode - Emission Logic
 *
 * Handles audio playback and input racing for Practice mode.
 * Returns outcome: correct | incorrect | timeout
 */

import type { SessionConfig } from '@/core/types/domain';
import type { IO } from '../../runtime/io';
import type { InputBus, KeyEvent } from '../../runtime/inputBus';
import type { Clock } from '../../runtime/clock';
import { select, waitForEvent, clockTimeout } from '../../runtime/select';
import {
  getActiveWindowMs,
  wpmToDitMs,
  calculateCharacterDurationMs,
  getInterCharacterSpacingMs
} from '@/core/morse/timing';
import { debug } from '@/core/debug';

export type PracticeOutcome = 'correct' | 'incorrect' | 'timeout';

// ... copy runPracticeEmission() implementation ...
```

**Update**: `charPrograms.ts`
- Keep the function for now (we'll delete it in Phase 4)
- Add a comment: `// DEPRECATED: Moved to modes/practice/emission.ts`

**Verify**:
```bash
npm run typecheck  # Should pass
```

#### Step 1.2: Extract handler logic

**Create**: `modes/practice/handler.ts`

```typescript
/**
 * Practice Mode - Handler Logic
 *
 * Session-level orchestration for Practice mode.
 * Manages stats, history, replay, and spacing.
 */

import type { SessionConfig } from '@/core/types/domain';
import type { HandlerContext } from '../shared/types';
import { runPracticeEmission } from './emission';
import { getInterCharacterSpacingMs } from '@/core/morse/timing';
import { debug } from '@/core/debug';

export async function handlePracticeCharacter(
  config: SessionConfig,
  char: string,
  startTime: number,
  ctx: HandlerContext,
  signal: AbortSignal
): Promise<void> {
  const outcome = await runPracticeEmission(
    config,
    char,
    ctx.io,
    ctx.input,
    ctx.clock,
    signal
  );

  ctx.updateStats(outcome);

  // Update history IMMEDIATELY
  const historyItem = { char, result: outcome as 'correct' | 'incorrect' | 'timeout' };
  ctx.updateSnapshot({
    previous: [...ctx.snapshot.previous, historyItem],
    currentChar: null,
  });

  // Update remaining time
  ctx.updateRemainingTime(startTime, config);

  // Publish immediately so UI updates right away
  ctx.publish();

  // Handle replay AFTER history update (for incorrect or timeout)
  if (config.replay && (outcome === 'incorrect' || outcome === 'timeout') && ctx.io.replay) {
    debug.log(`[Session] Replaying character '${char}' after ${outcome}`);
    await ctx.io.replay(char, config.wpm);
  }

  // Add inter-character spacing after any incorrect or timeout
  if (outcome === 'incorrect' || outcome === 'timeout') {
    const interCharSpacingMs = getInterCharacterSpacingMs(config.wpm);
    debug.log(`[Spacing] Adding post-error spacing: ${interCharSpacingMs}ms (3 dits)`);
    await ctx.clock.sleep(interCharSpacingMs, signal);
  }
}
```

**Update**: `sessionProgram.ts`
- Keep `handlePracticeMode()` for now
- Add comment: `// DEPRECATED: Moved to modes/practice/handler.ts`

**Verify**:
```bash
npm run typecheck  # Should pass
```

#### Step 1.3: Extract UI logic

**Create**: `modes/practice/ui.tsx`

```typescript
/**
 * Practice Mode - UI Components
 *
 * React components and hooks for Practice mode interface.
 */

import { useEffect } from 'react';
import type { SessionSnapshot } from '../../runtime/io';
import type { InputBus } from '../../runtime/inputBus';
import { CharacterDisplay } from '@/components/CharacterDisplay';
import { historyToDisplay } from '@/components/CharacterDisplay.transformations';

/**
 * Display component for Practice mode
 * Shows character history with correct/incorrect/timeout results
 */
export function PracticeDisplay({ snapshot }: { snapshot: SessionSnapshot }) {
  return (
    <CharacterDisplay
      characters={historyToDisplay(snapshot.previous)}
    />
  );
}

/**
 * Keyboard input hook for Practice mode
 * Captures single-character input and forwards to InputBus
 */
export function usePracticeInput(
  input: InputBus,
  sessionPhase: 'waiting' | 'countdown' | 'active',
  isPaused: boolean,
  onPause?: () => void
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle pause
      if (e.key === 'Escape' && onPause && sessionPhase === 'active') {
        onPause();
        return;
      }

      // Only capture input during active session
      if (sessionPhase === 'active' && !isPaused && e.key.length === 1) {
        input.push({ at: performance.now(), key: e.key });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [input, sessionPhase, isPaused, onPause]);
}
```

**Update**: `ActiveSessionPage.tsx`
- Keep existing code for now
- Don't remove anything yet

**Verify**:
```bash
npm run typecheck  # Should pass
```

#### Step 1.4: Create mode definition

**Create**: `modes/practice/index.ts`

```typescript
/**
 * Practice Mode
 *
 * Interactive training where you type what you hear in real-time with
 * immediate feedback. User has some control of pacing up to timeout.
 */

import type { ModeDefinition } from '../shared/types';
import { handlePracticeCharacter } from './handler';
import { PracticeDisplay, usePracticeInput } from './ui';

export const practiceMode: ModeDefinition = {
  id: 'practice',
  displayName: 'Practice',
  description: 'Interactive training with immediate feedback',

  // Config capabilities
  usesSpeedTier: true,
  usesFeedback: true,
  usesReplay: true,
  usesStats: true,

  // Implementation
  handleCharacter: handlePracticeCharacter,
  renderDisplay: PracticeDisplay,
  useKeyboardInput: usePracticeInput,
};

// Re-export for testing and advanced usage
export { runPracticeEmission } from './emission';
export { handlePracticeCharacter } from './handler';
export { PracticeDisplay, usePracticeInput } from './ui';
```

**Verify**:
```bash
npm run typecheck  # Should pass
```

#### Step 1.5: Update registry

**Create**: `modes/shared/registry.ts` (initial version with just Practice)

```typescript
import { practiceMode } from '../practice';
import type { SessionMode } from '@/core/types/domain';
import type { ModeDefinition } from './types';

// Temporary: only Practice mode registered
export const MODE_REGISTRY: Partial<Record<SessionMode, ModeDefinition>> = {
  'practice': practiceMode,
};

export function getMode(mode: SessionMode): ModeDefinition {
  const def = MODE_REGISTRY[mode];
  if (!def) {
    throw new Error(`Mode not yet migrated: ${mode}`);
  }
  return def;
}
```

**Note**: We use `Partial<Record<...>>` temporarily to allow incremental migration.

#### Step 1.6: Update sessionProgram.ts to use Practice mode

**Update**: `sessionProgram.ts` in the `run()` function

```typescript
import { getMode } from '../modes/shared/registry';

// In run() function, replace the switch statement:
async function run(config: SessionConfig, signal: AbortSignal): Promise<void> {
  const startTime = deps.clock.now();
  initializeSession(startTime, config);

  try {
    while (!signal.aborted) {
      await waitForResume();
      if (signal.aborted) break;
      if (!checkSessionTime(startTime, config)) break;

      const char = deps.source.next();
      prepareEmission(char, config);

      try {
        // Try to use new mode system, fall back to old for unmigrated modes
        if (config.mode === 'practice') {
          const mode = getMode(config.mode);
          const ctx: HandlerContext = {
            ...deps,
            snapshot,
            updateSnapshot: (updates) => {
              snapshot = { ...snapshot, ...updates };
            },
            updateStats,
            updateRemainingTime,
            publish,
          };
          await mode.handleCharacter(config, char, startTime, ctx, signal);
        } else {
          // Old switch statement for unmigrated modes
          switch (config.mode) {
            case 'listen':
              await handleListenMode(config, char, startTime, signal);
              break;
            case 'live-copy':
              await handleLiveCopyMode(config, char, startTime, signal);
              break;
          }
        }
      } catch (error) {
        if ((error as Error)?.name === 'AbortError') break;
        console.error('Emission error:', error);
      }
    }
  } finally {
    cleanupSession();
  }
}
```

**Verify**:
```bash
npm test -- practice  # Run Practice tests
npm run typecheck
```

**Success criteria**: All Practice mode tests pass.

#### Step 1.7: Update ActiveSessionPage for Practice mode

**Update**: `ActiveSessionPage.tsx`

Add mode detection at the top:
```typescript
import { getMode } from '@/features/session/modes/shared/registry';

export function ActiveSessionPage() {
  // ... existing setup ...

  // Get mode definition if migrated
  const mode = useMemo(() => {
    try {
      return getMode(config.mode);
    } catch {
      return null; // Mode not yet migrated
    }
  }, [config.mode]);

  // Use new mode system for input if available
  if (mode && config.mode === 'practice') {
    mode.useKeyboardInput(input, sessionPhase, isPaused, handlePause);
  } else {
    // Old keyboard handlers for unmigrated modes
    // ... existing Practice/LiveCopy keyboard handlers ...
  }

  return (
    <div className="active-session-wrapper">
      {/* ... */}

      <div className="session-display-area">
        {mode && config.mode === 'practice' ? (
          mode.renderDisplay({ snapshot })
        ) : (
          // Old display logic
          <CharacterDisplay
            characters={
              config?.mode === 'live-copy'
                ? liveCopyDisplay
                : historyToDisplay(snapshot.previous)
            }
          />
        )}
      </div>

      {/* ... */}
    </div>
  );
}
```

**Verify**:
```bash
npm run dev
# Manual test: Start Practice session, verify it works
npm test
```

#### Step 1.8: Move Practice tests

**Create**: `modes/practice/__tests__/emission.test.ts`
- Copy Practice emission tests from `charPrograms.test.ts:14-249`
- Update imports

**Create**: `modes/practice/__tests__/handler.test.ts`
- Extract handler tests (if any exist)
- If none exist, create basic test:
```typescript
import { describe, it, expect } from 'vitest';
import { handlePracticeCharacter } from '../handler';
// ... test handler integration
```

**Update**: `charPrograms.test.ts`
- Keep old tests for now, mark as deprecated

**Verify**:
```bash
npm test -- modes/practice
```

#### Step 1.9: Commit Practice migration
```bash
git add src/features/session/modes/practice
git add src/features/session/modes/shared
git commit -m "refactor: migrate Practice mode to new architecture

- Extract emission logic to modes/practice/emission.ts
- Extract handler logic to modes/practice/handler.ts
- Extract UI to modes/practice/ui.tsx
- Create mode definition in modes/practice/index.ts
- Update sessionProgram.ts to use new mode for Practice
- Update ActiveSessionPage to use new mode for Practice
- All tests passing"
```

---

### Phase 2: Listen Mode (60 minutes) ✅ COMPLETE

Listen mode is simpler (no input, no stats, no replay), so it should go faster.

#### Step 2.1: Extract emission logic
**Create**: `modes/listen/emission.ts`
- Copy `runListenEmission()` from `charPrograms.ts:202-242`

#### Step 2.2: Extract handler logic
**Create**: `modes/listen/handler.ts`
```typescript
export async function handleListenCharacter(
  config: SessionConfig,
  char: string,
  startTime: number,
  ctx: HandlerContext,
  signal: AbortSignal
): Promise<void> {
  await runListenEmission(config, char, ctx.io, ctx.clock, signal);

  // For listen mode, add to history after emission
  const historyItem = { char, result: 'listen' as const };
  ctx.updateSnapshot({
    previous: [...ctx.snapshot.previous, historyItem],
    currentChar: null,
  });

  ctx.updateRemainingTime(startTime, config);
  ctx.publish();
}
```

#### Step 2.3: Extract UI logic
**Create**: `modes/listen/ui.tsx`
```typescript
export function ListenDisplay({ snapshot }: { snapshot: SessionSnapshot }) {
  return (
    <CharacterDisplay
      characters={historyToDisplay(snapshot.previous)}
    />
  );
}

export function useListenInput() {
  // No-op: Listen mode doesn't use keyboard input
}
```

#### Step 2.4: Create mode definition
**Create**: `modes/listen/index.ts`
```typescript
export const listenMode: ModeDefinition = {
  id: 'listen',
  displayName: 'Listen',
  description: 'Passive listening with delayed reveal',

  usesSpeedTier: false,
  usesFeedback: false,
  usesReplay: false,
  usesStats: false,

  handleCharacter: handleListenCharacter,
  renderDisplay: ListenDisplay,
  useKeyboardInput: useListenInput,
};
```

#### Step 2.5: Update registry
**Update**: `modes/shared/registry.ts`
```typescript
import { practiceMode } from '../practice';
import { listenMode } from '../listen';

export const MODE_REGISTRY: Partial<Record<SessionMode, ModeDefinition>> = {
  'practice': practiceMode,
  'listen': listenMode,
};
```

#### Step 2.6: Update sessionProgram.ts
```typescript
// In run() function:
if (config.mode === 'practice' || config.mode === 'listen') {
  const mode = getMode(config.mode);
  // ... use mode.handleCharacter()
} else {
  // Only Live Copy left in old switch
  switch (config.mode) {
    case 'live-copy':
      await handleLiveCopyMode(...);
      break;
  }
}
```

#### Step 2.7: Update ActiveSessionPage
Add Listen to the mode system usage.

#### Step 2.8: Move Listen tests
**Create**: `modes/listen/__tests__/emission.test.ts`

#### Step 2.9: Verify and commit
```bash
npm test -- modes/listen
npm run dev  # Manual test Listen mode
git add src/features/session/modes/listen
git commit -m "refactor: migrate Listen mode to new architecture"
```

---

### Phase 3: Live Copy Mode (60 minutes)

Live Copy has unique UI state management (typed string), so needs careful extraction.

#### Step 3.1: Extract emission logic
**Create**: `modes/liveCopy/emission.ts`
- Copy `runLiveCopyEmission()` from `charPrograms.ts:244-268`

#### Step 3.2: Extract handler logic
**Create**: `modes/liveCopy/handler.ts`
```typescript
export async function handleLiveCopyCharacter(
  config: SessionConfig,
  char: string,
  startTime: number,
  ctx: HandlerContext,
  signal: AbortSignal
): Promise<void> {
  await runLiveCopyEmission(config, char, ctx.io, ctx.clock, signal);

  // Clear current character after emission
  ctx.updateSnapshot({ currentChar: null });
  ctx.updateRemainingTime(startTime, config);
  ctx.publish();
}
```

#### Step 3.3: Extract UI logic
**Create**: `modes/liveCopy/ui.tsx`

**Important**: Live Copy manages its own typed string state. This needs to be handled carefully.

```typescript
import { useState, useEffect, useMemo } from 'react';
import type { SessionSnapshot } from '../../runtime/io';
import type { InputBus } from '../../runtime/inputBus';
import { CharacterDisplay, type DisplayCharacter } from '@/components/CharacterDisplay';

/**
 * Display component for Live Copy mode
 * Shows what the user has typed (no corrections until session end)
 */
export function LiveCopyDisplay({
  typedString
}: {
  typedString: string
}) {
  const characters = useMemo((): DisplayCharacter[] => {
    return typedString.split('').map((char, i) => ({
      text: char,
      status: 'neutral' as const,
      key: i
    }));
  }, [typedString]);

  return <CharacterDisplay characters={characters} />;
}

/**
 * Keyboard input hook for Live Copy mode
 * Manages typed string with backspace support
 */
export function useLiveCopyInput(
  sessionPhase: 'waiting' | 'countdown' | 'active',
  isPaused: boolean,
  onPause?: () => void
): string {
  const [typedString, setTypedString] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle pause
      if (e.key === 'Escape' && onPause && sessionPhase === 'active') {
        onPause();
        return;
      }

      if (sessionPhase !== 'active' || isPaused) return;

      // Handle backspace
      if (e.key === 'Backspace') {
        e.preventDefault();
        setTypedString(prev => prev.slice(0, -1));
        return;
      }

      // Handle character input
      if (e.key.length === 1) {
        e.preventDefault();
        setTypedString(prev => prev + e.key.toUpperCase());
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sessionPhase, isPaused, onPause]);

  return typedString;
}
```

#### Step 3.4: Create mode definition
**Create**: `modes/liveCopy/index.ts`

**Challenge**: Live Copy's `useKeyboardInput` returns a value (typed string), but the interface expects `void`.

**Solution**: Modify the interface to allow optional return:

**Update**: `modes/shared/types.ts`
```typescript
export interface ModeDefinition {
  // ... existing fields ...

  // UI hooks - can return mode-specific state
  useKeyboardInput(
    input: InputBus,
    sessionPhase: 'waiting' | 'countdown' | 'active',
    isPaused: boolean,
    onPause?: () => void
  ): void | string;  // Allow returning state for modes that need it
}
```

**Create**: `modes/liveCopy/index.ts`
```typescript
export const liveCopyMode: ModeDefinition = {
  id: 'live-copy',
  displayName: 'Live Copy',
  description: 'Real-time copying with end-of-session corrections',

  usesSpeedTier: false,
  usesFeedback: false,
  usesReplay: false,
  usesStats: false,  // Live Copy has different stats (accuracy calculation)

  handleCharacter: handleLiveCopyCharacter,
  renderDisplay: LiveCopyDisplay,
  useKeyboardInput: useLiveCopyInput,
};
```

#### Step 3.5: Update registry (complete!)
**Update**: `modes/shared/registry.ts`
```typescript
import { practiceMode } from '../practice';
import { listenMode } from '../listen';
import { liveCopyMode } from '../liveCopy';

// Now complete! No longer Partial<>
export const MODE_REGISTRY: Record<SessionMode, ModeDefinition> = {
  'practice': practiceMode,
  'listen': listenMode,
  'live-copy': liveCopyMode,
};
```

#### Step 3.6: Update sessionProgram.ts (finalize!)
**Update**: `sessionProgram.ts` - replace the whole conditional with the clean version:

```typescript
async function run(config: SessionConfig, signal: AbortSignal): Promise<void> {
  const startTime = deps.clock.now();
  initializeSession(startTime, config);

  // Get mode implementation
  const mode = getMode(config.mode);

  try {
    while (!signal.aborted) {
      await waitForResume();
      if (signal.aborted) break;
      if (!checkSessionTime(startTime, config)) break;

      const char = deps.source.next();
      prepareEmission(char, config);

      try {
        // Create handler context
        const ctx: HandlerContext = {
          ...deps,
          snapshot,
          updateSnapshot: (updates) => {
            snapshot = { ...snapshot, ...updates };
          },
          updateStats,
          updateRemainingTime,
          publish,
        };

        // Delegate to mode handler
        await mode.handleCharacter(config, char, startTime, ctx, signal);

      } catch (error) {
        if ((error as Error)?.name === 'AbortError') break;
        console.error('Emission error:', error);
      }
    }
  } finally {
    cleanupSession();
  }
}
```

**Remove**: Old switch statement, old handler functions (`handlePracticeMode`, `handleListenMode`, `handleLiveCopyMode`)

#### Step 3.7: Update ActiveSessionPage (finalize!)
**Update**: `ActiveSessionPage.tsx`

```typescript
export function ActiveSessionPage() {
  // ... existing setup ...

  const mode = useMemo(() => getMode(config.mode), [config.mode]);

  // Mode-specific keyboard input
  const modeInputResult = mode.useKeyboardInput(input, sessionPhase, isPaused, handlePause);

  // Live Copy mode returns typed string
  const liveCopyTyped = config.mode === 'live-copy' && typeof modeInputResult === 'string'
    ? modeInputResult
    : '';

  return (
    <div className="active-session-wrapper bg-gradient-primary">
      <div className="active-session-container">
        {/* Feedback Flash */}
        {feedbackFlash && <div className={`feedback-flash ${feedbackFlash}`} />}

        {/* Welcome Screen */}
        {sessionPhase === 'waiting' && (
          <WelcomeScreen onStart={handleStartClick} />
        )}

        {/* Session Header */}
        {sessionPhase === 'active' && (
          <SessionHeader
            config={config}
            remainingMs={snapshot.remainingMs}
            onPause={handlePause}
          />
        )}

        {/* Mode-Specific Display */}
        {(sessionPhase === 'countdown' || sessionPhase === 'active') && (
          <div className="session-display-area">
            {config.mode === 'live-copy' ? (
              mode.renderDisplay({ snapshot, typedString: liveCopyTyped })
            ) : (
              mode.renderDisplay({ snapshot })
            )}
          </div>
        )}

        {/* Shared Overlays */}
        {sessionPhase === 'countdown' && <CountdownOverlay number={countdownNumber} />}
        {isPaused && <PauseOverlay onResume={handleResume} onEnd={handleEndSession} />}
        {replayOverlay && <ReplayOverlay char={replayOverlay} />}
      </div>
    </div>
  );
}
```

**Remove**:
- Old `liveCopyTyped` state
- Old Practice keyboard handler
- Old Live Copy keyboard handler
- Old mode-specific display logic

#### Step 3.8: Update LiveCopyDisplay interface
**Update**: `modes/liveCopy/ui.tsx`
```typescript
// Update to accept typedString as prop
export function LiveCopyDisplay({
  snapshot,
  typedString
}: {
  snapshot: SessionSnapshot;
  typedString?: string;
}) {
  const characters = useMemo((): DisplayCharacter[] => {
    return (typedString || '').split('').map((char, i) => ({
      text: char,
      status: 'neutral' as const,
      key: i
    }));
  }, [typedString]);

  return <CharacterDisplay characters={characters} />;
}
```

**Update**: `modes/shared/types.ts`
```typescript
// Make renderDisplay more flexible
export interface ModeDefinition {
  // ... existing fields ...

  renderDisplay(props: {
    snapshot: SessionSnapshot;
    [key: string]: unknown;  // Allow mode-specific props
  }): React.ReactNode;
}
```

#### Step 3.9: Move Live Copy tests
**Create**: `modes/liveCopy/__tests__/emission.test.ts`

#### Step 3.10: Verify and commit
```bash
npm test
npm run typecheck
npm run dev  # Manual test all three modes

git add src/features/session/modes/liveCopy
git add src/features/session/modes/shared
git add src/features/session/runtime/sessionProgram.ts
git add src/pages/ActiveSessionPage.tsx
git commit -m "refactor: migrate Live Copy mode to new architecture

- Complete migration of all three modes
- Remove old switch statement from sessionProgram
- Simplify ActiveSessionPage to use mode system
- All tests passing"
```

---

### Phase 4: Cleanup (30 minutes)

Now that all modes are migrated, clean up the old code.

#### Step 4.1: Delete old emission functions
**Delete**: From `charPrograms.ts`:
- `runPracticeEmission()` (lines 42-200)
- `runListenEmission()` (lines 202-242)
- `runLiveCopyEmission()` (lines 244-268)

**Keep**: Helper functions like `isValidChar()` if they're still used

Or better yet, **delete the entire file** if nothing else uses it:
```bash
git rm src/features/session/runtime/charPrograms.ts
```

#### Step 4.2: Delete old handler functions
**Delete**: From `sessionProgram.ts`:
- `handlePracticeMode()` (lines 246-285)
- `handleListenMode()` (lines 287-312)
- `handleLiveCopyMode()` (lines 314-337)

#### Step 4.3: Delete old tests
**Delete**: Old test files:
```bash
git rm src/features/session/runtime/__tests__/charPrograms.test.ts
```

Only if all tests have been successfully moved to mode directories.

#### Step 4.4: Update imports
Search for any remaining imports from deleted files:
```bash
grep -r "from.*charPrograms" src/
```

Update or remove as needed.

#### Step 4.5: Verify everything still works
```bash
npm test
npm run typecheck
npm run build
npm run dev  # Manual smoke test
```

#### Step 4.6: Commit cleanup
```bash
git add -A
git commit -m "refactor: remove old layer-based mode code

- Delete charPrograms.ts (replaced by mode modules)
- Delete old handler functions from sessionProgram.ts
- Delete old test files (moved to mode directories)
- All functionality preserved in new structure"
```

---

### Phase 5: Documentation (30 minutes)

#### Step 5.1: Create Mode Implementation Guide
**Create**: `modes/shared/README.md`

```markdown
# Mode Implementation Guide

This guide explains how to implement a new session mode in Morse Academy.

## Overview

Each mode is a self-contained module with four parts:
1. **Emission logic** - Pure timing and input logic
2. **Handler logic** - Session integration (stats, history, etc.)
3. **UI components** - React components and hooks
4. **Mode definition** - Public API and registration

## Directory Structure

```
modes/
  yourMode/
    emission.ts      # Pure business logic
    handler.ts       # Session orchestration
    ui.tsx           # React components
    index.ts         # Mode definition
    __tests__/
      emission.test.ts
      handler.test.ts
      ui.test.tsx
```

## Step-by-Step Implementation

### 1. Create Emission Logic (`emission.ts`)

The emission function handles the core timing and input logic for a single character.

**Responsibilities**:
- Play audio for the character
- Handle input (if applicable)
- Wait for appropriate timing
- Return outcome or state

**Example**:
```typescript
export async function runYourModeEmission(
  config: SessionConfig,
  char: string,
  io: IO,
  clock: Clock,
  signal: AbortSignal
): Promise<void> {
  // Play audio
  await io.playChar(char, config.wpm);

  // Add timing/delays
  await clock.sleep(delayMs, signal);

  // Handle input if needed
  // ...
}
```

**What to import**:
- `SessionConfig` from `@/core/types/domain`
- `IO`, `Clock` from `../../runtime/*`
- Timing utilities from `@/core/morse/timing`

**Testing**: Pure unit tests with `FakeClock` and `TestIO`

### 2. Create Handler Logic (`handler.ts`)

The handler integrates the emission with the session lifecycle.

**Responsibilities**:
- Call the emission function
- Update session state (stats, history, remaining time)
- Handle mode-specific post-emission logic
- Publish state changes

**Example**:
```typescript
export async function handleYourModeCharacter(
  config: SessionConfig,
  char: string,
  startTime: number,
  ctx: HandlerContext,
  signal: AbortSignal
): Promise<void> {
  await runYourModeEmission(config, char, ctx.io, ctx.clock, signal);

  // Update session state
  ctx.updateSnapshot({
    previous: [...ctx.snapshot.previous, { char, result: 'your-result' }],
    currentChar: null,
  });

  ctx.updateRemainingTime(startTime, config);
  ctx.publish();
}
```

**What to use from HandlerContext**:
- `ctx.io` - Audio and feedback
- `ctx.clock` - Timing
- `ctx.snapshot` - Current session state
- `ctx.updateSnapshot(updates)` - Update state
- `ctx.updateStats(outcome)` - Update stats (if mode uses stats)
- `ctx.updateRemainingTime(startTime, config)` - Update timer
- `ctx.publish()` - Notify subscribers of state change

**Testing**: Integration tests with mock context

### 3. Create UI Components (`ui.tsx`)

React components and hooks for the mode's interface.

**Required exports**:
- Display component
- Keyboard input hook

**Display Component Example**:
```typescript
export function YourModeDisplay({ snapshot }: { snapshot: SessionSnapshot }) {
  return (
    <div>
      {/* Render mode-specific UI */}
    </div>
  );
}
```

**Keyboard Input Hook Example**:
```typescript
export function useYourModeInput(
  input: InputBus,
  sessionPhase: 'waiting' | 'countdown' | 'active',
  isPaused: boolean,
  onPause?: () => void
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle Escape for pause
      if (e.key === 'Escape' && onPause && sessionPhase === 'active') {
        onPause();
        return;
      }

      // Mode-specific keyboard handling
      if (sessionPhase === 'active' && !isPaused) {
        // ...
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sessionPhase, isPaused, onPause]);
}
```

**If mode manages state** (like Live Copy's typed string):
- Return the state from `useKeyboardInput`
- Accept state as prop in display component
- Update `ModeDefinition` interface if needed

**Testing**: React Testing Library for components

### 4. Create Mode Definition (`index.ts`)

Wire everything together and define the mode's public API.

```typescript
import type { ModeDefinition } from '../shared/types';
import { handleYourModeCharacter } from './handler';
import { YourModeDisplay, useYourModeInput } from './ui';

export const yourMode: ModeDefinition = {
  id: 'your-mode',
  displayName: 'Your Mode',
  description: 'What this mode does',

  // Config capabilities
  usesSpeedTier: false,
  usesFeedback: false,
  usesReplay: false,
  usesStats: false,

  // Implementation
  handleCharacter: handleYourModeCharacter,
  renderDisplay: YourModeDisplay,
  useKeyboardInput: useYourModeInput,
};

// Re-export for testing
export { runYourModeEmission } from './emission';
export { handleYourModeCharacter } from './handler';
export { YourModeDisplay, useYourModeInput } from './ui';
```

### 5. Register the Mode

**Update**: `modes/shared/registry.ts`

```typescript
import { yourMode } from '../yourMode';

export const MODE_REGISTRY: Record<SessionMode, ModeDefinition> = {
  'practice': practiceMode,
  'listen': listenMode,
  'live-copy': liveCopyMode,
  'your-mode': yourMode,  // Add here
};
```

**Update**: `functions/shared/types.ts` (add to SessionMode type)

```typescript
export type SessionMode = 'practice' | 'listen' | 'live-copy' | 'your-mode'
```

That's it! The mode will automatically:
- Be available in session configuration
- Work with the session runner
- Display in the UI
- Get type-checked by TypeScript

## Configuration Flags

The `ModeDefinition` includes capability flags:

- `usesSpeedTier: boolean` - Does mode use speed tier (slow/medium/fast/lightning)?
- `usesFeedback: boolean` - Does mode use feedback (buzzer/flash)?
- `usesReplay: boolean` - Does mode use replay feature?
- `usesStats: boolean` - Does mode track accuracy stats?

These flags can be used by the config UI to show/hide relevant settings.

## Common Patterns

### Mode needs input
- Import `InputBus` in emission
- Use `input.takeUntil(predicate, signal)` to wait for input
- Handle input in `useKeyboardInput` hook

### Mode needs stats
- Set `usesStats: true`
- Call `ctx.updateStats(outcome)` in handler
- Outcome must be 'correct' | 'incorrect' | 'timeout'

### Mode needs replay
- Set `usesReplay: true`
- Check `config.replay` in handler
- Call `ctx.io.replay(char, wpm)` after emission

### Mode needs feedback
- Set `usesFeedback: true`
- Call `ctx.io.feedback(kind, char)` in emission or handler
- kind: 'correct' | 'incorrect' | 'timeout'

### Mode has unique timing
- Use `clock.sleep(ms, signal)` for delays
- Use timing utilities from `@/core/morse/timing`
- Always pass `signal` for cancellation support

## Testing Strategy

### Emission Tests (`emission.test.ts`)
- Use `FakeClock` for timing control
- Use `TestIO` for IO verification
- Test timing sequences, input handling, edge cases
- Fast unit tests, no React

### Handler Tests (`handler.test.ts`)
- Mock `HandlerContext`
- Verify state updates, stats updates, publish calls
- Test integration with emission

### UI Tests (`ui.test.tsx`)
- Use React Testing Library
- Test rendering, user interactions
- Test keyboard input behavior

### Integration Tests
- Test full mode in session context
- Verify mode works with real session runner
- Test cross-mode scenarios (switch between modes)

## Examples

Refer to existing modes:
- **Practice** - Most complex (input, stats, replay, feedback)
- **Listen** - Simplest (passive, no input)
- **Live Copy** - Unique state management (typed string)
```

#### Step 5.2: Add inline documentation
Add JSDoc comments to key functions in each mode, especially:
- Emission functions (what they do, what they return)
- Handler functions (responsibilities)
- UI components (what they render)

#### Step 5.3: Update main README
**Update**: `README.md` (project root)

Add a section about the mode architecture:

```markdown
## Architecture

### Mode System

Session modes are organized as self-contained modules:

```
src/features/session/modes/
  practice/    # Practice mode implementation
  listen/      # Listen mode implementation
  liveCopy/    # Live Copy mode implementation
  shared/      # Mode interfaces and registry
```

Each mode has:
- **emission.ts** - Pure timing and input logic
- **handler.ts** - Session integration
- **ui.tsx** - React components
- **index.ts** - Mode definition

See `modes/shared/README.md` for implementation guide.
```

#### Step 5.4: Commit documentation
```bash
git add modes/shared/README.md README.md
git commit -m "docs: add mode implementation guide

- Document mode architecture and patterns
- Provide step-by-step guide for adding new modes
- Include testing strategies and examples"
```

---

### Phase 6: Final Verification (30 minutes)

#### Step 6.1: Run full test suite
```bash
npm test
npm run typecheck
npm run lint
```

**Success criteria**: All pass with no errors

#### Step 6.2: Build verification
```bash
npm run build
```

**Success criteria**: Clean build, no errors

#### Step 6.3: Manual testing checklist

Test each mode thoroughly:

**Practice Mode**:
- [ ] Start session, hear audio
- [ ] Type correct character → immediate advance
- [ ] Type incorrect character → see feedback (if enabled)
- [ ] Let timeout → see timeout feedback
- [ ] Replay works (if enabled)
- [ ] Stats update correctly
- [ ] Pause/resume works
- [ ] Session completes correctly

**Listen Mode**:
- [ ] Start session, hear audio
- [ ] Character revealed after delay
- [ ] Timing feels correct
- [ ] No keyboard input accepted
- [ ] Pause/resume works
- [ ] Session completes correctly

**Live Copy Mode**:
- [ ] Start session, hear audio
- [ ] Can type characters
- [ ] Backspace works
- [ ] Typed text displays correctly
- [ ] No feedback during session
- [ ] Pause/resume works
- [ ] Session completes with correct evaluation

#### Step 6.4: Performance check
- [ ] No console errors
- [ ] No memory leaks (check dev tools)
- [ ] Smooth audio playback
- [ ] Responsive UI

#### Step 6.5: Cross-mode testing
- [ ] Switch between modes in config
- [ ] No state leakage between modes
- [ ] Each mode works independently

---

## Rollback Plan

If issues arise during migration:

### Quick Rollback (any phase)
```bash
git reset --hard HEAD~1  # Undo last commit
npm test                  # Verify tests pass
```

### Full Rollback (return to start)
```bash
git checkout main
git branch -D refactor/mode-architecture
```

### Partial Rollback (keep some progress)
```bash
# Cherry-pick successful commits
git checkout main
git checkout -b refactor/mode-architecture-v2
git cherry-pick <commit-hash>  # Pick good commits
```

---

## Success Criteria

### Code Quality
✅ All modes migrated to new structure
✅ Old layer-based code deleted
✅ No duplication between modes
✅ Type-safe mode registry
✅ Clear separation: emission → handler → UI

### Testing
✅ All existing tests passing
✅ Tests migrated to mode directories
✅ Test coverage maintained or improved
✅ No regressions in functionality

### Documentation
✅ Mode implementation guide complete
✅ Inline documentation added
✅ README updated
✅ Clear examples for future modes

### Functionality
✅ All three modes work correctly
✅ No bugs introduced
✅ Performance unchanged or improved
✅ Clean build with no errors

---

## Post-Migration Tasks

### Immediate (same day)
- [ ] Merge refactor branch to main
- [ ] Deploy to production
- [ ] Monitor for issues
- [ ] Update team documentation

### Short-term (within week)
- [ ] Add cross-mode integration tests
- [ ] Consider extracting shared UI components
- [ ] Profile performance and optimize if needed

### Long-term
- [ ] Use new architecture to add next mode
- [ ] Evaluate if shared utilities need extraction
- [ ] Consider mode preview in config UI

---

## Risk Mitigation

### High-Risk Areas

**1. Live Copy State Management**
- **Risk**: Typed string state could break
- **Mitigation**: Test extensively, commit separately
- **Rollback**: Revert just Live Copy commits

**2. Keyboard Event Handling**
- **Risk**: Event listeners could conflict or not cleanup
- **Mitigation**: Test pause/resume, mode switching
- **Rollback**: Easy to revert to old handlers

**3. Type Safety Changes**
- **Risk**: Interface changes could break other code
- **Mitigation**: Run typecheck after each change
- **Rollback**: Revert interface changes

### Low-Risk Areas

**1. Emission Logic Move**
- Pure functions, no external dependencies
- Easy to verify with existing tests

**2. Handler Logic Move**
- Well-defined responsibilities
- Clear context pattern

**3. UI Component Extraction**
- React components are self-contained
- Easy to test and verify

---

## Timeline Estimate

| Phase | Task | Time | Risk |
|-------|------|------|------|
| 0 | Preparation | 30 min | Low |
| 1 | Practice Mode | 90 min | Medium |
| 2 | Listen Mode | 60 min | Low |
| 3 | Live Copy Mode | 60 min | Medium |
| 4 | Cleanup | 30 min | Low |
| 5 | Documentation | 30 min | Low |
| 6 | Final Verification | 30 min | Low |
| **Total** | | **5.5 hours** | |

**Buffer**: +30-60 min for unexpected issues

**Total with buffer**: 6-6.5 hours

---

## Notes

- Each phase can be completed and committed independently
- If time is limited, can stop after any phase and continue later
- Practice mode is the most complex - if that works, others will be easier
- Keep old code until verification complete - easier to compare/rollback
- Run tests frequently during migration
- Manual testing is critical - automated tests won't catch everything

---

## Questions & Decisions

### Decision Log

**Q**: Should emission tests move to mode directories?
**A**: Yes. Each mode owns all its tests.

**Q**: What if a mode needs to share UI with another mode?
**A**: Extract to `modes/shared/components.tsx` if truly shared. Otherwise, duplicate is OK (modes should be independent).

**Q**: How to handle mode-specific session statistics?
**A**: Mode definition can include optional `calculateStatistics()` method. Can be added later without breaking existing modes.

**Q**: Should mode files use absolute or relative imports?
**A**: Use absolute (`@/`) for cross-feature imports, relative for intra-mode imports.

**Q**: What about future modes that need totally different handler contracts?
**A**: The `ModeDefinition` interface can be extended with optional methods. Core contract stays minimal.

---

## Conclusion

This refactor improves:
- **Maintainability** - Clear organization, easy to find code
- **Safety** - Type-enforced registration, isolated changes
- **Onboarding** - Self-documenting structure, clear patterns
- **Extensibility** - Adding modes is straightforward

The incremental approach ensures low risk with clear rollback points. Each phase delivers value independently, making this a safe and practical refactoring strategy.
