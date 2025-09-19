# Morse Code Learning App

A modern web application for learning Morse code with real-time feedback, statistics tracking, and multiple study modes.

## Features

- **Active Mode**: Type what you hear with immediate feedback
- **Passive Mode**: Listen and learn with visual reveals
- **Real-time Statistics**: Track accuracy, speed, and progress over time
- **Multiple Text Sources**: Random letters, frequency-weighted words, Reddit headlines
- **Configurable Timing**: Adjustable WPM and difficulty levels

## Development

### Prerequisites

- Node.js 18+ (current version: v18.20.7)
- npm

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Run tests with UI
npm run test:ui

# Build for production
npm run build

# Lint code
npm run lint
```

### Testing

The project uses Vitest for testing. Tests are located in `src/tests/` and focus on:

- Core timing calculations (`timing.test.ts`)
- Session state machine logic
- Text source providers
- Statistics selectors

Run tests with:
```bash
npm test           # Run all tests
npm run test:ui    # Interactive test UI
```

### Architecture

The app follows a feature-first architecture:

- `src/core/` - Shared domain logic (timing, storage, types)
- `src/features/` - Feature modules (session, stats, sources, config)
- `src/pages/` - Page components
- `api/` - Serverless functions (RSS proxy)

Key design principles:
- State machine-driven session orchestration
- Pluggable text source providers
- Local storage with versioned migrations
- Test-driven development for core logic

### Current Status

✅ Project setup with Vite + React + TypeScript
✅ Morse timing engine with comprehensive tests
🚧 Session scheduler implementation
⏳ Audio engine
⏳ Session state machine
⏳ UI components