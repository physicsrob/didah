# Claude Code Configuration

This file contains configuration and context for working with CodeBeat using Claude Code.

## Project Overview

A modern web application for learning Morse code with real-time feedback, statistics tracking, and multiple study modes. Built with React + TypeScript + Vite.

## Development Commands

```bash
# Development
npm run dev          # Start development server
npm test            # Run all tests
npm run test:ui     # Interactive test UI
npm run build       # Build for production
npm run lint        # Lint code
```

## Architecture

The app follows a feature-first architecture based on `arch.md`:

- **Core Domain**: `src/core/` - Timing engine, storage, types
- **Features**: `src/features/` - Session, stats, sources, config
- **Pages**: `src/pages/` - Page components
- **API**: `api/` - Serverless functions

## Key Files

- `src/core/morse/timing.ts` - Morse timing calculations (WPM → dit length, spacing)
- `src/core/types/domain.ts` - TypeScript domain types
- `src/tests/timing.test.ts` - Timing engine tests

## Current Status

✅ Project setup with Vite + React + TypeScript
✅ Morse timing engine with comprehensive tests
🚧 Session scheduler implementation
⏳ Audio engine
⏳ Session state machine
⏳ UI components

## Testing Strategy

Focus on test-driven development for core logic:
- Timing calculations (✅ complete)
- Session state machine (next)
- Text source providers
- Statistics selectors
- Storage repositories

## Implementation Order

Following the build order from `arch.md`:
1. ✅ Core Morse Timing Engine + Scheduler
2. Session state machine (XState)
3. Audio Engine + Feedback adapters
4. Event Log + Statistics selectors
5. Text Sources providers
6. Settings + Storage + migrations

## Notes

- Using Vitest for testing (node environment, no jsdom needed for core logic)
- TypeScript strict mode enabled
- All timing calculations based on standard CW formula: dit = 1200/WPM ms
- Speed tiers: slow(5×dit), medium(3×dit), fast(2×dit), lightning(1×dit)

# Import Context
@spec.md
@arch.md
@STATUS.md

# Instructions for AI Assistants

When working on this project:
1. **Always read STATUS.md first** to understand current progress
2. **Update STATUS.md** when completing tasks or making significant progress
3. **Follow the implementation order** outlined in STATUS.md and arch.md
4. **Run tests** after implementing core logic (`npm test`)
5. **Commit frequently** with descriptive messages including 🤖 Generated with [Claude Code]
