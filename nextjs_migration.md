# Next.js Migration Plan for CodeBeat

## Overview
This document outlines the complete migration plan from Vite + React to Next.js 14 for the CodeBeat Morse code training application. The migration will consolidate the frontend and serverless API into a single Next.js application, resolving current Vercel dev server integration issues.

## Migration Scope

### What Changes
- **Build System**: Vite → Next.js build system
- **Routing**: React Router DOM → Next.js App Router (file-based)
- **Page Structure**: React pages → Next.js pages with proper SSR/CSR handling
- **API Routes**: Standalone Vercel functions → Next.js API routes
- **Dev Server**: Separate Vite + Vercel dev → Single Next.js dev server

### What Stays the Same (80% of codebase)
- All core Morse logic (`/src/core/`)
- Session runtime system (`/src/features/session/runtime/`)
- Audio engine and services (`/src/features/session/services/`)
- Business logic and algorithms
- Component logic (with minor wrapper changes)
- CSS styles (can be kept as-is or migrated to CSS modules)
- Test suite (with config adjustments)

## Pre-Migration Checklist

- [ ] Merge with master branch to avoid conflicts
- [ ] Create backup branch: `git checkout -b pre-nextjs-backup`
- [ ] Document any custom Vite plugins or configurations in use
- [ ] Note any environment variables in use
- [ ] Ensure all tests are passing

## Phase-by-Phase Migration

### Phase 1: Project Setup (30-45 minutes)

#### 1.1 Create Next.js Application
```bash
# In morse-serverless directory (after backing up current code)
npx create-next-app@latest . --typescript --app --tailwind=no --import-alias='@/*'

# When prompted:
# - Yes to TypeScript
# - No to ESLint (we have our own config)
# - No to Tailwind CSS
# - Yes to App Router
# - Customize import alias: @/*
```

#### 1.2 Install Required Dependencies
```bash
# Core dependencies (match current versions where possible)
npm install react@19.1.1 react-dom@19.1.1

# Development dependencies from current project
npm install --save-dev @types/node @types/react @types/react-dom
npm install --save-dev vitest @vitest/ui tsx typescript

# Keep existing linting setup
npm install --save-dev eslint @eslint/js typescript-eslint
npm install --save-dev eslint-plugin-react-hooks eslint-plugin-react-refresh
```

#### 1.3 Directory Structure Setup
```
morse-serverless/
├── app/                      # Next.js App Router
│   ├── layout.tsx           # Root layout
│   ├── page.tsx             # Home page
│   ├── session-config/
│   │   └── page.tsx
│   ├── session/
│   │   └── page.tsx
│   ├── statistics/
│   │   └── page.tsx
│   ├── settings/
│   │   └── page.tsx
│   └── api/                 # API routes
│       ├── sources/
│       │   ├── route.ts
│       │   └── [id]/
│       │       └── route.ts
├── lib/                     # Non-page code (was src/)
│   ├── core/               # Copy from src/core/
│   ├── features/           # Copy from src/features/
│   ├── contexts/           # Copy from src/contexts/
│   └── utils/              # Any utilities
├── components/             # React components
├── public/                 # Static assets
├── styles/                 # Global styles
└── tests/                  # Test files
```

### Phase 2: Core Code Migration (2-3 hours)

#### 2.1 Copy Business Logic (No changes needed)
```bash
# These can be copied as-is
cp -r src/core lib/core
cp -r src/features lib/features
cp -r src/contexts lib/contexts
cp -r src/components components/
cp -r src/styles styles/
cp -r src/tests tests/
```

#### 2.2 Update Import Paths
All imports need updating from `src/` to `@/lib/`:
- `import { timing } from '../src/core/morse/timing'` → `import { timing } from '@/lib/core/morse/timing'`
- Remove `.js` extensions from all imports

#### 2.3 Convert Page Components

**Current HomePage.tsx → app/page.tsx**
```tsx
// Before (HomePage.tsx)
import { useNavigate } from 'react-router-dom';
export function HomePage() {
  const navigate = useNavigate();
  // ...
}

// After (app/page.tsx)
'use client';
import { useRouter } from 'next/navigation';
export default function HomePage() {
  const router = useRouter();
  // Replace navigate('/path') with router.push('/path')
}
```

**Current StudyPage.tsx → app/session/page.tsx**
```tsx
'use client';
import { useSearchParams } from 'next/navigation';

export default function StudyPage() {
  const searchParams = useSearchParams();
  // Get config from searchParams or context instead of location.state

  // Wrap WebAudio initialization
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Initialize audio context
    }
  }, []);
}
```

#### 2.4 Navigation State Handling
React Router's location.state needs replacement:

**Option A: URL Parameters**
```tsx
// Navigation
router.push(`/session?config=${encodeURIComponent(JSON.stringify(config))}`);

// Receiving page
const config = JSON.parse(searchParams.get('config') || '{}');
```

**Option B: Context + SessionStorage**
```tsx
// Create a SessionConfigContext that persists to sessionStorage
// This maintains the data across navigation without URL clutter
```

### Phase 3: API Routes Migration (1 hour)

#### 3.1 Convert Vercel Functions to Next.js API Routes

**Current: api/sources.ts**
```ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
export default function handler(req: VercelRequest, res: VercelResponse) {
  // ...
}
```

**New: app/api/sources/route.ts**
```ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    sources: SOURCES,
    total: SOURCES.length
  });
}
```

**Current: api/sources/[id].ts**
```ts
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  // ...
}
```

**New: app/api/sources/[id]/route.ts**
```ts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  // Generate or fetch content
  return NextResponse.json({ content });
}
```

#### 3.2 Remove CORS Headers
Next.js API routes on same origin don't need CORS:
```ts
// Remove all these headers - not needed anymore
headers: [
  { "key": "Access-Control-Allow-Origin", "value": "*" },
  // etc.
]
```

### Phase 4: Client-Side Compatibility (1-2 hours)

#### 4.1 Create Client Wrapper for Providers
**app/providers.tsx**
```tsx
'use client';

import { AudioProvider } from '@/lib/contexts/AudioContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AudioProvider>
      {children}
    </AudioProvider>
  );
}
```

**app/layout.tsx**
```tsx
import { Providers } from './providers';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

#### 4.2 Guard Browser APIs
```tsx
// Before
const startTime = performance.now();

// After
const startTime = typeof window !== 'undefined' ? performance.now() : Date.now();

// Or use a utility
function getTime() {
  if (typeof window !== 'undefined' && window.performance) {
    return performance.now();
  }
  return Date.now();
}
```

#### 4.3 Handle WebAudio Context
```tsx
// In AudioProvider or useAudio hook
useEffect(() => {
  if (typeof window === 'undefined') return;

  // Safe to use WebAudio API here
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  // ...
}, []);
```

### Phase 5: Configuration & Build Setup (1 hour)

#### 5.1 Next.js Configuration
**next.config.js**
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React 19 if needed
  experimental: {
    // Add any experimental features
  },

  // Handle any special imports
  webpack: (config) => {
    // Add any custom webpack config if needed
    return config;
  },
};

module.exports = nextConfig;
```

#### 5.2 TypeScript Configuration
**tsconfig.json**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

#### 5.3 Update Package.json Scripts
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "typecheck": "tsc --noEmit"
  }
}
```

### Phase 6: Testing & Validation (1-2 hours)

#### 6.1 Test Configuration
**vitest.config.ts**
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

#### 6.2 Validation Checklist
- [ ] All pages load correctly
- [ ] Navigation works between all pages
- [ ] Session config passes correctly to study page
- [ ] Audio playback works
- [ ] Keyboard input captured correctly
- [ ] API routes respond correctly
- [ ] Text sources load from API
- [ ] Session timer works
- [ ] Feedback (buzzer/flash) works
- [ ] All existing tests pass
- [ ] Build completes successfully

### Phase 7: Deployment (30 minutes)

#### 7.1 Vercel Deployment
```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Deploy to Vercel
vercel

# Follow prompts - it will auto-detect Next.js
```

#### 7.2 Environment Variables
Set any required environment variables in Vercel dashboard:
- API keys (if any)
- Feature flags (if any)

## Rollback Plan

If issues arise during migration:
1. Keep the original Vite version in a separate branch
2. Can deploy both versions to different URLs for A/B testing
3. Git history preserves all original code

## Common Gotchas & Solutions

### Issue: "window is not defined"
**Solution**: Wrap in `typeof window !== 'undefined'` check or use `useEffect`

### Issue: Hydration mismatch
**Solution**: Ensure server and client render the same initial content, use `suppressHydrationWarning` sparingly

### Issue: Dynamic imports fail
**Solution**: Use Next.js `dynamic()` function:
```tsx
import dynamic from 'next/dynamic';
const DynamicComponent = dynamic(() => import('./Component'), { ssr: false });
```

### Issue: CSS modules not working
**Solution**: Rename `.css` files to `.module.css` and update imports

### Issue: API route not found
**Solution**: Ensure correct file structure (`route.ts` not `index.ts`)

## Post-Migration Improvements

Once migration is complete, consider these Next.js-specific optimizations:

1. **Image Optimization**: Use `next/image` for automatic image optimization
2. **Font Optimization**: Use `next/font` for web font loading
3. **Static Generation**: Pre-render pages that don't need real-time data
4. **API Route Caching**: Add caching headers to API responses
5. **Bundle Analysis**: Use `@next/bundle-analyzer` to optimize bundle size

## Success Metrics

Migration is complete when:
- ✅ Single `npm run dev` command runs both frontend and API
- ✅ All functionality from Vite version works
- ✅ Deployment to Vercel is one-click
- ✅ No console errors in development or production
- ✅ All tests pass
- ✅ Build time is under 2 minutes
- ✅ Page load performance is equal or better

## Timeline Estimate

- **Total Time**: 6-8 hours of focused work
- **Can be split across**: 2-3 days
- **Recommended approach**: Do phases 1-2 in one session, test thoroughly, then complete remaining phases

## Questions to Resolve Before Starting

1. Should we use App Router or Pages Router? (Recommended: App Router for future-proofing)
2. Keep CSS as-is or migrate to CSS Modules? (Can be done later)
3. Add TypeScript strict mode? (Recommended: Yes)
4. Include analytics? (Can add Vercel Analytics easily)

---

*Last updated: 2025-09-21*
*Ready to execute after merging with master branch*