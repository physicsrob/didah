# Morse Academy

A modern web application for learning Morse code with real-time feedback and instant character recognition.

**Live App:** https://morseacademy.pages.dev

## Learning Experiences

Morse Academy offers three distinct ways to study and improve your Morse code skills:

### 🎯 Practice Mode
Interactive training where you type what you hear in real-time. The key distinct element of this mode is that the learner has some control of pacing. They should try to go as fast as possible, but the app will wait (up until the timeout!)
When you are operating in this mode you try to type as quickly as you can, and you optionally get three types of feedback:
- Visual Flash
- Buzzer
- Replay -- When a character is missed it will show the character to you on the screen and play the audio for it again.

### 👂 Listen Mode
Passive listening experience where Morse code is played and then revealed on screen after a timed delay. Ideal for familiarizing yourself with Morse patterns without pressure. You simply listen, try to decode mentally, then see the correct answer. Great for when you want a more relxed experience. 

### 📻 Live Copy Mode
Copying experience that more closely simulates real morse code copy -- no controlling the transmission pacing -- no feedback until you are done.

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
- User settings and configuration

## Architecture

See [arch.md](arch.md) for detailed architecture documentation.

## Development

### Commands

```bash
# Development
npm run dev          # Start Cloudflare dev server (app + API) on http://localhost:3000
npm run dev:vite    # Start Vite only (no API) on http://localhost:5173
npm test            # Run tests in watch mode
npm run test:ui     # Interactive test UI
npm run build       # Build for production

# Quality Checks (run before committing!)
npm run check       # TypeScript, ESLint, and tests
npm run check:fix   # Same but auto-fix lint issues
npm run typecheck   # TypeScript only
npm run lint        # ESLint only

# Deployment
npm run deploy      # Deploy to Cloudflare Pages
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

- **Frontend**: React 19 + TypeScript + Vite
- **Audio**: WebAudio API
- **Testing**: Vitest
- **Hosting**: Cloudflare Pages
- **API**: Cloudflare Pages Functions

## Deployment

The entire app (frontend + API) is deployed on Cloudflare Pages at:
**https://morseacademy.pages.dev**

### Deployment Process

```bash
# Build and deploy to Cloudflare Pages
npm run deploy

# Or manually:
npm run build                          # Build frontend
npx wrangler pages deploy ./dist       # Deploy to Cloudflare
```

### Local Development

```bash
# Run everything (frontend + API) - RECOMMENDED
npm run dev             # http://localhost:3000

# Run frontend only (Vite dev server)
npm run dev:vite        # http://localhost:5173
```

### Cloudflare Configuration

- **Project**: morseacademy
- **Functions**: Located in `/functions/api/`
- **Build Output**: `./dist`
- **Config File**: `wrangler.toml`

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
