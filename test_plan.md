# Test Improvement Plan

## Phase 1: Fix Immediate Issues (Quick Wins)

### 1.1 Make MockIO Use Realistic Timing
```typescript
// In MockIO class
async playChar(char: string, wpm: number): Promise<void> {
  this.calls.push({ method: 'playChar', args: [char, wpm] });

  // Use actual character duration instead of hardcoded 100ms
  const duration = calculateCharacterDurationMs(char, wpm);

  if (this.clock) {
    await this.clock.sleep(duration);
  } else {
    await new Promise(resolve => setTimeout(resolve, duration));
  }
}
```

### 1.2 Create Test Utilities for Clock Coordination
```typescript
// New file: src/features/session/runtime/__tests__/testUtils.ts

export async function flushPromises(): Promise<void> {
  // Force all pending promises to resolve
  await new Promise(resolve => setImmediate(resolve));
}

export async function advanceAndFlush(clock: FakeClock, ms: number): Promise<void> {
  clock.advance(ms);
  await flushPromises();
}

export async function waitFor(
  condition: () => boolean,
  timeout: number = 1000
): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error('waitFor timeout');
    }
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}
```

### 1.3 Refactor Existing Tests to Use Utilities
Replace this pattern:
```typescript
// OLD
clock.advance(720);
await new Promise(resolve => setTimeout(resolve, 50));
expect(snapshot.stats?.timeout).toBe(1);
```

With:
```typescript
// NEW
await advanceAndFlush(clock, 720);
await waitFor(() => snapshot.stats?.timeout === 1);
```

## Phase 2: Create Deterministic Test Clock

### 2.1 Implement DeterministicTestClock
```typescript
export class DeterministicTestClock implements Clock {
  private currentTime = 0;
  private pendingTasks: Array<{
    runAt: number;
    task: () => void | Promise<void>;
  }> = [];

  now(): number {
    return this.currentTime;
  }

  async sleep(ms: number, signal?: AbortSignal): Promise<void> {
    // Schedule the resolution for later
    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new DOMException('Aborted', 'AbortError'));
        return;
      }

      this.pendingTasks.push({
        runAt: this.currentTime + ms,
        task: resolve
      });
    });
  }

  async advanceTo(targetTime: number): Promise<void> {
    while (this.currentTime < targetTime) {
      // Find next task to run
      const nextTask = this.pendingTasks
        .filter(t => t.runAt <= targetTime)
        .sort((a, b) => a.runAt - b.runAt)[0];

      if (!nextTask) {
        // No tasks to run, jump to target time
        this.currentTime = targetTime;
        break;
      }

      // Advance to task time
      this.currentTime = nextTask.runAt;

      // Remove and execute task
      this.pendingTasks = this.pendingTasks.filter(t => t !== nextTask);
      await nextTask.task();

      // Allow microtasks to run
      await new Promise(resolve => setImmediate(resolve));
    }
  }

  async runToCompletion(): Promise<void> {
    while (this.pendingTasks.length > 0) {
      const nextTask = this.pendingTasks.sort((a, b) => a.runAt - b.runAt)[0];
      await this.advanceTo(nextTask.runAt);
    }
  }
}
```

### 2.2 Create Test-Specific Input Bus
```typescript
export class DeterministicInputBus implements InputBus {
  private scheduledInputs: Array<{
    at: number;
    key: string;
  }> = [];
  private listeners: Array<(event: KeyEvent) => void> = [];

  scheduleInput(at: number, key: string): void {
    this.scheduledInputs.push({ at, key });
  }

  async processUntil(time: number): Promise<void> {
    const toProcess = this.scheduledInputs.filter(i => i.at <= time);
    for (const input of toProcess) {
      this.listeners.forEach(l => l({ at: input.at, key: input.key }));
    }
    this.scheduledInputs = this.scheduledInputs.filter(i => i.at > time);
  }
}
```

## Phase 3: Separate Test Concerns

### 3.1 Pure Logic Tests (No Async)
```typescript
// charPrograms.pure.test.ts - Test pure timing logic
describe('Active Mode Timing Logic', () => {
  it('calculates correct timeout window', () => {
    const windowMs = getActiveWindowMs(20, 'medium');
    expect(windowMs).toBe(180); // 3 × 60ms dit
  });

  it('calculates correct character duration', () => {
    const duration = calculateCharacterDurationMs('B', 20);
    expect(duration).toBe(540); // -... pattern
  });
});
```

### 3.2 Integration Tests (Deterministic)
```typescript
// sessionProgram.integration.test.ts
describe('Session Integration', () => {
  let clock: DeterministicTestClock;
  let input: DeterministicInputBus;
  let io: MockIO;
  let runner: SessionRunner;

  beforeEach(() => {
    clock = new DeterministicTestClock();
    input = new DeterministicInputBus();
    io = new MockIO(clock);
    runner = createSessionRunner({ clock, input, io, source });
  });

  it('handles correct input', async () => {
    runner.start(config);

    // Schedule input at specific time
    input.scheduleInput(100, 'A');

    // Advance clock to process everything
    await clock.advanceTo(1000);

    // Check final state
    const snapshot = runner.getSnapshot();
    expect(snapshot.stats?.correct).toBe(1);
    expect(snapshot.previous).toContain('A');
  });
});
```

## Phase 4: Test Organization

### 4.1 Directory Structure
```
__tests__/
  unit/
    timing.test.ts         // Pure timing calculations
    alphabet.test.ts       // Morse patterns
  integration/
    charPrograms.test.ts   // Emission logic with mocks
    sessionProgram.test.ts // Session orchestration
  e2e/
    session.e2e.test.ts    // Full flow with real time
  utils/
    testClock.ts          // DeterministicTestClock
    testUtils.ts          // Helper utilities
    fixtures.ts           // Common test data
```

## Phase 5: Remove Anti-patterns

### 5.1 Eliminate Magic Waits
Replace all:
```typescript
await new Promise(resolve => setTimeout(resolve, 50));
```

With explicit conditions:
```typescript
await waitFor(() => condition);
```

### 5.2 Remove Implementation Detail Tests
Instead of:
```typescript
expect(timeoutTime).toBe(2880); // Exact ms
```

Test behavior:
```typescript
expect(outcome).toBe('timeout');
expect(snapshot.stats.timeout).toBeGreaterThan(0);
```
