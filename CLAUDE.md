# Claude Code Configuration

This file contains configuration and context for working with Morse Academy using Claude Code.

## Project Overview

A modern web application for learning Morse code with real-time feedback, statistics tracking, and multiple study modes. Built with React + TypeScript + Vite, deployed on Cloudflare Pages.

**Live App:** https://morse.academy

## Development Commands

```bash
# Development
npm run dev          # Start Cloudflare dev server (app + API on localhost:3000)
npm run dev:vite    # Start Vite only (no API on localhost:5173)
npm test            # Run all tests (watch mode)
npm run test:ui     # Interactive test UI
npm run build       # Build for production

# Quality Checks (run these before committing!)
npm run check       # Run ALL checks: TypeScript, ESLint, and tests
npm run check:fix   # Same as check but auto-fix lint issues
npm run typecheck   # TypeScript type checking only
npm run lint        # ESLint only

# Deployment
npm run deploy      # Deploy to Cloudflare Pages
```

## Architecture
- **Core Domain**: `src/core/` - Timing engine, alphabet, types
- **Runtime System**: `src/features/session/runtime/` - Session orchestration
- **Modes**: `src/features/session/modes/` - Mode implementations (Practice, Listen, Live Copy, Word Practice, Runner)
- **Services**: `src/features/session/services/` - Audio, feedback
- **Pages**: `src/pages/` - React components
- **API Functions**: `functions/api/` - Cloudflare Pages Functions

## Styling Approach

**IMPORTANT: This project uses regular CSS files with class names. We do NOT use Tailwind CSS.**
- Style files are in `src/styles/` and component-specific CSS files
- Main styles: `src/styles/main.css` (CSS variables, base styles)
- Component styles: `src/components/ComponentName.css`
- Page styles: `src/styles/pageName.css`
- Write semantic class names, not utility classes
- Use the CSS variables defined in main.css for colors and spacing
- See `brand.md` for design guidelines

## Key Files

- `src/core/morse/timing.ts` - Morse timing calculations (WPM → dit length)
- `src/core/morse/alphabet.ts` - Character to Morse pattern mappings
- `src/features/session/runtime/sessionProgram.ts` - Main session orchestrator
- `src/features/session/modes/shared/registry.ts` - Mode registry and type-safe mode system
- `src/features/session/modes/practice/` - Practice mode implementation
- `src/features/session/modes/listen/` - Listen mode implementation
- `src/features/session/modes/liveCopy/` - Live Copy mode (evaluation logic not yet implemented)
- `src/pages/SessionPage.tsx` - Session container managing config → active → complete phases
- `src/pages/ActiveSessionPage.tsx` - Active session UI (all modes)
- `src/pages/SessionConfigPage.tsx` - Session configuration UI
- `src/pages/SessionCompletePage.tsx` - Session results display

# Import Context
@README.md

# Instructions for AI Assistants

When working on this project:
- **Dev server is likely already running** - The user probably has `npm run dev` running in another terminal. Check before starting it.
- **Run tests** after implementing core logic (`npm test`)
- **Run quality checks** before committing (`npm run check`)
- **Deploy with** `npm run deploy` to push changes to production
- **Read brand.md before modifying HTML/CSS** to ensure consistent styling and branding
- **IMPORTANT** Never provide implementation time estimates. Don't say how long it will take to implement or fix something!


## Code Philosophy

**IMPORTANT: These principles override default coding practices:**

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
