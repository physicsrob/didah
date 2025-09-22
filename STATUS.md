# MorseAcademy Implementation Status

## Current State

This document reflects the ACTUAL current state of the codebase as of 2025-09-20.

## Architecture Overview

The application uses a **runtime-based session orchestration** approach as described in `plan_update.md`. This is a linear, async/await-based design that avoids complex state machines in favor of straightforward procedural code.

### Key Design Decisions
- **Single conductor pattern**: One async function orchestrates the entire session
- **Centralized timing**: All timing goes through Clock abstraction with AbortSignal cancellation
- **IO abstraction**: Side effects isolated behind a simple IO interface
- **Race/select utility**: Clean handling of timeout vs user input races
- **No distributed timers**: No setTimeout calls scattered throughout, no epoch tracking

## What's Actually Implemented

### ✅ Core Morse Domain (`/src/core/`)
- **morse/timing.ts**: WPM calculations, speed tier multipliers, character duration calculations
- **morse/alphabet.ts**: Complete Morse patterns for letters, numbers, punctuation
- **types/domain.ts**: TypeScript domain types (SessionConfig, SpeedTier, etc.)

### ✅ Runtime System (`/src/features/session/runtime/`)
The actual session orchestration implementation:
- **clock.ts**: Clock abstraction (SystemClock for production, allows test clocks)
- **inputBus.ts**: Input event bus for keyboard input with observables
- **io.ts**: IO interface defining all side effects
- **select.ts**: Race/select utility for handling concurrent operations
- **charPrograms.ts**: Character emission logic for Active and Passive modes
- **sessionProgram.ts**: Main session orchestration (createSessionRunner)
- **ioAdapter.ts**: Adapter bridging AudioEngine/Feedback to IO interface

### ✅ Audio & Feedback (`/src/features/session/services/`)
- **audioEngine.ts**: WebAudio-based Morse tone generation
- **feedback/buzzerFeedback.ts**: Audio error feedback
- **feedback/flashFeedback.ts**: Visual flash feedback
- **feedback/combinedFeedback.ts**: Combined audio+visual feedback
- **feedback/index.ts**: Feedback factory

### ⚠️ Partially Implemented
- **Text sources**: Only RandomCharSource implemented, others missing

### ✅ UI Components
- **StudyPage.tsx**: Main practice interface (uses runtime system)
- **App.tsx**: Minimal app wrapper

### ✅ Test Coverage
- `/src/tests/timing.test.ts`: Timing calculations (9 tests)
- `/src/tests/audioEngine.integration.test.ts`: Audio integration tests (9 tests)
- `/src/features/session/runtime/__tests__/`: Runtime system tests
  - `charPrograms.test.ts`
  - `select.test.ts`
  - `sessionProgram.test.ts`

### 🔧 CLI/Development Tools
- `/src/cli/`: Command-line tools (should probably be moved out of src/)
  - morse-sim.ts, mockIO.ts, clocks.ts, args.ts

## What's NOT Implemented

### ❌ Event Logging & Statistics
- No event log persistence
- No statistics tracking
- No accuracy/speed calculations over time
- No confusion matrix
- No study time tracking

### ❌ Text Sources (beyond random)
- Frequency-weighted words
- Reddit RSS headlines
- Hard characters sampler
- Custom RSS feeds

### ❌ Storage & Persistence
- No local storage implementation
- No data export/import
- No session history

### ❌ Settings Management
- No user configuration persistence
- No settings UI
- Audio settings hardcoded

### ❌ Multiple Pages/Routes
- No statistics page
- No text sources configuration page
- No settings page
- No routing

### ❌ Production Features
- No Vercel deployment config
- No RSS proxy serverless function
- No error boundaries
- No performance optimization

## Known Technical Debt

See `tech_debt.md` for detailed analysis. Key issues:
1. **WPM configuration duplicated** in multiple places
2. **Incomplete passive mode lightning speed** (uses same timing as fast)
3. **CLI code mixed into main source** (/src/cli should be moved)
4. **Hardcoded audio configuration** (should be user-configurable)
5. **Dead code**: BrowserIOAdapter class unused
6. **350+ lines of inline CSS** in StudyPage
7. **Inconsistent error handling** patterns
8. **Documentation out of sync** (arch.md describes old approach)

## Current Functionality

### Working Features
✅ Active mode practice with real-time feedback
✅ Passive mode with timed character reveals
✅ Audio playback of Morse code
✅ Visual feedback on errors (flash)
✅ Replay on timeout (Active mode)
✅ Session timer and remaining time display
✅ Accuracy tracking within session
✅ Random character source

### Not Working / Missing
❌ Persistence between sessions
❌ Historical statistics
❌ Text sources beyond random
❌ User settings
❌ Multiple practice modes/configs

## Next Steps (Recommended Priority)

### 1. Fix Critical Tech Debt (1-2 hours)
- [ ] Fix WPM configuration duplication
- [ ] Remove dead BrowserIOAdapter code

### 2. Implement Event Logging (2-3 hours)
- [ ] Create EventLog class
- [ ] Add localStorage persistence
- [ ] Wire up to session runtime

### 3. Add Basic Statistics (3-4 hours)
- [ ] Session history storage
- [ ] Accuracy over time calculations
- [ ] Basic statistics display

### 4. Add Text Sources (2-3 hours)
- [ ] Implement TextSource interface properly
- [ ] Add word lists
- [ ] Add configurable sources

### 5. Settings & Configuration (2 hours)
- [ ] User settings storage
- [ ] Settings UI
- [ ] Audio configuration options

## File Structure

```
/src
  /core
    /morse
      alphabet.ts    ✅ Morse patterns
      timing.ts      ✅ Timing calculations
    /types
      domain.ts      ✅ Domain types

  /features
    /session
      /runtime       ✅ Main implementation
        clock.ts
        inputBus.ts
        io.ts
        select.ts
        charPrograms.ts
        sessionProgram.ts
        ioAdapter.ts
        /__tests__/
      /services
        audioEngine.ts     ✅ Audio playback
        scheduler.ts       ⚠️ Exists but unused?
        /feedback         ✅ Feedback adapters
    /sources
      /providers
        randomLetters.ts   ✅ Only this implemented

  /pages
    StudyPage.tsx    ✅ Main UI

  /cli              🔧 Should be moved

  /tests           ✅ Test files
```

## How to Run

```bash
# Development
npm run dev

# Tests
npm test

# Type checking
npm run typecheck

# Linting
npm run lint
```

## Notes

- The codebase follows the "new runtime" approach from `plan_update.md`, NOT the original architecture in `arch.md`
- The runtime system is working and simpler than the original planned state machine approach
- Main blockers for production use: no persistence, no statistics, limited text sources
- ~32 tests passing, but coverage could be better
- The app is functional for basic practice but missing many planned features
