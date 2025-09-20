# CodeBeat

A modern web application for learning Morse code with real-time feedback and instant character recognition.

## Documentation

- **[spec.md](spec.md)** - Product requirements and feature specifications
- **[arch.md](arch.md)** - Technical architecture and implementation details
- **[STATUS.md](STATUS.md)** - Current implementation status and next steps
- **[tech_debt.md](tech_debt.md)** - Known technical debt and cleanup needed
- **[CLAUDE.md](CLAUDE.md)** - Claude Code configuration and AI assistant context

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests (watch mode)
npm test

# Run all quality checks before committing
npm run check
```

## Features

### Implemented ✅
- **Active Mode**: Type what you hear with immediate feedback
- **Passive Mode**: Listen and learn with timed character reveals
- **Real-time feedback**: Visual flash on errors
- **Session timer**: Track remaining time
- **Accuracy tracking**: Within-session statistics
- **Random letters**: Basic text source

### Not Yet Implemented ❌
- Statistics persistence and history
- Multiple text sources (words, RSS, hard characters)
- User settings and configuration
- Multiple pages/routing

## Architecture

The app uses a **runtime-based session orchestration** approach (not state machines):
- Single async conductor function manages the entire session
- Centralized timing through Clock abstraction with AbortSignal cancellation
- IO abstraction isolates all side effects
- Race/select utility for handling concurrent operations (input vs timeout)

See [arch.md](arch.md) for detailed architecture documentation.

## Development

### Commands

```bash
# Development
npm run dev          # Start dev server on http://localhost:5173
npm test            # Run tests in watch mode
npm run test:ui     # Interactive test UI
npm run build       # Build for production

# Quality Checks (run before committing!)
npm run check       # TypeScript, ESLint, and tests
npm run check:fix   # Same but auto-fix lint issues
npm run typecheck   # TypeScript only
npm run lint        # ESLint only
```

### Project Structure

```
/src
  /core           # Domain logic (timing, alphabet, types)
  /features
    /session
      /runtime    # Main session orchestration
      /services   # Audio engine, feedback
    /sources      # Text source providers
  /pages          # React components
  /tests          # Test files
```

### Testing

Tests use Vitest and focus on core logic:
- Timing calculations (`src/tests/timing.test.ts`)
- Runtime session logic (`src/features/session/runtime/__tests__/`)
- Audio engine integration (`src/tests/audioEngine.integration.test.ts`)

Currently ~32 tests passing.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Inline styles (tech debt - should be CSS modules)
- **Audio**: WebAudio API
- **Testing**: Vitest
- **Future**: Vercel for hosting + serverless functions

## Contributing

1. Read [STATUS.md](STATUS.md) to understand current state
2. Check [tech_debt.md](tech_debt.md) for cleanup opportunities
3. Follow the runtime architecture patterns in [arch.md](arch.md)
4. Run `npm run check` before committing

## License

Private project - not for public distribution.