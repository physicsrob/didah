## **TL;DR (the new mental model)**

* **One conductor** per session: an async function (or async generator) that runs a loop: *emit char → race(keypress vs timeout) → feedback → next* (or passive: *emit → wait pre → reveal → wait **TL;DR (the new mental model)***  
* ***One conductor** per session: an async function (or async generator) that runs a loop: emit char → race(keypress vs timeout) → feedback → next (or passive: emit → wait pre → reveal → wait post → next).*  
* ***One clock** and **one cancellation scope** control all waits. No scattered `setTimeout`s, no epoch accounting, no guards that call into other layers.*  
* ***A tiny IO port** abstracts side effects (audio/feedback/reveal/log); sequencing code calls IO directly; there’s no “effects runner.”*  
* ***A small “select/race” helper** handles “first of X wins” (keypress wins vs. timeout), with automatic cancellation of the loser.*  
* ***Input comes via an InputBus** (simple event emitter/observable). Recognition waits on “first correct key” while still logging incorrects.*

*This yields a **linear, readable** program you can reason about and unit test with a fake clock.*

---

## ***The shape of the new runtime***

*Names are suggestions; you can nest under `src/features/session/runtime/`.*

### ***1\) Clock (deterministic, testable)***

* *`// runtime/clock.ts`*  
* *`export interface Clock {`*  
*   *`now(): number; // ms`*  
*   *`sleep(ms: number, signal?: AbortSignal): Promise<void>;`*  
* *`}`*  
*   
* *`export class SystemClock implements Clock {`*  
*   *`now() { return performance.now(); }`*  
*   *`sleep(ms: number, signal?: AbortSignal) {`*  
*     *`return new Promise<void>((resolve, reject) => {`*  
*       *`const id = setTimeout(resolve, ms);`*  
*       *`const onAbort = () => { clearTimeout(id); reject(new DOMException('Aborted','AbortError')); };`*  
*       *`if (signal) {`*  
*         *`if (signal.aborted) return onAbort();`*  
*         *`signal.addEventListener('abort', onAbort, { once: true });`*  
*       *`}`*  
*     *`});`*  
*   *`}`*  
* *`}`*


  ### ***2\) Input bus (one source of user input)***

* *`// runtime/inputBus.ts`*  
* *`export type KeyEvent = { at: number; key: string };`*  
*   
* *`export interface InputBus {`*  
*   *`push(e: KeyEvent): void;`*  
*   *`takeUntil(`*  
*     *`predicate: (e: KeyEvent) => boolean,`*  
*     *`signal?: AbortSignal`*  
*   *`): Promise<KeyEvent>;`*  
*   *`observe(`*  
*     *`fn: (e: KeyEvent) => void,`*  
*     *`signal?: AbortSignal`*  
*   *`): void;`*  
* *`}`*  
*   
* *`export class SimpleInputBus implements InputBus {`*  
*   *`private q: ((e: KeyEvent) => void)[] = [];`*  
*   *`private listeners = new Set<(e: KeyEvent) => void>();`*  
*   
*   *`push(e: KeyEvent) {`*  
*     *`this.listeners.forEach(l => l(e));`*  
*     *`this.q.shift()?.(e);`*  
*   *`}`*  
*   
*   *`takeUntil(predicate: (e: KeyEvent) => boolean, signal?: AbortSignal) {`*  
*     *`return new Promise<KeyEvent>((resolve, reject) => {`*  
*       *`const handler = (e: KeyEvent) => predicate(e) && settle(e);`*  
*       *`const settle = (e?: KeyEvent) => {`*  
*         *`this.listeners.delete(handler);`*  
*         *`if (e) resolve(e);`*  
*       *`};`*  
*       *`this.listeners.add(handler);`*  
*       *`if (signal) {`*  
*         *`const onAbort = () => { this.listeners.delete(handler); reject(new DOMException('Aborted','AbortError')); };`*  
*         *`if (signal.aborted) return onAbort();`*  
*         *`signal.addEventListener('abort', onAbort, { once: true });`*  
*       *`}`*  
*     *`});`*  
*   *`}`*  
*   
*   *`observe(fn: (e: KeyEvent) => void, signal?: AbortSignal) {`*  
*     *`this.listeners.add(fn);`*  
*     *`if (signal) signal.addEventListener('abort', () => this.listeners.delete(fn), { once: true });`*  
*   *`}`*  
* *`}`*


  ### ***3\) IO port (one abstraction for side effects)***

* *`// runtime/io.ts`*  
* *`export interface IO {`*  
*   *`playChar(char: string): Promise<void>; // resolves when audio finishes (unless stopped)`*  
*   *`stopAudio(): Promise<void>;`*  
*   *`reveal(char: string): void;     // passive reveal`*  
*   *`hide(): void;                   // passive hide`*  
*   *`feedback(kind: 'correct'|'incorrect'|'timeout', char: string): void;`*  
*   *`replay?(char: string): Promise<void>; // optional, if replay is enabled`*  
*   *`log(event: any): void;          // append to your event log`*  
*   *`snapshot?: (s: SessionSnapshot) => void; // optional UI push`*  
* *`}`*


*You can wrap your existing `AudioEngine` and feedback handlers into this minimal IO interface—no timers, no epochs inside IO, just side effects.*

### ***4\) Little “select/race” utility (first winner wins)***

* *`// runtime/select.ts`*  
* *`export async function select<T>(`*  
*   *`arms: { run: (signal: AbortSignal) => Promise<T> }[],`*  
*   *`parent?: AbortSignal`*  
* *`): Promise<{ value: T; winner: number }> {`*  
*   *`const ac = new AbortController();`*  
*   *`const linkAbort = () => ac.abort();`*  
*   *`parent?.addEventListener('abort', linkAbort, { once: true });`*  
*   
*   *`try {`*  
*     *`return await new Promise((resolve, reject) => {`*  
*       *`let settled = false;`*  
*       *`arms.forEach((a, idx) => {`*  
*         *`a.run(ac.signal).then(value => {`*  
*           *`if (settled) return;`*  
*           *`settled = true;`*  
*           *`ac.abort(); // cancel the losers`*  
*           *`resolve({ value, winner: idx });`*  
*         *`}).catch(err => {`*  
*           *`if (!settled && err?.name !== 'AbortError') reject(err);`*  
*         *`});`*  
*       *`});`*  
*     *`});`*  
*   *`} finally {`*  
*     *`parent?.removeEventListener('abort', linkAbort);`*  
*   *`}`*  
* *`}`*


  ### ***5\) Character programs (one clear function per mode)***

* *`// runtime/charPrograms.ts`*  
* *`import { Clock } from './clock';`*  
* *`import { IO } from './io';`*  
* *`import { InputBus, KeyEvent } from './inputBus';`*  
* *`import { getActiveWindowMs, getPassiveTimingMs, wpmToDitMs } from '../../core/morse/timing';`*  
* *`import type { SessionConfig } from '../../core/types/domain';`*  
*   
* *`export type ActiveOutcome = 'correct' | 'timeout';`*  
*   
* *`export async function runActiveEmission(`*  
*   *`cfg: SessionConfig,`*  
*   *`char: string,`*  
*   *`io: IO,`*  
*   *`input: InputBus,`*  
*   *`clock: Clock,`*  
*   *`sessionSignal: AbortSignal`*  
* *`): Promise<ActiveOutcome> {`*  
*   *`// Start audio, but don't await; we accept input during audio.`*  
*   *`const audioDone = io.playChar(char).catch(() => void 0);`*  
*   
*   *`const windowMs = Math.max(getActiveWindowMs(cfg.wpm, cfg.speedTier), Math.max(60, wpmToDitMs(cfg.wpm)));`*  
*   
*   *`// Log incorrect keys while the window is open (non-blocking)`*  
*   *`const charScope = new AbortController();`*  
*   *`sessionSignal.addEventListener('abort', () => charScope.abort(), { once: true });`*  
*   *`input.observe(e => {`*  
*     *`if (isLetter(e.key) && e.key.toUpperCase() !== char.toUpperCase()) {`*  
*       *`io.log({ type: 'incorrect', at: e.at, expected: char, got: e.key.toUpperCase() });`*  
*       *`io.feedback('incorrect', char); // policy: feedback on incorrect? keep or remove as desired`*  
*     *`}`*  
*   *`}, charScope.signal);`*  
*   
*   *`// Race: first correct key vs timeout`*  
*   *`const { winner } = await select(`*  
*     *`[`*  
*       *`{`*  
*         *`run: (s) => input.takeUntil(`*  
*           *`(e: KeyEvent) => e.key.toUpperCase() === char.toUpperCase(),`*  
*           *`s`*  
*         *`).then(e => {`*  
*           *`io.log({ type: 'correct', at: e.at, char });`*  
*           *`return 'correct' as const;`*  
*         *`})`*  
*       *`},`*  
*       *`{ run: (s) => clock.sleep(windowMs, s).then(() => 'timeout' as const) }`*  
*     *`],`*  
*     *`sessionSignal`*  
*   *`);`*  
*   
*   *``// Whoever lost the race gets canceled by `select` via abort.``*  
*   *`charScope.abort();`*  
*   
*   *`if (winner === 0) { // correct`*  
*     *`await io.stopAudio();                      // stop early if still playing`*  
*     *`io.feedback('correct', char);`*  
*     *`return 'correct';`*  
*   *`} else { // timeout`*  
*     *`io.feedback('timeout', char);`*  
*     *`io.log({ type: 'timeout', at: clock.now(), char });`*  
*     *`if (cfg.replay && io.replay) {`*  
*       *`await io.replay(char);`*  
*     *`}`*  
*     *`return 'timeout';`*  
*   *`}`*  
* *`}`*  
*   
* *`export async function runPassiveEmission(`*  
*   *`cfg: SessionConfig,`*  
*   *`char: string,`*  
*   *`io: IO,`*  
*   *`clock: Clock,`*  
*   *`sessionSignal: AbortSignal`*  
* *`): Promise<void> {`*  
*   *`io.hide();`*  
*   *`await io.playChar(char); // wait for audio to complete`*  
*   *`const { preRevealMs, postRevealMs } = getPassiveTimingMs(cfg.wpm, cfg.speedTier);`*  
*   *`await clock.sleep(preRevealMs, sessionSignal);`*  
*   *`io.reveal(char);`*  
*   *`await clock.sleep(postRevealMs, sessionSignal);`*  
*   *`// no feedback in passive`*  
* *`}`*  
*   
* *`function isLetter(k: string) { return /^[A-Za-z0-9.,\/=\?;:'"\-\+@\(\)]$/.test(k); }`*


  ### ***6\) The Session Program (single conductor)***

* *`// runtime/sessionProgram.ts`*  
* *`import { Clock } from './clock';`*  
* *`import { IO } from './io';`*  
* *`import { InputBus } from './inputBus';`*  
* *`import { runActiveEmission, runPassiveEmission } from './charPrograms';`*  
* *`import type { SessionConfig } from '../../core/types/domain';`*  
* *`import type { CharacterSource } from '../session/types';`*  
*   
* *`export interface SessionRunner {`*  
*   *`start(cfg: SessionConfig): void;`*  
*   *`stop(): void;`*  
*   *`subscribe(fn: (snap: SessionSnapshot) => void): () => void;`*  
* *`}`*  
*   
* *`export type SessionSnapshot = {`*  
*   *`phase: 'idle'|'running'|'ended';`*  
*   *`currentChar: string | null;`*  
*   *`previous: string[];`*  
*   *`startedAt: number | null;`*  
*   *`remainingMs: number;`*  
* *`};`*  
*   
* *`export function createSessionRunner(deps: {`*  
*   *`clock: Clock; io: IO; input: InputBus; source: CharacterSource;`*  
* *`}): SessionRunner {`*  
*   *`let subs = new Set<(s: SessionSnapshot) => void>();`*  
*   *`let snap: SessionSnapshot = { phase: 'idle', currentChar: null, previous: [], startedAt: null, remainingMs: 0 };`*  
*   *`let ac: AbortController | null = null;`*  
*   
*   *`const publish = () => subs.forEach(s => s(snap));`*  
*   
*   *`async function run(cfg: SessionConfig, signal: AbortSignal) {`*  
*     *`const start = deps.clock.now();`*  
*     *`snap = { phase: 'running', currentChar: null, previous: [], startedAt: start, remainingMs: cfg.lengthMs }; publish();`*  
*   
*     *`while (!signal.aborted) {`*  
*       *`// Stop if time budget is exhausted before starting a new emission`*  
*       *`const elapsed = deps.clock.now() - start;`*  
*       *`if (elapsed >= cfg.lengthMs) break;`*  
*   
*       *`const char = deps.source.next();`*  
*       *`snap.currentChar = char; publish();`*  
*   
*       *`if (cfg.mode === 'active') {`*  
*         *`const outcome = await runActiveEmission(cfg, char, deps.io, deps.input, deps.clock, signal);`*  
*         *`// Move to next immediately after outcome; no retries`*  
*       *`} else {`*  
*         *`await runPassiveEmission(cfg, char, deps.io, deps.clock, signal);`*  
*       *`}`*  
*   
*       *`snap.previous = [...snap.previous, char];`*  
*       *`snap.currentChar = null;`*  
*       *`snap.remainingMs = Math.max(0, cfg.lengthMs - (deps.clock.now() - start));`*  
*       *`publish();`*  
*     *`}`*  
*   
*     *`// End policy: finish current emission then end`*  
*     *`snap.phase = 'ended'; publish();`*  
*   *`}`*  
*   
*   *`return {`*  
*     *`start(cfg) {`*  
*       *`if (ac) this.stop();`*  
*       *`ac = new AbortController();`*  
*       *`deps.io.log({ type: 'sessionStart', at: deps.clock.now(), cfg });`*  
*       *`run(cfg, ac.signal).finally(() => {`*  
*         *`deps.io.log({ type: 'sessionEnd', at: deps.clock.now() });`*  
*         *`ac = null;`*  
*       *`});`*  
*     *`},`*  
*     *`stop() {`*  
*       *`ac?.abort();`*  
*       *`ac = null;`*  
*     *`},`*  
*     *`subscribe(fn) {`*  
*       *`subs.add(fn); fn(snap);`*  
*       *`return () => subs.delete(fn);`*  
*     *`}`*  
*   *`};`*  
* *`}`*


*Notice how **all waits are centralized** (`sleep`, `select`), **concurrency is explicit** (only where we need it), and there’s **one source of cancellation** (AbortController).*

---

## ***How this maps to “HELLO”***

*For **Active**:*

1. *`playChar('H')` (don’t await; audio in background)*  
2. *`race(firstCorrectKey === 'H', sleep(window))`*  
   * *If correct → `stopAudio()`, `feedback('correct')`, `log(correct)`, continue*  
   * *If timeout → `feedback('timeout')`, optional `replay('H')`, `log(timeout)`, continue*  
3. *Next: `E`, … until time budget ends.*

*For **Passive**:*

1. *`playChar('H')` (await completion)*  
2. *`sleep(preReveal)` → `reveal('H')` → `sleep(postReveal)` → next*

***Everything above is linear code**—no distributed timers, no “audioEnded” events, no cross‑layer epochs.*

---

## ***Why this is materially simpler***

* ***Single concurrency surface**: `sleep` and `select` are the only ways time passes or races occur.*  
* ***One cancellation point**: the session’s `AbortController` tears down character‑level sleeps/listeners automatically.*  
* ***No effects runner**: sequencing calls IO directly. You can still keep a tiny adapter to bridge your existing Audio/Feedback classes to `IO`, but timing stays out of the IO layer.*  
* ***Deterministic tests**: inject a fake `Clock` and a test `InputBus`, then drive the program with `push({at, key})` and `advance(ms)`.*  
  ---

  ## ***Where this plugs into your repo today***

* ***Keep**: `AudioEngine` (`src/features/session/services/audioEngine.ts`), feedback adapters, text sources, domain types.*  
* ***Deprecate**: `transition.ts`, `effects.ts`, and the timer parts of `SessionController.ts`.*  
* ***Introduce**: `runtime/clock.ts`, `runtime/inputBus.ts`, `runtime/io.ts`, `runtime/select.ts`, `runtime/charPrograms.ts`, `runtime/sessionProgram.ts`.*

*On the React side (`pages/StudyPage.tsx`), replace the polling \+ controller wiring with:*

* *`const clock = useMemo(() => new SystemClock(), []);`*  
* *`const input = useMemo(() => new SimpleInputBus(), []);`*  
* *`const io = useMemo<IO>(() => ({`*  
*   *`playChar: (c) => audio.playCharacter(c),`*  
*   *`stopAudio: () => audio.stop(),`*  
*   *`reveal: (c) => setRevealedChar(c),`*  
*   *`hide: () => setRevealedChar(null),`*  
*   *`feedback: (k, c) => flash(k),`*  
*   *`replay: cfg.replay ? async (c) => { setOverlay(c); await audio.playCharacter(c); setOverlay(null);} : undefined,`*  
*   *`log: (e) => appendToEventLog(e),`*  
*   *`snapshot: (s) => setSnapshot(s),`*  
* *`}), [audio, cfg]);`*  
*   
* *`const runner = useMemo(() => createSessionRunner({ clock, io, input, source }), [clock, io, input, source]);`*  
*   
* *`useEffect(() => {`*  
*   *`const unsub = runner.subscribe(setSnapshot);`*  
*   *`return () => unsub();`*  
* *`}, [runner]);`*  
*   
* *`useEffect(() => {`*  
*   *`const onKey = (e: KeyboardEvent) => input.push({ at: performance.now(), key: e.key.toUpperCase() });`*  
*   *`window.addEventListener('keydown', onKey);`*  
*   *`return () => window.removeEventListener('keydown', onKey);`*  
* *`}, [input]);`*  
    
  ---

  ## ***Migration plan (low risk)***

1. ***Add** the runtime modules above; write **unit tests** for:*  
   * *`select()` (cancels losers; correct precedence)*  
   * *`runActiveEmission()` (correct vs timeout; early stopAudio)*  
   * *`runPassiveEmission()` (pre/post delays)*  
   * *`createSessionRunner()` (ends after budget; stop() aborts promptly)*  
2. *Build an **IO shim** that wraps your existing Audio/Feedback into `IO`.*  
3. *Swap StudyPage to use the **SessionRunner**; keep the old controller behind a feature flag until you’re confident.*  
4. *Delete `transition.ts`/`effects.ts` once tests pass; keep `AudioEngine` and feedback as‑is.*  
5. *(Optional) If you want precomputation: keep `services/scheduler.ts` only for **display** (future timeline/preview), not for runtime control. Runtime remains program‑driven.*  
   ---

   ## ***Answers to the big questions you raised***

*“Could we generate the sequence for a string like ‘HELLO’ and decouple it?”*

*Yes—with the program approach you **implicitly** generate that sequence in code. If you want a fully declarative representation, you can compile per‑char mini‑plans:*

* *`type MiniStep =`*  
*   *`| { op: 'play', char: string }`*  
*   *`| { op: 'waitCorrectOrTimeout', windowMs: number }`*  
*   *`| { op: 'feedback', kind: 'correct'|'timeout', char: string }`*  
*   *`| { op: 'reveal', char: string }`*  
*   *`| { op: 'sleep', ms: number };`*  
*   
* *`type MiniProgram = MiniStep[];`*  
*   
* *`function compileActive(char: string, cfg: SessionConfig): MiniProgram {`*  
*   *`return [`*  
*     *`{ op: 'play', char },`*  
*     *`{ op: 'waitCorrectOrTimeout', windowMs: Math.max(getActiveWindowMs(cfg.wpm, cfg.speedTier), 60) },`*  
*     *`// … on outcome the executor chooses which branch to execute next`*  
*   *`];`*  
* *`}`*


*Then write a trivial executor that interprets steps. In practice, the async program above is clearer and less boilerplate, but both styles work.*

---

## ***Subtle but important policies (write them down once)***

* ***Active input window opens at audio start**, latency \= time from audio start → first correct key.*  
* ***On correct**, stop audio immediately and advance with no extra delay.*  
* ***On incorrect**, just log (and optionally buzz once, or not)—do not advance.*  
* ***On timeout**, buzz and (optionally) replay the character’s audio while showing the letter; then advance.*  
* ***Session end** occurs after the current emission finishes (no mid‑tone cut), unless user presses **Stop**, which aborts immediately.*  
  ---

  ## ***Why this will fix the “hard to reason about” feeling***

* *There is **one place** where timing lives; you can read it top‑to‑bottom.*  
* *Concurrency exists only where it matters (the keypress vs. timeout **race**).*  
* *Timers and listeners are **scoped** to an AbortSignal (no leaked timeouts, no epoch bookkeeping).*  
* *React just **subscribes to snapshots**; there’s zero React state in the timing core.*  
  ---

  ## ***What to delete (eventually)***

* *`src/features/session/transition.ts`*  
* *`src/features/session/effects.ts`*  
* *Timer management inside `DefaultSessionController`*  
  *(Replace with `createSessionRunner`; keep small wrapper for backwards compatibility if needed.)*  
  ---

  ## ***Test checklist you’ll actually run***

* *Active: correct during audio stops playback; no timeout fires later.*  
* *Active: correct at t=window−ε wins over timeout (`select` precedence).*  
* *Active: timeout fires when no input; replay occurs if enabled.*  
* *Passive: reveal happens exactly at pre‑reveal, advance after post‑reveal.*  
* *Stop: abort mid‑wait, no further IO calls after stop.*  
* *Budget end: ends after finishing current emission, not mid‑tone.*  
  ---

*If you adopt this, you’ll find timing bugs become trivial to spot because you can step through one function and see exactly where the next wait or race is. It’s the simplest model that still captures the real‑time nature of your app—without re‑introducing state machine overhead.*

* *post → next*).  
* **One clock** and **one cancellation scope** control all waits. No scattered `setTimeout`s, no epoch accounting, no guards that call into other layers.  
* **A tiny IO port** abstracts side effects (audio/feedback/reveal/log); sequencing code calls IO *directly*; there’s no “effects runner.”  
* **A small “select/race” helper** handles “first of X wins” (keypress wins vs. timeout), with automatic cancellation of the loser.  
* **Input comes via an InputBus** (simple event emitter/observable). Recognition waits on “first correct key” while still logging incorrects.

This yields a **linear, readable** program you can reason about and unit test with a fake clock.

---

## **The shape of the new runtime**

Names are suggestions; you can nest under `src/features/session/runtime/`.

### **1\) Clock (deterministic, testable)**

`// runtime/clock.ts`  
`export interface Clock {`  
  `now(): number; // ms`  
  `sleep(ms: number, signal?: AbortSignal): Promise<void>;`  
`}`

`export class SystemClock implements Clock {`  
  `now() { return performance.now(); }`  
  `sleep(ms: number, signal?: AbortSignal) {`  
    `return new Promise<void>((resolve, reject) => {`  
      `const id = setTimeout(resolve, ms);`  
      `const onAbort = () => { clearTimeout(id); reject(new DOMException('Aborted','AbortError')); };`  
      `if (signal) {`  
        `if (signal.aborted) return onAbort();`  
        `signal.addEventListener('abort', onAbort, { once: true });`  
      `}`  
    `});`  
  `}`  
`}`

### **2\) Input bus (one source of user input)**

`// runtime/inputBus.ts`  
`export type KeyEvent = { at: number; key: string };`

`export interface InputBus {`  
  `push(e: KeyEvent): void;`  
  `takeUntil(`  
    `predicate: (e: KeyEvent) => boolean,`  
    `signal?: AbortSignal`  
  `): Promise<KeyEvent>;`  
  `observe(`  
    `fn: (e: KeyEvent) => void,`  
    `signal?: AbortSignal`  
  `): void;`  
`}`

`export class SimpleInputBus implements InputBus {`  
  `private q: ((e: KeyEvent) => void)[] = [];`  
  `private listeners = new Set<(e: KeyEvent) => void>();`

  `push(e: KeyEvent) {`  
    `this.listeners.forEach(l => l(e));`  
    `this.q.shift()?.(e);`  
  `}`

  `takeUntil(predicate: (e: KeyEvent) => boolean, signal?: AbortSignal) {`  
    `return new Promise<KeyEvent>((resolve, reject) => {`  
      `const handler = (e: KeyEvent) => predicate(e) && settle(e);`  
      `const settle = (e?: KeyEvent) => {`  
        `this.listeners.delete(handler);`  
        `if (e) resolve(e);`  
      `};`  
      `this.listeners.add(handler);`  
      `if (signal) {`  
        `const onAbort = () => { this.listeners.delete(handler); reject(new DOMException('Aborted','AbortError')); };`  
        `if (signal.aborted) return onAbort();`  
        `signal.addEventListener('abort', onAbort, { once: true });`  
      `}`  
    `});`  
  `}`

  `observe(fn: (e: KeyEvent) => void, signal?: AbortSignal) {`  
    `this.listeners.add(fn);`  
    `if (signal) signal.addEventListener('abort', () => this.listeners.delete(fn), { once: true });`  
  `}`  
`}`

### **3\) IO port (one abstraction for side effects)**

`// runtime/io.ts`  
`export interface IO {`  
  `playChar(char: string): Promise<void>; // resolves when audio finishes (unless stopped)`  
  `stopAudio(): Promise<void>;`  
  `reveal(char: string): void;     // passive reveal`  
  `hide(): void;                   // passive hide`  
  `feedback(kind: 'correct'|'incorrect'|'timeout', char: string): void;`  
  `replay?(char: string): Promise<void>; // optional, if replay is enabled`  
  `log(event: any): void;          // append to your event log`  
  `snapshot?: (s: SessionSnapshot) => void; // optional UI push`  
`}`

You can wrap your existing `AudioEngine` and feedback handlers into this minimal IO interface—no timers, no epochs inside IO, just side effects.

### **4\) Little “select/race” utility (first winner wins)**

`// runtime/select.ts`  
`export async function select<T>(`  
  `arms: { run: (signal: AbortSignal) => Promise<T> }[],`  
  `parent?: AbortSignal`  
`): Promise<{ value: T; winner: number }> {`  
  `const ac = new AbortController();`  
  `const linkAbort = () => ac.abort();`  
  `parent?.addEventListener('abort', linkAbort, { once: true });`

  `try {`  
    `return await new Promise((resolve, reject) => {`  
      `let settled = false;`  
      `arms.forEach((a, idx) => {`  
        `a.run(ac.signal).then(value => {`  
          `if (settled) return;`  
          `settled = true;`  
          `ac.abort(); // cancel the losers`  
          `resolve({ value, winner: idx });`  
        `}).catch(err => {`  
          `if (!settled && err?.name !== 'AbortError') reject(err);`  
        `});`  
      `});`  
    `});`  
  `} finally {`  
    `parent?.removeEventListener('abort', linkAbort);`  
  `}`  
`}`

### **5\) Character programs (one clear function per mode)**

`// runtime/charPrograms.ts`  
`import { Clock } from './clock';`  
`import { IO } from './io';`  
`import { InputBus, KeyEvent } from './inputBus';`  
`import { getActiveWindowMs, getPassiveTimingMs, wpmToDitMs } from '../../core/morse/timing';`  
`import type { SessionConfig } from '../../core/types/domain';`

`export type ActiveOutcome = 'correct' | 'timeout';`

`export async function runActiveEmission(`  
  `cfg: SessionConfig,`  
  `char: string,`  
  `io: IO,`  
  `input: InputBus,`  
  `clock: Clock,`  
  `sessionSignal: AbortSignal`  
`): Promise<ActiveOutcome> {`  
  `// Start audio, but don't await; we accept input during audio.`  
  `const audioDone = io.playChar(char).catch(() => void 0);`

  `const windowMs = Math.max(getActiveWindowMs(cfg.wpm, cfg.speedTier), Math.max(60, wpmToDitMs(cfg.wpm)));`

  `// Log incorrect keys while the window is open (non-blocking)`  
  `const charScope = new AbortController();`  
  `sessionSignal.addEventListener('abort', () => charScope.abort(), { once: true });`  
  `input.observe(e => {`  
    `if (isLetter(e.key) && e.key.toUpperCase() !== char.toUpperCase()) {`  
      `io.log({ type: 'incorrect', at: e.at, expected: char, got: e.key.toUpperCase() });`  
      `io.feedback('incorrect', char); // policy: feedback on incorrect? keep or remove as desired`  
    `}`  
  `}, charScope.signal);`

  `// Race: first correct key vs timeout`  
  `const { winner } = await select(`  
    `[`  
      `{`  
        `run: (s) => input.takeUntil(`  
          `(e: KeyEvent) => e.key.toUpperCase() === char.toUpperCase(),`  
          `s`  
        `).then(e => {`  
          `io.log({ type: 'correct', at: e.at, char });`  
          `return 'correct' as const;`  
        `})`  
      `},`  
      `{ run: (s) => clock.sleep(windowMs, s).then(() => 'timeout' as const) }`  
    `],`  
    `sessionSignal`  
  `);`

  ``// Whoever lost the race gets canceled by `select` via abort.``  
  `charScope.abort();`

  `if (winner === 0) { // correct`  
    `await io.stopAudio();                      // stop early if still playing`  
    `io.feedback('correct', char);`  
    `return 'correct';`  
  `} else { // timeout`  
    `io.feedback('timeout', char);`  
    `io.log({ type: 'timeout', at: clock.now(), char });`  
    `if (cfg.replay && io.replay) {`  
      `await io.replay(char);`  
    `}`  
    `return 'timeout';`  
  `}`  
`}`

`export async function runPassiveEmission(`  
  `cfg: SessionConfig,`  
  `char: string,`  
  `io: IO,`  
  `clock: Clock,`  
  `sessionSignal: AbortSignal`  
`): Promise<void> {`  
  `io.hide();`  
  `await io.playChar(char); // wait for audio to complete`  
  `const { preRevealMs, postRevealMs } = getPassiveTimingMs(cfg.wpm, cfg.speedTier);`  
  `await clock.sleep(preRevealMs, sessionSignal);`  
  `io.reveal(char);`  
  `await clock.sleep(postRevealMs, sessionSignal);`  
  `// no feedback in passive`  
`}`

`function isLetter(k: string) { return /^[A-Za-z0-9.,\/=\?;:'"\-\+@\(\)]$/.test(k); }`

### **6\) The Session Program (single conductor)**

`// runtime/sessionProgram.ts`  
`import { Clock } from './clock';`  
`import { IO } from './io';`  
`import { InputBus } from './inputBus';`  
`import { runActiveEmission, runPassiveEmission } from './charPrograms';`  
`import type { SessionConfig } from '../../core/types/domain';`  
`import type { CharacterSource } from '../session/types';`

`export interface SessionRunner {`  
  `start(cfg: SessionConfig): void;`  
  `stop(): void;`  
  `subscribe(fn: (snap: SessionSnapshot) => void): () => void;`  
`}`

`export type SessionSnapshot = {`  
  `phase: 'idle'|'running'|'ended';`  
  `currentChar: string | null;`  
  `previous: string[];`  
  `startedAt: number | null;`  
  `remainingMs: number;`  
`};`

`export function createSessionRunner(deps: {`  
  `clock: Clock; io: IO; input: InputBus; source: CharacterSource;`  
`}): SessionRunner {`  
  `let subs = new Set<(s: SessionSnapshot) => void>();`  
  `let snap: SessionSnapshot = { phase: 'idle', currentChar: null, previous: [], startedAt: null, remainingMs: 0 };`  
  `let ac: AbortController | null = null;`

  `const publish = () => subs.forEach(s => s(snap));`

  `async function run(cfg: SessionConfig, signal: AbortSignal) {`  
    `const start = deps.clock.now();`  
    `snap = { phase: 'running', currentChar: null, previous: [], startedAt: start, remainingMs: cfg.lengthMs }; publish();`

    `while (!signal.aborted) {`  
      `// Stop if time budget is exhausted before starting a new emission`  
      `const elapsed = deps.clock.now() - start;`  
      `if (elapsed >= cfg.lengthMs) break;`

      `const char = deps.source.next();`  
      `snap.currentChar = char; publish();`

      `if (cfg.mode === 'active') {`  
        `const outcome = await runActiveEmission(cfg, char, deps.io, deps.input, deps.clock, signal);`  
        `// Move to next immediately after outcome; no retries`  
      `} else {`  
        `await runPassiveEmission(cfg, char, deps.io, deps.clock, signal);`  
      `}`

      `snap.previous = [...snap.previous, char];`  
      `snap.currentChar = null;`  
      `snap.remainingMs = Math.max(0, cfg.lengthMs - (deps.clock.now() - start));`  
      `publish();`  
    `}`

    `// End policy: finish current emission then end`  
    `snap.phase = 'ended'; publish();`  
  `}`

  `return {`  
    `start(cfg) {`  
      `if (ac) this.stop();`  
      `ac = new AbortController();`  
      `deps.io.log({ type: 'sessionStart', at: deps.clock.now(), cfg });`  
      `run(cfg, ac.signal).finally(() => {`  
        `deps.io.log({ type: 'sessionEnd', at: deps.clock.now() });`  
        `ac = null;`  
      `});`  
    `},`  
    `stop() {`  
      `ac?.abort();`  
      `ac = null;`  
    `},`  
    `subscribe(fn) {`  
      `subs.add(fn); fn(snap);`  
      `return () => subs.delete(fn);`  
    `}`  
  `};`  
`}`

Notice how **all waits are centralized** (`sleep`, `select`), **concurrency is explicit** (only where we need it), and there’s **one source of cancellation** (AbortController).

---

## **How this maps to “HELLO”**

For **Active**:

1. `playChar('H')` (don’t await; audio in background)  
2. `race(firstCorrectKey === 'H', sleep(window))`  
   * If correct → `stopAudio()`, `feedback('correct')`, `log(correct)`, continue  
   * If timeout → `feedback('timeout')`, optional `replay('H')`, `log(timeout)`, continue  
3. Next: `E`, … until time budget ends.

For **Passive**:

1. `playChar('H')` (await completion)  
2. `sleep(preReveal)` → `reveal('H')` → `sleep(postReveal)` → next

**Everything above is linear code**—no distributed timers, no “audioEnded” events, no cross‑layer epochs.

---

## **Why this is materially simpler**

* **Single concurrency surface**: `sleep` and `select` are the only ways time passes or races occur.  
* **One cancellation point**: the session’s `AbortController` tears down character‑level sleeps/listeners automatically.  
* **No effects runner**: sequencing calls IO *directly*. You can still keep a tiny adapter to bridge your existing Audio/Feedback classes to `IO`, but timing stays *out* of the IO layer.  
* **Deterministic tests**: inject a fake `Clock` and a test `InputBus`, then drive the program with `push({at, key})` and `advance(ms)`.

---

## **Where this plugs into your repo today**

* **Keep**: `AudioEngine` (`src/features/session/services/audioEngine.ts`), feedback adapters, text sources, domain types.  
* **Deprecate**: `transition.ts`, `effects.ts`, and the timer parts of `SessionController.ts`.  
* **Introduce**: `runtime/clock.ts`, `runtime/inputBus.ts`, `runtime/io.ts`, `runtime/select.ts`, `runtime/charPrograms.ts`, `runtime/sessionProgram.ts`.

On the React side (`pages/StudyPage.tsx`), replace the polling \+ controller wiring with:

`const clock = useMemo(() => new SystemClock(), []);`  
`const input = useMemo(() => new SimpleInputBus(), []);`  
`const io = useMemo<IO>(() => ({`  
  `playChar: (c) => audio.playCharacter(c),`  
  `stopAudio: () => audio.stop(),`  
  `reveal: (c) => setRevealedChar(c),`  
  `hide: () => setRevealedChar(null),`  
  `feedback: (k, c) => flash(k),`  
  `replay: cfg.replay ? async (c) => { setOverlay(c); await audio.playCharacter(c); setOverlay(null);} : undefined,`  
  `log: (e) => appendToEventLog(e),`  
  `snapshot: (s) => setSnapshot(s),`  
`}), [audio, cfg]);`

`const runner = useMemo(() => createSessionRunner({ clock, io, input, source }), [clock, io, input, source]);`

`useEffect(() => {`  
  `const unsub = runner.subscribe(setSnapshot);`  
  `return () => unsub();`  
`}, [runner]);`

`useEffect(() => {`  
  `const onKey = (e: KeyboardEvent) => input.push({ at: performance.now(), key: e.key.toUpperCase() });`  
  `window.addEventListener('keydown', onKey);`  
  `return () => window.removeEventListener('keydown', onKey);`  
`}, [input]);`

---

## **Migration plan (low risk)**

1. **Add** the runtime modules above; write **unit tests** for:  
   * `select()` (cancels losers; correct precedence)  
   * `runActiveEmission()` (correct vs timeout; early stopAudio)  
   * `runPassiveEmission()` (pre/post delays)  
   * `createSessionRunner()` (ends after budget; stop() aborts promptly)  
2. Build an **IO shim** that wraps your existing Audio/Feedback into `IO`.  
3. Swap StudyPage to use the **SessionRunner**; keep the old controller behind a feature flag until you’re confident.  
4. Delete `transition.ts`/`effects.ts` once tests pass; keep `AudioEngine` and feedback as‑is.  
5. (Optional) If you want *precomputation*: keep `services/scheduler.ts` only for **display** (future timeline/preview), not for runtime control. Runtime remains program‑driven.

---

## **Answers to the big questions you raised**

*“Could we generate the sequence for a string like ‘HELLO’ and decouple it?”*

Yes—with the program approach you **implicitly** generate that sequence in code. If you want a fully declarative representation, you can compile per‑char mini‑plans:

`type MiniStep =`  
  `| { op: 'play', char: string }`  
  `| { op: 'waitCorrectOrTimeout', windowMs: number }`  
  `| { op: 'feedback', kind: 'correct'|'timeout', char: string }`  
  `| { op: 'reveal', char: string }`  
  `| { op: 'sleep', ms: number };`

`type MiniProgram = MiniStep[];`

`function compileActive(char: string, cfg: SessionConfig): MiniProgram {`  
  `return [`  
    `{ op: 'play', char },`  
    `{ op: 'waitCorrectOrTimeout', windowMs: Math.max(getActiveWindowMs(cfg.wpm, cfg.speedTier), 60) },`  
    `// … on outcome the executor chooses which branch to execute next`  
  `];`  
`}`

Then write a trivial executor that interprets steps. In practice, the async program above is clearer and less boilerplate, but both styles work.

---

## **Subtle but important policies (write them down once)**

* **Active input window opens at audio start**, latency \= time from audio start → first correct key.  
* **On correct**, stop audio immediately and advance with no extra delay.  
* **On incorrect**, just log (and optionally buzz once, or not)—do not advance.  
* **On timeout**, buzz and (optionally) replay the character’s audio while showing the letter; then advance.  
* **Session end** occurs after the current emission finishes (no mid‑tone cut), unless user presses **Stop**, which aborts immediately.

---

## **Why this will fix the “hard to reason about” feeling**

* There is **one place** where timing lives; you can read it top‑to‑bottom.  
* Concurrency exists only where it matters (the keypress vs. timeout **race**).  
* Timers and listeners are **scoped** to an AbortSignal (no leaked timeouts, no epoch bookkeeping).  
* React just **subscribes to snapshots**; there’s zero React state in the timing core.

---

## **What to delete (eventually)**

* `src/features/session/transition.ts`  
* `src/features/session/effects.ts`  
* Timer management inside `DefaultSessionController`  
  (Replace with `createSessionRunner`; keep small wrapper for backwards compatibility if needed.)

---

## **Test checklist you’ll actually run**

* Active: correct during audio stops playback; no timeout fires later.  
* Active: correct at t=window−ε wins over timeout (`select` precedence).  
* Active: timeout fires when no input; replay occurs if enabled.  
* Passive: reveal happens exactly at pre‑reveal, advance after post‑reveal.  
* Stop: abort mid‑wait, no further IO calls after stop.  
* Budget end: ends after finishing current emission, not mid‑tone.

---

If you adopt this, you’ll find timing bugs become trivial to spot because you can step through one function and see exactly where the next wait or race is. It’s the simplest model that still captures the real‑time nature of your app—without re‑introducing state machine overhead.

