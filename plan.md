# Text Sources Refactoring Plan

## Overview
Move Reddit source variant definitions and formatting from frontend to backend for cleaner architecture and better separation of concerns.

## Phase 1: Move Variants & Formatting to Backend

### Goal
Backend owns all source definitions, variants, and formatting. Frontend becomes a simple consumer.

### Changes Required

#### 1. Backend: Define Explicit Variants (`functions/api/sources.ts`)
- Expand Reddit sources into explicit `_headlines` and `_full` variants
- Remove URL field (not needed in source list)
- Each variant gets unique description

**Before:**
```typescript
{ id: 'reddit_popular', name: 'Popular', type: 'rss', category: 'reddit', description: '...', url: '...' }
```

**After:**
```typescript
{ id: 'reddit_popular_headlines', name: 'Popular (Headlines)', type: 'rss', category: 'reddit', description: 'Trending post titles from r/popular on Reddit' }
{ id: 'reddit_popular_full', name: 'Popular (Full)', type: 'rss', category: 'reddit', description: 'Complete posts with content from r/popular on Reddit' }
```

Notes:
- **Remove URL from SOURCES response entirely** (implementation detail)
- Backend builds internal URL map independently:
  ```typescript
  const RSS_URLS = {
    'reddit_popular': 'https://www.reddit.com/r/popular.rss',
    'hackernews': 'https://news.ycombinator.com/rss',
    'bbc_news': 'http://feeds.bbci.co.uk/news/rss.xml',
  };
  ```

#### 2. Backend: Format Data (`functions/api/sources/[id].ts`)

**Changes:**
- Strip `_(headlines|full)` suffix to get base ID for cache lookup
- Format based on suffix:
  - `_headlines`: Join titles with " = " separator → single string
  - `_full`: Format as "Title = Body AR" for each post → single string
- Return consistent shape: `{ id, items: [string] }` (single-element array)

**Example:**
```typescript
const baseId = id.replace(/_(headlines|full)$/, '');
if (baseId.startsWith('reddit_') && kv) {
  const posts = await kv.get(`reddit:${baseId}`, 'json');

  let formattedText: string;
  if (id.endsWith('_full')) {
    // Full mode: "Title 1 = Body 1 AR Title 2 = Body 2 AR ..."
    formattedText = posts.map(p => {
      const body = stripUrls(p.body.trim());
      return body ? `${p.title} = ${body} AR` : `${p.title} AR`;
    }).join(' ');
  } else {
    // Headlines mode: "Title 1 = Title 2 = Title 3 = ..."
    formattedText = posts.map(p => p.title + ' = ').join('');
  }

  return Response.json({ id, items: [formattedText] });
}
```

#### 3. Frontend: Remove Enrichment (`src/features/sources/api.ts`)

**Remove:**
- All Reddit enrichment logic (lines 18-34)
- Frontend no longer manipulates source list
- **SIMPLIFY**: `fetchSources()` becomes a simple pass-through - just return backend response as-is

**No backward compatibility needed** - This is a breaking change, deploy atomically

#### 4. Frontend: Simplify Source Factory (`src/features/sources/sourceFactory.ts`)

**Remove entirely:**
- `FullPostSource` class usage
- `isFullPostArray()` type guard function
- All ID pattern matching (`id.includes('reddit')`, `id.includes('words')`, etc.)
- `_full` suffix checking
- `FullPost` import
- All source type conditionals (lines 60-88)

**Replace with simple logic:**
```typescript
export function createCharacterSource(
  content: SourceContent | null,
  effectiveAlphabet: string[],
  emissionGranularity: 'character' | 'word'
): CharacterSource {
  if (!content?.items?.length) {
    throw new Error('No source content provided');
  }

  const text = content.items[0]; // Always a single string now

  if (emissionGranularity === 'word') {
    return new WordSource(text);
  }

  return new ContinuousTextSource(text);
}
```

**Massive simplification** - goes from ~90 lines to ~15 lines!

#### 5. Frontend: Remove FullPost Types (`src/features/sources/types.ts`)

**Remove entirely:**
- `FullPost` interface (no longer exists on frontend)
- `backendId` field from `TextSource` (pure tech debt)

**Simplify:**
- `SourceContent.items` is now ALWAYS `string[]` (never a union type)
- `TextSource` has only: `id`, `name`, `type`, `requiresAuth?`, `category?`, `description?`

#### 6. Frontend: Clean Up Character Sources (`src/features/sources/characterSources.ts`)

**Remove entirely:**
- `FullPostSource` class (and all its methods)
- `ArraySource` class (no longer needed with single-string format)
- `stripUrls()` function (moved to backend)
- `FullPost` import

**Keep only:**
- `ContinuousTextSource` - handles all single-string sources
- `WordSource` - handles word practice mode

This file shrinks significantly - only 2 source types needed!

#### 7. Frontend: Update SessionConfigPage

**Remove:**
- All `backendId` references (use `id` directly)
- ID override logic (lines 122-124)
- Special-case handling for different source types

**Simplify:**
- `loadSourceContent()` just fetches by ID, no manipulation
- Remove source type conditionals

**Before:**
```typescript
const content = await fetchSourceContent(source.backendId, source.requiresAuth ?? false, alphabet);
return { ...content, id: sourceId }; // Override ID
```

**After:**
```typescript
const content = await fetchSourceContent(source.id, source.requiresAuth ?? false, alphabet);
return content; // Clean pass-through
```

### Testing Checklist
- [ ] All source types load correctly
- [ ] Headlines variant shows titles only with " = " separator
- [ ] Full variant shows "Title = Body AR" format
- [ ] Generated sources still work (random letters, top words)
- [ ] Word practice mode works with all sources
- [ ] TypeScript compiles without errors
- [ ] All tests pass
- [ ] ESLint passes

---

## Phase 2: Polish Reddit Descriptions

### Goal
Write compelling, differentiated descriptions for each Reddit source variant that clearly distinguish headlines vs. full content.

### Approach
Each source should have a unique, engaging description that:
1. Clearly indicates whether it's titles-only or full content
2. Captures the character/flavor of that subreddit
3. Helps users choose the right source for their practice

### Reddit Sources to Update

#### r/popular
- **Headlines**: "Trending post titles from across Reddit"
- **Full**: "Complete posts with full content from r/popular on Reddit"

#### r/news
- **Headlines**: "Breaking news headlines from r/news"
- **Full**: "Full news articles and discussions from r/news on Reddit"

#### r/amateurradio
- **Headlines**: "Ham radio discussion topics from r/amateurradio"
- **Full**: "In-depth ham radio conversations from r/amateurradio on Reddit"

#### r/AmItheAsshole
- **Headlines**: "Relationship dilemma titles from r/AmItheAsshole"
- **Full**: "Complete relationship stories with all the drama from r/AmItheAsshole on Reddit"

### Implementation
Update `functions/api/sources.ts` with polished descriptions for each variant.

### Considerations
- Descriptions should be concise (one line)
- Make it clear what content you're getting
- Add personality where appropriate (e.g., "all the drama" for AITA)
- Use consistent language patterns across similar sources

---

## Files Modified Summary

### Phase 1
**Backend:**
- `functions/api/sources.ts` - Define explicit variants
- `functions/api/sources/[id].ts` - Add formatting logic, strip suffixes

**Frontend:**
- `src/features/sources/api.ts` - Remove enrichment
- `src/features/sources/types.ts` - Simplify types, remove FullPost
- `src/features/sources/sourceFactory.ts` - Simplify to use only ContinuousTextSource/WordSource
- `src/features/sources/characterSources.ts` - Remove FullPostSource and ArraySource
- `src/pages/SessionConfigPage.tsx` - Remove backendId usage

### Phase 2
**Backend:**
- `functions/api/sources.ts` - Update descriptions only

---

## Benefits of This Refactoring

1. **Single Source of Truth**: Backend owns all source metadata
2. **Simpler Frontend**: No data manipulation, just display
3. **Consistent Data Shape**: Everything is `string[]`
4. **Better Separation**: Backend handles domain logic (formatting, separators)
5. **Easier to Extend**: Adding new sources/variants only touches backend
6. **Type Safety**: Fewer type guards and runtime checks needed
7. **Performance**: Less client-side processing

---

## Additional Tech Debt Reductions

### Opportunities Identified

1. **Type Unions Eliminated**: `SourceContent.items` goes from `string[] | FullPost[]` to just `string[]`
2. **Conditional Logic Removed**: sourceFactory drops from ~90 lines to ~15 lines
3. **Class Count Reduced**: From 4 character source classes to 2
4. **Type Guards Eliminated**: No more `isFullPostArray()` or type checking
5. **ID Manipulation Gone**: No more ID overrides or suffix checking
6. **Dual ID System Removed**: `backendId` field completely eliminated
7. **Frontend Types Cleaned**: `FullPost` type removed from frontend entirely

### What We're NOT Doing (Out of Scope)

- Changing RSS fetching strategy (still on-demand for non-Reddit)
- Unifying caching approach across all RSS sources
- Changing how confusing_characters works
- Modifying user settings structure

---

## Migration Notes

- **This is a breaking change** - no backward compatibility needed
- User settings with existing `reddit_popular_headlines` IDs will work (ID format unchanged)
- No database migrations needed
- **Deploy atomically** - backend and frontend must be deployed together
- If deployment fails, rollback both together
