# Morse Code App Architecture

## 1) How the whole app fits together (large modules first)

**App Shell (layout + routing)**
- Provides top-level navigation, global providers (state, audio context), and page containers.
- Routes: **Study**, **Statistics**, **Text Sources**, **Settings** (plus an **About**/Help page if you like).

**Feature modules**
1. **Session** (Active/Passive practice)
   - Orchestrates timing, audio, input handling, instant feedback, and session logging.
   - Built around a deterministic **state machine** so timing rules and transitions are predictable and testable.

2. **Statistics**
   - Aggregates session logs into daily metrics, speed/latency, confusion matrix, and study time.
   - Includes chart components and selectors to compute derived data.

3. **Text Sources**
   - Pluggable providers: Random letters, frequency-weighted words, Reddit RSS headlines, "hard characters" sampler.
   - Uniform interface so Session doesn't care where characters came from.

4. **Settings / Configuration**
   - Character speed (WPM), enable numbers/punctuation, session length, mode, speed tiers, feedback/replay toggles.
   - Writes to a versioned local data store and emits change events.

5. **Core Domain (shared, headless logic)**
   - **Morse Timing Engine** (maps WPM → dit length, symbol spacing, Passive mode delays).
   - **Scheduler** (micro-timeline driving when to play, when input windows open/close).
   - **Audio Engine** (WebAudio tone + shaped envelope, decoupled from UI).
   - **Feedback** adapters (buzzer/flash/both) behind a single interface.
   - **Event Log** (append-only session events → later folded into stats).
   - **Storage** (local persistence abstraction + migrations).

6. **Serverless (tiny)**
   - RSS proxy function (avoids CORS and lets us set headers).
   - Optional pre-filtering or simple caching for feeds.

**Data flow at runtime:**
**Session** pulls a batch/stream from **Text Sources** → asks **Scheduler** (using **Morse Timing Engine**) when to play and when to accept input → **Audio Engine** plays tones → **Session** captures keypresses and emits **Event Log** entries (correct/incorrect/latency/timeouts) → **Statistics** later reads logs from storage to render charts and the confusion matrix.

## 2) UI composition (pages → sections → components)

**App Shell**
- `<AppLayout>`: header/nav + outlet; error boundary; toasts.
- `<RouteProvider>` using TanStack Router or React Router.

**Study Page**
- **Config strip**: session length (1/2/5m), mode (Active/Passive), speed (slow/medium/fast/lightning), source selector.
- **Live panel**:
  - **Now playing lane**:
    - Active: shows "previously sent characters" (scrolling line); current character is visible (expected to type).
    - Passive: same previous line, but current character hidden until reveal timing.
  - **Input lane** (Active): text field or full-screen key capture.
  - **Immediate feedback** area (flash overlay; optional sound).
  - **Replay overlay** (large letter + auto-replay audio on fail).
- **Session HUD**: elapsed/remaining time, live accuracy %, current WPM/latency, source label.
- **Accessibility**: all feedback mirrored with ARIA live regions.

**Statistics Page**
- **Time window dropdown** (7/14/30/90 days; custom).
- **Accuracy over time** (line or area).
- **Speed/latency over time** (median/95th percentile; can be toggled onto the same chart).
- **Confusion matrix** (grid or top-N pairs list).
- **Study time by day** (bar).
- "Hard characters" card (current top-10).

**Text Sources Page**
- **Sources list**:
  - Random letters (with filters: letters/numbers/punctuation toggles).
  - Frequency-weighted words (dictionary stats; show example words).
  - Reddit headlines (default subs + user-added RSS).
  - Hard characters sampler (live list).
- **Add RSS** form (validate, test fetch, save).

**Settings Page**
- Character speed WPM.
- Feature toggles: numbers, standard punctuation, advanced punctuation.
- Audio test (tone preview).
- Data: export/import, reset, clear cache.

## 3) Core domain design (types + rules)

### Key types (TypeScript)

```typescript
// Configuration
type UserConfig = {
  wpm: number;                  // character speed in WPM
  includeNumbers: boolean;
  includeStdPunct: boolean;
  includeAdvPunct: boolean;
  sessionDefaults: {
    lengthSec: 60 | 120 | 300;
    mode: "active" | "passive";
    speedTier: "slow" | "medium" | "fast" | "lightning";
    feedback: "buzzer" | "flash" | "both";
    replay: boolean;
    sourceId: string;
  };
};

// Session lifecycle
type SessionConfig = {
  mode: "active" | "passive";
  lengthMs: number;
  speedTier: "slow" | "medium" | "fast" | "lightning";
  sourceId: string;
  feedback: "buzzer" | "flash" | "both";
  replay: boolean;
  effectiveAlphabet: string[]; // based on toggles
};

type Emission = {
  id: string;            // unique per emitted character
  char: string;
  startedAt: number;     // ms, audio start
  windowCloseAt: number; // active: end of recognition window; passive: reveal moment
};

type InputEvent = {
  at: number;
  key: string;
  emissionId: string;
};

type OutcomeEvent =
  | { type: "correct"; at: number; emissionId: string; latencyMs: number }
  | { type: "timeout"; at: number; emissionId: string }
  | { type: "incorrect"; at: number; emissionId: string; expected: string; got: string };

type SessionLog = {
  sessionId: string;
  startedAt: number;
  cfg: SessionConfig;
  events: (InputEvent | OutcomeEvent | Emission)[];
  endedAt: number;
};
```

### Timing model
- **Dit length** = `1200 / WPM` ms (standard CW formula).
- **Active mode input window** per spec:
  - slow = `5 × dit`, medium = `3 × dit`, fast = `2 × dit`, lightning = `1 × dit`.
- **Passive mode sequence** per spec:
  - Slow: send char → `3×dit` → **reveal** → `3×dit` → next
  - Medium: send → `3×dit` → reveal → `2×dit` → next
  - Fast: send → `2×dit` → reveal → `1×dit` → next
- Morse rendering: character timing (dit/dah ratio 1:3) and **intra-symbol**/symbol/word spacing (1/3/7 dits) handled by the **Morse Timing Engine**, separate from "recognition windows."

## 4) Session orchestration as a state machine

Using XState (or a small homegrown state machine), the **Session** has predictable transitions:

**States**
- `idle` → `running.active` or `running.passive` → `ended`
- `running.active` substates:
  - `emitting` (play character audio)
  - `awaitingInput` (window open; abort early on correct)
  - `feedback` (on fail/timeout → buzzer/flash; optional replay overlay)
  - loop
- `running.passive` substates:
  - `emitting` → `preRevealDelay` → `reveal` → `postRevealDelay` → loop

**Events**
- `TICK` (Scheduler driven)
- `KEYPRESS(key)`
- `TIMEOUT`
- `CORRECT` | `INCORRECT`
- `END` (duration reached)

**Why this matters:**
- Deterministic flow → easy to unit-test timing and edge cases (early input, late input, race conditions) without touching audio.

## 5) Text Sources (pluggable providers)

**Provider interface**
```typescript
interface TextSource {
  id: string;
  label: string;
  prepare(ctx: { alphabet: string[] }): Promise<void> | void;
  next(): string; // returns a single character each call
}
```

Even for "words" or "headlines," the provider streams characters one at a time. It internally buffers the current word/headline and yields the next character.

**Built-ins**
- **Random letters**: uniform or weighted by user difficulty (optional toggle).
- **Frequency-weighted words**: load a list with per-word frequencies; sample via alias method for O(1) weighted picks.
- **Reddit RSS**: serverless fetch → normalize titles → in-memory ring buffer → stream characters.
- **Hard characters**: dynamically recomputed top-10 hardest based on 30-day accuracy/latency; yields from that set with higher probability.

## 6) Feedback system

**Feedback adapters** implement a simple interface:
```typescript
interface Feedback {
  onFail(char: string): void;     // buzzer/flash/both
  onCorrect?(char: string): void; // optional
}
```

- **Buzzer**: short tone via Audio Engine (different frequency) or preloaded sample.
- **Flash**: CSS class toggled on the app root (fast fade animation).

These are trivially swappable and **do not** block the main state machine.

## 7) Storage (local, versioned) & data pipeline

- Wrap persistent storage behind a **Repository** interface:
  - `EventRepo.append(SessionLog | SessionEvent)`
  - `EventRepo.readRange({ from, to })`
  - `ConfigRepo.get/set`
  - `SourcesRepo.get/set` (for custom RSS)
- Use **IndexedDB** via a tiny helper (`idb-keyval` or Dexie) for resilience and size; if you truly want `localStorage`, keep the repository abstraction so you can swap later without refactoring.
- Include a schema version + **migrations** to evolve event shapes safely.
- **Selectors** in the Statistics module compute:
  - Accuracy per day (`correct / (correct + incorrect + timeout)`)
  - Latency per day (median, p95)
  - Confusion pairs: counts of `(expected, got)` sorted by frequency
  - Study time per day: sum of session durations
- Optional export/import (JSONL of events) for backup.

## 8) Serverless functions (Vercel)

- `/api/rss-proxy?url=...`
  - Sets `User-Agent` and `Accept: application/rss+xml` headers.
  - Parses XML → safe JSON (title, link, pubDate) or returns raw XML and parse client-side.
  - Caches for a few minutes (immutable revalidation).
- (Optional) `/api/wordlist` to deliver frequency lists efficiently.

These are minimal—everything else stays on the client.

## 9) Recommended directory structure

Feature-first with a small shared core. (Vite + React + TS assumed.)

```
/src
  /app
    App.tsx
    routes.tsx
    providers.tsx           // Query/Zustand/XState providers
    layout/
      AppLayout.tsx
      Nav.tsx
  /features
    /session
      machine/
        sessionMachine.ts   // XState config (pure logic)
        guards.ts
        actions.ts
      services/
        scheduler.ts        // deterministic clock; test with fake timers
        audioEngine.ts      // WebAudio wrapper (thin, not unit tested)
        feedback/
          flashFeedback.ts
          buzzerFeedback.ts
      components/
        StudyPanel.tsx
        InputCapture.tsx
        PreviousLine.tsx
        ReplayOverlay.tsx
        Hud.tsx
      utils/
        keymap.ts           // normalize keystrokes to characters
    /stats
      selectors/
        accuracy.ts
        latency.ts
        confusion.ts
        studyTime.ts
      components/
        AccuracyChart.tsx
        LatencyChart.tsx
        ConfusionMatrix.tsx
        StudyTimeChart.tsx
      charts/
        charting.ts         // small wrapper around Recharts/Chart.js
    /sources
      providers/
        randomLetters.ts
        weightedWords.ts
        redditRss.ts
        hardChars.ts
      components/
        SourcesPage.tsx
        AddRssForm.tsx
      utils/
        normalizeHeadline.ts
        frequencySampler.ts // alias method
    /config
      ConfigPage.tsx
      configStore.ts        // Zustand slice or similar
      schema.ts             // UserConfig type & defaults
    /core
      morse/
        timing.ts           // dit length, spacing math
        alphabet.ts         // maps char -> dit/dah; constants
      storage/
        index.ts            // repo interfaces
        idbRepo.ts          // IndexedDB impl
        migrations.ts
      analytics/
        eventLog.ts         // append-only; writes to storage
      types/
        domain.ts           // shared TS types
  /pages
    StudyPage.tsx
    StatisticsPage.tsx
    TextSourcesPage.tsx
    SettingsPage.tsx
  /api                       // Vercel serverless
    rss-proxy.ts
  /styles
    globals.css
  /tests
    sessionMachine.test.ts
    scheduler.test.ts
    timing.test.ts
    frequencySampler.test.ts
    selectors.accuracy.test.ts
    selectors.confusion.test.ts
    sources.redditRss.test.ts
    e2e/ (Playwright)
```

Notes:
- **constants** (alphabet maps) live under `/core/morse/alphabet.ts` and do **not** get unit tests.
- Audio playback is thin and integration-tested only (no unit tests).

## 10) High-value, test-driven development (TDD) targets

Focus on pure, deterministic logic where tests buy you confidence and guard against regressions:

1. **Session state machine** (`features/session/machine/sessionMachine.ts`)
   - Correct transitions for Active/Passive flows.
   - Early correct input aborts the window and advances.
   - Timeout behavior triggers feedback + optional replay; does not re-queue the failed letter.
   - Edge cases: input during `emitting`, input exactly at boundary, rapid successive keypresses.
   - Use **fake timers** to simulate time—no audio.

2. **Scheduler** (`features/session/services/scheduler.ts`)
   - Given a WPM + speed tier, emits precise timestamps for:
     - Audio start/stop per symbol
     - Input window open/close (Active)
     - Reveal and inter-character spacing (Passive)
   - Verify calculations align with spec (dit multipliers above).

3. **Morse Timing Engine** (`/core/morse/timing.ts`)
   - `wpmToDitMs`, symbol spacing math, and any Farnsworth option you might add later.
   - Ensures timing is stable across browsers with integer rounding strategy (e.g., accumulate drift and correct).

4. **Text Source providers**
   - **Random letters**: respects effective alphabet (numbers/punctuation toggles).
   - **Frequency-weighted words**: statistical sanity (χ² check over many samples or simpler bounds).
   - **Reddit RSS**: parsing/normalization; error handling on malformed feeds (mock fetch with MSW).
   - **Hard characters**: correct top-10 computation given synthetic logs.

5. **Selectors for statistics**
   - **Accuracy by day**: correct numerator/denominator, filters by time window.
   - **Latency**: median and p95 vs. outliers.
   - **Confusion matrix**: (expected, got) aggregation and top-N pairs; ensure symmetry rules are handled as intended (pairs vs. ordered pairs).
   - **Study time by day**: sessions spanning midnight counted correctly.

6. **Keymap utility** (`features/session/utils/keymap.ts`)
   - Maps keyboard events to expected characters, including punctuation.

7. **Storage repositories & migrations**
   - Round-trip tests: write events → read events.
   - Migration from vX→vX+1 transforms shape but preserves meaning.

8. **End-to-end (Playwright)**
   - Start a 1-minute Active session on Random Letters at medium speed; type a few correct, a few incorrect; ensure live accuracy moves and session ends.
   - Passive session ensures current char is hidden until reveal.
   - Add a custom RSS feed; provider yields headline characters.

**Intentionally *not* unit-tested**
- **Audio Engine** (WebAudio): exercise through an integration smoke test (tone starts/stops without throwing).
- **Pure constants** (alphabet maps, UI tokens).
- **Chart rendering** (snapshot tests are brittle); validate via selector tests and a tiny "renders without crash" smoke.

## 11) Implementation details that pay off

- **State management**: Zustand (or Redux Toolkit) for app-level config + repositories; XState for the session machine. They complement each other.
- **Strict TypeScript** (`"strict": true`) + ESLint rules for exhaustive switch on state machine events.
- **Performance**:
  - Precompute audio buffers for common characters at current WPM to avoid runtime oscillator setup overhead.
  - Keep the "previously sent characters" list virtualized if needed (but realistically it's small).
- **Accessibility**:
  - Ensure flash feedback is not seizure-triggering (limit intensity/duration, offer reduced-motion).
  - Provide hotkeys for pause/resume/end session.
- **Mobile**:
  - Full-screen key capture with an on-screen keyboard as a fallback.

## 12) How the app behaves end-to-end (high-level functionality)

1. User opens **Study** → chooses Session config (length, mode, speed, source).
2. **Session starts**:
   - **Scheduler** computes the next character's audio schedule and (for Active) the recognition window.
   - **Audio Engine** emits the tone for that character; **Session** logs `Emission`.
   - **Active**: input window opens; first correct key within the window ends the window and immediately advances. Otherwise, on timeout → **Feedback** triggers and optional **Replay** overlay shows the letter while replaying its audio. The same letter is **not** re-queued.
   - **Passive**: character is hidden; after pre-reveal spacing elapses, the character is shown; post-reveal spacing elapses; advance.
   - The "previously sent characters" line accumulates.
3. **Session ends** on time budget; **Event Log** is persisted.
4. **Statistics** reads logs:
   - Displays accuracy/speed graphs for the selected window.
   - Computes confusion pairs and identifies "hard characters."
   - Shows daily study time.

## 13) Speed tiers and windows (exact table)

| Mode    | Tier      | Recognition window / Reveal spacing rules |
|---------|-----------|-------------------------------------------|
| Active  | slow      | 5 × dit input window                      |
|         | medium    | 3 × dit input window                      |
|         | fast      | 2 × dit input window                      |
|         | lightning | 1 × dit input window                      |
| Passive | slow      | emit → 3×dit → **reveal** → 3×dit         |
|         | medium    | emit → 3×dit → **reveal** → 2×dit         |
|         | fast      | emit → 2×dit → **reveal** → 1×dit         |

*(Dit length = 1200/WPM ms; symbol spacing is still governed by Morse rules inside `emit`.)*

## 14) Small roadmap (nice to have, later)

- **Adaptive sampling**: weight hard characters more when accuracy dips below a threshold.
- **Session presets** (e.g., "Numbers sprint", "Punctuation drill").
- **Export to CSV** of daily stats for sharing.
- **Cloud backup** (optional) gated behind user opt-in.

### TL;DR: What to build first (in order)

1. Core **Morse Timing Engine** + **Scheduler** (with tests).
2. **Session state machine** (with tests) using a dummy "random letters" source.
3. Minimal **Audio Engine** (enough to play dit/dah sequences) + **Feedback** adapters.
4. **Event Log** + **Statistics selectors** + basic charts.
5. **Text Sources** providers (weighted words, RSS proxy, hard characters sampler) with tests.
6. **Settings** + versioned **Storage** + migrations.

This plan gives you a clean separation of concerns (UI vs orchestration vs pure logic), keeps the most critical behavior deterministic and testable, and leaves the finicky parts (audio) thin and swappable.