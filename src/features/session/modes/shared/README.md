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

**Update**: `src/core/types/domain.ts` (add to SessionMode type)

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
- **Practice** (`modes/practice/`) - Most complex (input, stats, replay, feedback)
- **Listen** (`modes/listen/`) - Simplest (passive, no input)
- **Live Copy** (`modes/liveCopy/`) - Unique state management (typed string)

## Architecture Benefits

This mode architecture provides:

 **Locality of behavior** - All Practice mode code in `modes/practice/`
 **Safe mode addition** - Clear pattern to follow, type-enforced registration
 **Better testing** - Test mode logic without React, test UI separately
 **Easier onboarding** - "Read this one directory" vs "read these 5 files"
 **Reduced coupling** - Modes can't accidentally depend on each other

## Questions?

If you have questions about implementing a new mode, refer to the existing mode implementations or check the shared types in `modes/shared/types.ts`.
