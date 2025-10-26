# Learn Mode Revision Plan

## Overview

Simplify Learn Mode by removing the mastery-based system in favor of a simpler "new vs existing characters" model, rename "level" to "lesson" throughout, and move progress tracking from session statistics queries to the settings system.

## Goals

1. **Simplify source generation** - Remove historical stats-based mastery calculation, use deterministic new/existing character logic
2. **Rename terminology** - "level" → "lesson" throughout codebase
3. **Move progress to settings** - Store stars per lesson in UserSettings (works for anonymous users, syncs when authenticated)
4. **Simplify adaptive reveal** - Based on new characters for current lesson, not historical mastery
5. **Clean up code** - Remove unused mastery calculation and complex content generation

## Key Architectural Changes

### Before
- Source generation queries 30 days of session stats → calculates mastery → weighted generation (un-mastered=2x, mastered=1x)
- Stars stored in session statistics → queried to display best per level
- Adaptive reveal based on historical mastery across all modes
- Requires authentication for mastery queries

### After
- Source generation uses deterministic algorithm: new chars (5x each) + random fill from all chars → shuffle
- Stars stored in UserSettings → read directly from settings
- Adaptive reveal based on new characters for current lesson only
- Works without authentication (settings sync handles migration)

---

## Implementation Phases

### Phase 1: Constants, Types, and Settings Foundation

**Goal:** Add new constants, update type system for lesson terminology, add progress tracking to settings

#### Tasks

1. **Update `functions/shared/koch.ts`**
   - Add constants:
     ```typescript
     export const MIN_NEW_CHAR_DRILLS = 5;
     export const MIN_LESSON_LENGTH = 20;
     ```
   - Rename all "level" → "lesson" in:
     - `TOTAL_LEVELS` → `TOTAL_LESSONS`
     - `CHARACTERS_PER_LEVEL` → `CHARACTERS_PER_LESSON`
     - Function names: `isValidLevel` → `isValidLesson`, etc.
     - Parameter names, comments, error messages

2. **Update `functions/shared/types.ts`**
   - Rename in SessionConfig:
     - `learnLevel?: number` → `learnLesson?: number`
   - Remove from SessionConfig:
     - `learnUnmasteredChars?: string[]` (no longer needed)
   - Rename in SessionStatistics:
     - `learnLevel?: number` → `learnLesson?: number`
     - `learnStars?: number` (keep as-is)
   - Add to UserSettings:
     ```typescript
     learnProgress?: Record<number, number>; // lesson (1-20) → stars (0-3)
     ```

3. **Update `src/core/types/domain.ts`**
   - Rename `learnLevel` → `learnLesson` in SessionConfig
   - Remove `learnUnmasteredChars`

4. **Update settings default values**
   - In `src/features/settings/store/settingsStore.ts`
   - Add to DEFAULT_SETTINGS:
     ```typescript
     learnProgress: {}
     ```

#### Acceptance Criteria
- [ ] Constants added to koch.ts
- [ ] All type definitions updated (level → lesson)
- [ ] learnProgress added to UserSettings
- [ ] TypeScript compiles without errors
- [ ] Existing tests still pass (will need updates)

---

### Phase 2: Backend Source Generation Algorithm

**Goal:** Rewrite koch source to use new deterministic algorithm (new char drills + random fill)

#### Tasks

1. **Rewrite `functions/api/sources/koch.ts`**

   **Remove:**
   - Historical stats querying (KV fetch logic)
   - Mastery calculation (`analyzeMastery` call)
   - Weighted sequence generation (old algorithm)

   **New algorithm:**
   ```typescript
   // 1. Get new and existing characters
   const newChars = getNewCharactersForLesson(lesson);
   const allChars = getCharactersForLesson(lesson);

   // 2. Build sequence
   const sequence: string[] = [];

   // 3. Add each new char MIN_NEW_CHAR_DRILLS times
   for (const char of newChars) {
     for (let i = 0; i < MIN_NEW_CHAR_DRILLS; i++) {
       sequence.push(char);
     }
   }

   // 4. Fill to MIN_LESSON_LENGTH with random sampling from all chars
   while (sequence.length < MIN_LESSON_LENGTH) {
     const randomChar = allChars[Math.floor(Math.random() * allChars.length)];
     sequence.push(randomChar);
   }

   // 5. Shuffle
   shuffleArray(sequence);

   // 6. Return as text
   return { id: sourceId, text: sequence.join('') };
   ```

   **Implementation notes:**
   - Add `shuffleArray()` utility (Fisher-Yates)
   - Remove authentication requirement (no stats query needed)
   - Update error handling (remove stats-related errors)
   - Simplify to just validate lesson number
   - Update response headers (NO caching - each request generates a new random sequence)

2. **Update source ID pattern**
   - `koch-level-{N}` → `koch-lesson-{N}` in URL parsing
   - Update regex: `/^koch-lesson-(\d+)$/`

3. **Update tests in `functions/api/sources/__tests__/koch.test.ts`**
   - Remove mastery-related tests
   - Add tests for new algorithm:
     - Lesson 1: 2 new chars × 5 = 10, fill 10 more, shuffle = 20
     - Lesson 2: 2 new chars × 5 = 10, fill 10 more from 4 total chars
     - Verify new chars appear at least 5 times each
     - Verify total length = 20
     - Verify only correct chars appear (from lesson's character set)

#### Acceptance Criteria
- [x] Algorithm generates correct sequence for lesson 1, 2, 3, 10, 20
- [x] Each new character appears at least MIN_NEW_CHAR_DRILLS times
- [x] Total length = MIN_LESSON_LENGTH (20)
- [x] Only characters from lesson's set appear
- [x] No authentication required
- [x] Tests pass
- [x] Cannot be cached (sets no-cache headers for randomized content)

---

### Phase 3: Settings Integration for Progress Tracking

**Goal:** Use settings system for star storage instead of querying session statistics

#### Tasks

1. **Update `src/pages/LearnConfigPage.tsx`**

   **Remove:**
   - `fetchLearnProgress()` call
   - `fetchCharacterMastery()` call
   - Stats query logic
   - Loading states for stats

   **Add:**
   - Read stars from settings:
     ```typescript
     const { settings } = useSettings();
     const learnProgress = settings?.learnProgress || {};
     const starsForLesson = (lesson: number) => learnProgress[lesson] || 0;
     ```
   - Update `nextLesson()` logic:
     ```typescript
     const nextLesson = () => {
       for (let i = 1; i <= TOTAL_LESSONS; i++) {
         if ((learnProgress[i] || 0) === 0) return i;
       }
       return TOTAL_LESSONS; // All complete
     };
     ```

   **Update:**
   - Remove `learnUnmasteredChars` from SessionConfig
   - Update `sourceId`: `koch-lesson-${selectedLesson}`
   - Update `sourceName`: `Koch Method - Lesson ${selectedLesson}`

2. **Update `src/pages/SessionCompletePage.tsx`**

   **Add:** Save stars to settings after calculating
   ```typescript
   const { settings, updateSettings } = useSettings();

   // After calculating stars
   const lesson = fullStatistics.config.learnLesson;
   const currentStars = settings?.learnProgress?.[lesson] || 0;

   // Only update if new stars are better
   if (stars > currentStars) {
     await updateSettings({
       learnProgress: {
         ...settings?.learnProgress,
         [lesson]: stars
       }
     });
   }
   ```

   **Keep:** Session statistics save (when authenticated)
   - Still save full stats with `learnLesson` and `learnStars`
   - This is for analytics/history, not for progress display

3. **Update statistics saving**
   - Rename `learnLevel` → `learnLesson` in save logic
   - Update: `learnLesson: fullStatistics.config.learnLesson`

#### Acceptance Criteria
- [ ] Stars read from settings, not stats queries
- [ ] Stars saved to settings on session complete
- [ ] Takes max (current vs new) when updating
- [ ] Works for anonymous users (localStorage only)
- [ ] Syncs to backend when authenticated
- [ ] Session stats still saved (when authenticated) for history
- [ ] No more stats queries in LearnConfigPage

---

### Phase 4: Simplify Adaptive Reveal Logic

**Goal:** Update handler and emission logic to use new character detection instead of historical mastery

#### Tasks

1. **Update `src/features/session/modes/learn/handler.ts`**

   **Remove:**
   - `config.learnUnmasteredChars` lookup
   - Historical mastery logic

   **Add:**
   - Get new characters for lesson:
     ```typescript
     const lesson = config.learnLesson;
     const newCharsForLesson = new Set(getNewCharactersForLesson(lesson));
     ```
   - Pass to emission:
     ```typescript
     runLearnEmission({
       ...,
       unmasteredChars: newCharsForLesson
     });
     ```

   **Rename:**
   - `unmasteredChars` parameter → `newChars` (clearer naming)

2. **Update `src/features/session/modes/learn/emission.ts`**

   **Rename for clarity:**
   - Parameter: `unmasteredChars` → `newChars`
   - Logic: Check if `char in newChars AND first encounter` → adaptive reveal
   - Comments: Update to reference "new characters" not "un-mastered"

3. **Update tests**
   - `handler.test.ts`: Remove mastery-related test cases
   - `emission.test.ts`: Update to use "new chars" terminology
   - Add test: "Adaptive reveal shows answer for new characters only"

#### Acceptance Criteria
- [ ] Adaptive reveal based on lesson's new characters only
- [ ] No dependency on SessionConfig.learnUnmasteredChars
- [ ] Tests updated and passing
- [ ] Clearer naming (newChars vs unmasteredChars)

---

### Phase 5: Rename Level → Lesson in UI/Frontend

**Goal:** Update all user-facing text, CSS classes, and frontend code to use "lesson" terminology

#### Tasks

1. **Update `src/pages/LearnConfigPage.tsx`**
   - Variables: `selectedLevel` → `selectedLesson`
   - Function: `nextLevel()` → `nextLesson()`
   - Text: "Select Level" → "Select Lesson"
   - Text: "Level {N}" → "Lesson {N}"
   - Text: "Start Level {N}" → "Start Lesson {N}"
   - Description: "20 levels" → "20 lessons"
   - CSS classes: `learn-level-*` → `learn-lesson-*`

2. **Update `src/pages/SessionCompletePage.tsx`**
   - Variable: `level` → `lesson` in learnModeData
   - Variable: `nextLevel` → `nextLesson`
   - Text: "Next Level" → "Next Lesson"
   - Text: "Back to Levels" → "Back to Lessons"
   - Comments: Update references

3. **Update `src/features/session/modes/learn/ui.tsx`**
   - Check for any "level" references (likely none based on research)

4. **Update CSS files**

   **`src/styles/learnConfig.css`:**
   - `.learn-level-list` → `.learn-lesson-list`
   - `.learn-level-item` → `.learn-lesson-item`
   - `.learn-level-selected` → `.learn-lesson-selected`
   - `.learn-level-header` → `.learn-lesson-header`
   - `.learn-level-number` → `.learn-lesson-number`
   - `.learn-level-chars` → `.learn-lesson-chars`
   - `.learn-level-chars-total` → `.learn-lesson-chars-total`

   **`src/styles/sessionComplete.css`:**
   - Check for "level" in Learn Mode specific styles
   - Update any class names or comments

5. **Update utility functions in `functions/shared/koch.ts`**
   (Already covered in Phase 1, but verify user-facing strings)
   - `getLevelDescription` → `getLessonDescription`
   - `getNewCharactersDescription` → update text
   - Error messages: "level" → "lesson"

#### Acceptance Criteria
- [ ] All UI text uses "lesson" not "level"
- [ ] All CSS classes renamed
- [ ] All variables and functions renamed
- [ ] No visual regressions
- [ ] Mobile responsive still works

---

### Phase 6: Delete Unused Code and Clean Up

**Goal:** Remove code that's no longer needed after simplifications

#### Files to Delete

1. **`functions/shared/masteryCalculator.ts`**
   - Entire file (mastery analysis no longer used)
   - Delete corresponding test file: `functions/shared/__tests__/masteryCalculator.test.ts`

2. **`functions/shared/contentGenerator.ts`**
   - Entire file (replaced with simpler algorithm in backend)
   - Delete corresponding test file: `functions/shared/__tests__/contentGenerator.test.ts`

#### Code to Remove

3. **`src/features/statistics/api.ts`**
   - Remove method: `getCharacterMastery(chars: string[])`
   - Remove method: `getLearnModeProgress()` (no longer needed - stars in settings)

4. **`src/features/statistics/useStatsAPI.ts`**
   - Remove: `fetchCharacterMastery()` hook
   - Remove: `fetchLearnProgress()` hook

5. **Clean up imports**
   - Search for imports of deleted files
   - Remove unused imports throughout

#### Acceptance Criteria
- [ ] Deleted files listed above removed
- [ ] No broken imports
- [ ] TypeScript compiles
- [ ] All tests pass (excluding deleted test files)
- [ ] No dead code warnings

---

### Phase 7: Update Tests and Documentation

**Goal:** Ensure all tests pass with new implementation and update docs

#### Tasks

1. **Update unit tests**
   - `koch.test.ts`: Update for renamed functions (level → lesson)
   - Backend source tests: Verify new algorithm
   - Handler tests: Remove mastery references
   - Emission tests: Update terminology

2. **Update integration tests**
   - End-to-end Learn Mode flow
   - Anonymous user flow (stars saved locally)
   - Authenticated user flow (stars synced to backend)
   - Login migration (local stars → backend)

3. **Run quality checks**
   ```bash
   npm run check
   ```
   - TypeScript: 0 errors
   - ESLint: 0 errors
   - Tests: All passing

4. **Update documentation**

   **`docs/LEARN_MODE_PLAN.md`:**
   - Mark all phases complete
   - Add "Revision History" section documenting changes
   - Update implementation notes to reflect new architecture

   **`docs/LEARN_MODE_SPEC.md` (if it exists):**
   - Update to reflect lesson terminology
   - Update source generation algorithm description
   - Update progress tracking (settings vs stats)

   **`CLAUDE.md`:**
   - Update any Learn Mode references

   **`README.md`:**
   - Check for Learn Mode mentions, update if needed

#### Acceptance Criteria
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] `npm run check` passes (0 errors)
- [ ] Documentation updated
- [ ] No TODO comments left in code (or documented in plan)

---

### Phase 8: Manual Testing and Polish

**Goal:** Test complete user journeys and fix any UX issues

#### Test Scenarios

1. **Anonymous user - first time**
   - Navigate to Learn Mode
   - See all lessons with 0 stars
   - Complete Lesson 1 with 3 stars
   - See 3 stars saved locally
   - Refresh page → stars persist

2. **Anonymous user - progression**
   - Complete multiple lessons
   - Verify stars update correctly
   - Retry lesson with better score → stars increase
   - Retry lesson with worse score → stars stay same (max)

3. **Authenticated user**
   - Login
   - Complete lesson → stars save to settings
   - Check backend: settings include learnProgress
   - Logout and login → progress syncs back

4. **Migration flow**
   - Start as anonymous, earn stars
   - Login
   - Verify stars migrate to backend
   - Check on different device → stars sync

5. **Lesson content verification**
   - Lesson 1: Verify K and M appear at least 5 times each
   - Lesson 2: Verify new chars (R, S) appear at least 5 times each
   - Lesson 10: Verify content is appropriate
   - Check randomization (no obvious patterns)

6. **Adaptive reveal**
   - Lesson 1: First K → shows "K" (adaptive reveal)
   - Second K → shows "?" (quiz mode)
   - First M → shows "M" (adaptive reveal)
   - Verify only 2 new chars get adaptive reveal

7. **Session statistics**
   - Authenticated user completes lesson
   - Verify stats saved to backend with learnLesson and learnStars
   - Check stats API: session appears in history

#### Polish Items
- Visual consistency (all "lesson" text capitalized consistently)
- Loading states (settings loading before showing stars)
- Error states (settings sync failure)
- Accessibility (keyboard navigation still works)
- Mobile responsive (lesson selector scrollable)

#### Acceptance Criteria
- [ ] All test scenarios pass
- [ ] No console errors
- [ ] No visual regressions
- [ ] Performance acceptable (no lag)
- [ ] Works on mobile and desktop
- [ ] Accessible (keyboard nav, screen readers)

---

## Migration Considerations

### For Existing Users (if any data exists in production)

Since no backwards compatibility is needed (local development only), this is **NOT REQUIRED**. But documenting for reference:

**If there were existing users:**
1. Database migration script:
   - Rename `learnLevel` → `learnLesson` in SessionStatistics
   - Remove `learnUnmasteredChars` from SessionConfig
2. Settings migration:
   - Query all user sessions
   - Build `learnProgress` map from historical `learnStars`
   - Save to each user's settings

**For local development:**
- Clear localStorage and start fresh (no migration needed)

---

## Risk Assessment

### Low Risk
- ✅ Settings system already handles sync (well-tested)
- ✅ Renaming is straightforward (IDE refactoring)
- ✅ New algorithm is simpler (less complexity = fewer bugs)

### Medium Risk
- ⚠️ Source generation randomness (need to verify good distribution)
- ⚠️ Stars update logic (max comparison - verify edge cases)
- ⚠️ CSS class renames (potential for missed references)

### Mitigation
- Comprehensive tests for source generation
- Unit tests for stars update logic
- Search for all "level" strings before marking complete
- Manual testing of complete user journeys

---

## Implementation Order

Recommended sequence (dependencies):

1. **Phase 1** (Foundation) - Must go first (types, constants)
2. **Phase 2** (Backend) - Depends on Phase 1 types
3. **Phase 4** (Adaptive Reveal) - Can run parallel with Phase 3
4. **Phase 3** (Settings) - Can run parallel with Phase 4
5. **Phase 5** (UI Rename) - After Phase 3/4 complete
6. **Phase 6** (Cleanup) - After all features working
7. **Phase 7** (Tests/Docs) - After cleanup
8. **Phase 8** (Manual Testing) - Final validation

**Parallel opportunities:**
- Phases 3 & 4 can be done concurrently (different files)
- Phase 2 (backend) and Phase 4 (adaptive reveal) can overlap

---

## Success Criteria

### Functional
- [ ] Learn Mode works without authentication
- [ ] Progress (stars) saved to settings (local + backend)
- [ ] Source generation uses new deterministic algorithm
- [ ] Adaptive reveal based on new characters only
- [ ] All "level" → "lesson" renamed
- [ ] Unused code removed

### Technical
- [ ] 0 TypeScript errors
- [ ] 0 ESLint errors
- [ ] All tests passing
- [ ] No dead code
- [ ] No console errors/warnings

### UX
- [ ] Works for anonymous users
- [ ] Syncs when authenticated
- [ ] Consistent terminology (lesson everywhere)
- [ ] Smooth, no regressions
- [ ] Mobile responsive

---

## Files Summary (Complete Change List)

### Modified Files

| File | Changes |
|------|---------|
| `functions/shared/types.ts` | Rename learnLevel → learnLesson, remove learnUnmasteredChars, add learnProgress to UserSettings |
| `functions/shared/koch.ts` | Add constants, rename all level → lesson functions |
| `functions/api/sources/koch.ts` | Rewrite algorithm, remove mastery logic, rename level → lesson |
| `src/core/types/domain.ts` | Rename learnLevel → learnLesson, remove learnUnmasteredChars |
| `src/features/settings/store/settingsStore.ts` | Add learnProgress default |
| `src/pages/LearnConfigPage.tsx` | Use settings for stars, remove stats queries, rename level → lesson |
| `src/pages/SessionCompletePage.tsx` | Save stars to settings, rename level → lesson |
| `src/features/session/modes/learn/handler.ts` | Use new chars logic, remove mastery, rename level → lesson |
| `src/features/session/modes/learn/emission.ts` | Rename unmasteredChars → newChars |
| `src/features/session/modes/learn/ui.tsx` | Verify no level references |
| `src/styles/learnConfig.css` | Rename all .learn-level-* → .learn-lesson-* |
| `src/styles/sessionComplete.css` | Update Learn Mode specific classes if needed |
| `src/features/statistics/api.ts` | Remove getCharacterMastery and getLearnModeProgress |
| `src/features/statistics/useStatsAPI.ts` | Remove fetchCharacterMastery, fetchLearnProgress hooks |
| `docs/LEARN_MODE_PLAN.md` | Add revision history section |

### Deleted Files

| File | Reason |
|------|--------|
| `functions/shared/masteryCalculator.ts` | No longer needed (no mastery calculation) |
| `functions/shared/__tests__/masteryCalculator.test.ts` | Tests for deleted file |
| `functions/shared/contentGenerator.ts` | Replaced with simpler algorithm |
| `functions/shared/__tests__/contentGenerator.test.ts` | Tests for deleted file |

### Test Files to Update

| File | Updates |
|------|---------|
| `functions/api/sources/__tests__/koch.test.ts` | New algorithm tests, rename level → lesson |
| `src/features/session/modes/learn/__tests__/handler.test.ts` | Remove mastery tests, update terminology |
| `src/features/session/modes/learn/__tests__/emission.test.ts` | Rename unmasteredChars → newChars |
| `functions/shared/__tests__/koch.test.ts` | Rename level → lesson in all tests |

---

## Revision History

**2025-10-24:** Initial revision plan created
- Simplified source generation (removed mastery-based system)
- Renamed "level" to "lesson" throughout
- Moved progress tracking to settings system
- Simplified adaptive reveal to use new characters only
- Removed authentication requirement for basic Learn Mode usage
