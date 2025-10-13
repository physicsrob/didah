# Development Guide

This guide covers everything you need to know to develop and contribute to Morse Academy.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server (recommended)
npm run dev             # http://localhost:3000

# Run tests in watch mode
npm test

# Run quality checks before committing
npm run check
```

## Commands

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

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Audio**: WebAudio API
- **Testing**: Vitest
- **Hosting**: Cloudflare Pages
- **API**: Cloudflare Pages Functions

## Project Structure

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

### Key Files

- `src/core/morse/timing.ts` - Morse timing calculations (WPM → dit length)
- `src/core/morse/alphabet.ts` - Character to Morse pattern mappings
- `src/features/session/runtime/sessionProgram.ts` - Main session orchestrator
- `src/features/session/modes/shared/registry.ts` - Mode registry and type-safe mode system
- `src/features/session/modes/practice/` - Practice mode implementation
- `src/features/session/modes/listen/` - Listen mode implementation
- `src/features/session/modes/liveCopy/` - Live Copy mode
- `src/pages/SessionPage.tsx` - Session container managing config → active → complete phases
- `src/pages/ActiveSessionPage.tsx` - Active session UI (all modes)
- `src/pages/SessionConfigPage.tsx` - Session configuration UI
- `src/pages/SessionCompletePage.tsx` - Session results display

## Architecture

### Core Domain (`src/core/`)
Timing engine, alphabet, and core types.

### Runtime System (`src/features/session/runtime/`)
Session orchestration that coordinates modes, audio, and feedback.

### Mode System (`src/features/session/modes/`)

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

### Services (`src/features/session/services/`)
Audio engine and feedback services.

### API Functions (`functions/api/`)
Cloudflare Pages Functions for text sources and utilities.

## Styling Approach

**IMPORTANT: This project uses regular CSS files with class names. We do NOT use Tailwind CSS.**

- Style files are in `src/styles/` and component-specific CSS files
- Main styles: `src/styles/main.css` (CSS variables, base styles)
- Component styles: `src/components/ComponentName.css`
- Page styles: `src/styles/pageName.css`
- Write semantic class names, not utility classes
- Use the CSS variables defined in main.css for colors and spacing
- See `brand.md` for design guidelines

## Testing

Tests use Vitest and focus on core logic:
- Timing calculations (`src/tests/timing.test.ts`)
- Mode implementations (`src/features/session/modes/*/tests__/`)
- Runtime session logic (`src/features/session/runtime/__tests__/`)
- Audio engine integration (`src/tests/audioEngine.integration.test.ts`)

Currently 57 tests passing.

Run tests with:
```bash
npm test        # Watch mode
npm run test:ui # Interactive UI
```

## Code Philosophy

**These principles override default coding practices:**

### Function Arguments
- **Never use optional arguments by default** - Only make arguments optional when explicitly necessary
- Required arguments make function contracts clearer and prevent silent failures
- Example: Use `function foo(bar: string)` not `function foo(bar?: string)`

### Code Cleanup
- **Never mark code as deprecated** - Delete it immediately
- Dead code creates confusion and maintenance burden
- If code might be needed later, it's in git history

### Fallback Values
- **Be extremely careful with fallbacks** like `const c = a || b`
- Only use fallbacks when you explicitly want that behavior
- Prefer explicit checks: `if (a !== undefined) { ... }`
- Fallbacks can hide bugs by masking undefined/null values

### Clarity Over Robustness
- **Prefer code that is easy to analyze over code that is "robust"**
- It's better for code to fail obviously than to silently handle edge cases
- The most important thing is being able to reason about code behavior
- Example: Throw errors for unexpected states rather than trying to recover
- Clear failure points make debugging much easier

## Contributing

Pull requests are welcome! Please:
1. Run `npm run check` before submitting to ensure all tests pass and code meets quality standards
2. Follow the existing code style and architecture patterns
3. Add tests for new functionality
4. Keep changes focused and atomic

See [DEPLOYMENT.md](DEPLOYMENT.md) for information on how the production site is deployed.
