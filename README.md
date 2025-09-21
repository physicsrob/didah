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
- **Serverless**: Vercel Functions

## Deployment

The entire app (frontend + API) is deployed together on Vercel at:
**https://morse-serverless.vercel.app**

### Full Deployment Process

```bash
# 1. Build and test locally
npm run build           # Build frontend
npx vercel dev          # Test everything locally (frontend + API)

# 2. Deploy to preview (gets unique URL for testing)
npx vercel

# 3. Deploy to production
npx vercel --prod
```

That's it! One command deploys both:
- **Frontend**: https://morse-serverless.vercel.app
- **API**: https://morse-serverless.vercel.app/api/*

### Local Development

```bash
# Run frontend only (Vite dev server)
npm run dev             # http://localhost:5173

# Run frontend + API together (Vercel dev)
npx vercel dev          # http://localhost:3000

# Run API only on custom port
npx vercel dev --listen 3001
```

### API Endpoints

#### GET `/api/sources`
Returns list of all available text sources.

```json
{
  "sources": [
    {"id": "random_letters", "name": "Random Letters", "type": "generated"},
    {"id": "common_words", "name": "Common Words", "type": "generated"},
    {"id": "reddit_popular", "name": "Reddit Popular", "type": "rss"},
    ...
  ],
  "total": 9
}
```

#### GET `/api/sources/[id]`
Returns text content from a specific source.

```json
// Example: /api/sources/common_words
{
  "id": "common_words",
  "items": ["the be to of and a in that have i ..."]
}

// Example: /api/sources/reddit_popular
{
  "id": "reddit_popular",
  "items": [
    "First headline from Reddit",
    "Second headline from Reddit",
    ...
  ]
}
```

**Available Sources:**
- `random_letters` - Random A-Z characters
- `common_words` - Frequency-weighted English words
- `common_words_easy` - Short common words only
- `reddit_popular` - Headlines from r/popular
- `reddit_news` - Headlines from r/news
- `reddit_amateurradio` - Amateur radio discussions
- `reddit_aitah` - AITA story titles
- `hackernews` - Hacker News headlines
- `bbc_news` - BBC News headlines

## Contributing

1. Read [STATUS.md](STATUS.md) to understand current state
2. Check [tech_debt.md](tech_debt.md) for cleanup opportunities
3. Follow the runtime architecture patterns in [arch.md](arch.md)
4. Run `npm run check` before committing

## License

Private project - not for public distribution.