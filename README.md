# Morse Academy

A modern web application for learning Morse code with real-time feedback and instant character recognition.

**Live App:** https://morseacademy.pages.dev

## Learning Experiences

Morse Academy offers three distinct ways to study and improve your Morse code skills:

### 🎯 Practice Mode
Interactive training where you type what you hear in real-time with immediate feedback. The key distinct element of this mode is that the learner has some control of pacing. They should try to go as fast as possible, but the app will wait (up until the timeout!)
When you are operating in this mode you try to type as quickly as you can, and you optionally get three types of feedback:
- Visual Flash - immediate visual feedback on errors
- Buzzer - immediate audio feedback on errors
- Replay - When a character is missed it will show the character to you on the screen and play the audio for it again

### 👂 Listen Mode
Passive listening experience where Morse code is played and then revealed on screen after a timed delay. Ideal for familiarizing yourself with Morse patterns without pressure. You simply listen, try to decode mentally, then see the correct answer. Great for when you want a more relaxed experience.

### 📻 Live Copy Mode
Copying experience that more closely simulates real morse code copy -- no controlling the transmission pacing, no feedback during the session. You type what you hear, and all corrections are revealed only at the end of the session.

## Documentation

- **[spec.md](spec.md)** - Product requirements and feature specifications
- **[CLAUDE.md](CLAUDE.md)** - Claude Code configuration and AI assistant context
- **[brand.md](brand.md)** - Brand guide describing styling 

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
      /modes      # Mode implementations (Practice, Listen, Live Copy)
      /runtime    # Main session orchestration
      /services   # Audio engine, feedback
    /sources      # Text source providers
  /pages          # React components
  /tests          # Test files
```

### Architecture

#### Mode System

Session modes are organized as self-contained, feature-first modules. Each mode contains all its logic in one directory:

```
src/features/session/modes/
  practice/       # Practice mode implementation
    emission.ts   # Pure timing and input logic
    handler.ts    # Session integration
    ui.tsx        # React components
    index.ts      # Mode definition
    __tests__/    # Mode-specific tests
  listen/         # Listen mode implementation
  liveCopy/       # Live Copy mode implementation
  shared/         # Mode interfaces and registry
    types.ts      # ModeDefinition interface
    registry.ts   # Type-safe mode registry
    README.md     # Mode implementation guide
```

**Benefits**:
- **Locality of behavior** - All mode code in one directory
- **Safe mode addition** - Type-enforced registration prevents missing implementations
- **Better testing** - Test mode logic independently of React
- **Easier onboarding** - Clear pattern to follow for new modes

See `src/features/session/modes/shared/README.md` for a detailed guide on implementing new modes.

### Testing

Tests use Vitest and focus on core logic:
- Timing calculations (`src/tests/timing.test.ts`)
- Mode implementations (`src/features/session/modes/*/tests__/`)
- Runtime session logic (`src/features/session/runtime/__tests__/`)
- Audio engine integration (`src/tests/audioEngine.integration.test.ts`)

Currently 57 tests passing.

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


## License

Private project - not for public distribution.
