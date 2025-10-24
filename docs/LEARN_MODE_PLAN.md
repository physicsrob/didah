# Learn Mode Implementation Plan

## Overview

This document outlines the implementation plan for Learn Mode, a Koch method-based onboarding experience for users learning Morse code from scratch. The implementation is broken down into phases that build progressively, with each phase being independently testable.

**Authentication Required**: Learn Mode requires user authentication throughout. It is a progression system that tracks mastery over time, saves stars per level, and personalizes practice content based on historical performance. Anonymous users will be prompted to sign up/login when attempting to access Learn Mode.

**Reference**: See `LEARN_MODE_SPEC.md` for complete specification details.

---

## Phase 0: Type System & Domain Model

### Goal
Establish the foundational type system and domain model to support Learn Mode throughout the codebase.

### Relevant Spec Details
- Mode ID: `'learn'`
- 20 levels total (2 characters per level)
- Koch sequence: `K M R S U A P T L O W I . N J E F 0 Y , V G 5 / Q 9 Z H 3 8 B ? 4 2 7 C 1 D 6 X`
- Star ratings: 0-3 stars based on accuracy (stored in session statistics)
- Session config must include `learnLevel`

### High-Level Plan
1. Add `'learn'` to the `SessionMode` type in `functions/shared/types.ts`
2. Extend `SessionConfig` type to include optional Learn Mode field:
   - `learnLevel?: number` (1-20)
3. Extend `SessionStatistics` type to include optional Learn Mode fields:
   - `learnLevel?: number` (1-20) - duplicated from config for easy querying
   - `learnStars?: number` (0-3) - calculated from session accuracy
4. Create Koch sequence constant in shared code: `functions/shared/koch.ts`
   - Export Koch sequence constant
   - Export utility functions for both client and server use
5. Create utility functions to:
   - Get characters for a given level (cumulative)
   - Get newly introduced characters for a level
   - Validate level numbers (1-20)
6. Add skeleton mode definition to registry (stub implementations)

### Implementation Notes
- The Koch sequence should be defined as a constant array of characters in `functions/shared/koch.ts`
- Level numbering is 1-based (Level 1 = first 2 chars, Level 2 = first 4 chars, etc.)
- Characters accumulate across levels (Level 3 includes all chars from Levels 1-2 plus new ones)
- Both frontend and backend need access to Koch utilities (shared code in `functions/shared/`)
- Star ratings: Stored in `SessionStatistics.learnStars` (0-3), calculated from overall accuracy at session end
- Level tracking: `learnLevel` stored in both config (for session setup) and statistics (for easy querying)
- Koch sequence: Fixed to standard Koch sequence (not configurable)
- Level navigation: Users can navigate to any level from settings (per spec), but "Next Level" button is gated by star requirements

### Acceptance Criteria
- [ ] TypeScript compiles without errors
- [ ] `'learn'` added to SessionMode union type
- [ ] `learnLevel` added to SessionConfig type (optional)
- [ ] `learnLevel` and `learnStars` added to SessionStatistics type (optional)
- [ ] Koch sequence constant defined in `functions/shared/koch.ts` and exported
- [ ] Utility functions have unit tests
- [ ] Can retrieve correct character sets for each level (spot check Levels 1, 10, 20)
- [ ] Mode registry includes `'learn'` entry (even if stubbed)

---

## Phase 1: Shared Mastery & Generation Logic

### Goal
Build shared code (used by both frontend and backend) for mastery calculation and character generation/weighting.

### Relevant Spec Details
- **Mastery threshold**: 80% accuracy across all historical sessions (all modes)
- **Practice character selection**: Characters weighted by mastery (un-mastered weight=2, mastered weight=1)
- **Adaptive reveal**: First encounter with un-mastered character shows answer
- Statistics scope: Query across ALL saved sessions, not just Learn Mode

### High-Level Plan
1. Create shared module: `functions/shared/masteryCalculator.ts`
   - Calculate per-character accuracy from array of `SessionStatistics`
   - Determine mastered vs un-mastered characters for a given set
   - Handle edge cases (no history, never seen before)
2. Create shared module: `functions/shared/contentGenerator.ts`
   - Generate weighted character pool (un-mastered weight=2, mastered weight=1)
   - Generate random character sequence from weighted pool
3. Both modules must work in browser and Cloudflare Workers environment

### Implementation Notes
- Shared code lives in `functions/shared/` (accessible to both frontend and backend)
- Accuracy calculation: `(correct / (correct + incorrect)) * 100` (excludes timeouts per convention)
- Character never seen before = treat as un-mastered (0% accuracy)
- Practice sequence should be random (but reproducible for testing with optional seed)
- Consecutive duplicates: Allow them - use pure random selection from weighted pool

### Acceptance Criteria
- [ ] Can calculate per-character accuracy from mock session data
- [ ] Correctly identifies mastered (≥80%) vs un-mastered (<80%) characters
- [ ] Generates correct weighted pool (un-mastered chars appear twice, mastered once)
- [ ] Generates 50 random characters from weighted pool
- [ ] Handles edge cases: no history, all mastered, all un-mastered
- [ ] Unit tests cover all functions with various scenarios
- [ ] Code works in both browser and Workers environments

---

## Phase 2: Backend Koch Source

### Goal
Create backend source endpoint that generates weighted practice sequences based on user's mastery data.

### Relevant Spec Details
- **Practice phase**: Exactly 50 characters, randomly selected from weighted pool
- **Practice weighting**: Un-mastered (weight=2), Mastered (weight=1)
- Backend has access to user's session statistics for mastery calculation

### High-Level Plan
1. Create backend source: `functions/api/sources/koch.ts`
2. Implement source endpoint that:
   - Accepts level parameter (1-20)
   - Requires userId (from auth context) - **Learn Mode requires authentication**
   - Queries user's historical session statistics
   - Uses shared mastery calculator to determine un-mastered chars
   - Uses shared content generator to create 50 weighted practice characters
   - Returns as `SourceContent` with appropriate metadata
3. Register source in backend source registry
4. Handle edge cases:
   - No session history (all chars un-mastered)
   - All chars mastered (all weight=1)

### Implementation Notes
- Source ID format: `koch-level-{N}` (e.g., `koch-level-5`)
- Backend has direct access to statistics database
- Uses shared code from Phase 1 for mastery/generation logic
- Returns standard `SourceContent` type (just text, no special metadata needed)
- Source caching: Backend source must NOT be cached (or very short TTL) since it's personalized to user's current mastery, which changes after each session
- Stats query failure: Fallback to equal weighting (all characters from level get weight=1) - safe default for beginners
- Reproducibility: No seed parameter needed; random selection is acceptable
- Error handling: Invalid level (< 1 or > 20) should return 400 Bad Request; unauthenticated user should return 401 Unauthorized

### Acceptance Criteria
- [ ] Endpoint responds to `/api/sources/koch-level-{N}`
- [ ] Requires authenticated user (returns 401 if not authenticated)
- [ ] Returns 400 for invalid level numbers (< 1 or > 20)
- [ ] Correctly queries user's session statistics
- [ ] Returns exactly 50 characters
- [ ] Weighting is correct (verify with user who has known mastery data)
- [ ] Handles users with no history (fallback to equal weighting)
- [ ] Handles stats query failure gracefully (fallback to equal weighting)
- [ ] Unit tests for backend source logic
- [ ] Integration test with real database (test environment)

---

## Phase 3: Core Mode Handler - Practice Phase with Adaptive Reveal

### Goal
Implement the practice phase interaction model with adaptive reveal (show answer on first encounter with un-mastered characters), quiz format, error correction, and forced replay.

### Relevant Spec Details
- **Adaptive reveal**: First encounter with un-mastered character → show answer immediately
- **First encounter flow**:
  1. Audio plays → character "R" appears
  2. User types R → green flash → clear → next character

- **Quiz mode - correct flow**:
  1. Audio plays → "?" appears
  2. User types K → display changes to "K"
  3. Green flash → clear → next character

- **Quiz mode - incorrect flow**:
  1. Audio plays → "?" appears
  2. User types M (wrong) → display changes to "M"
  3. Red flash → clear
  4. Correct answer "K" appears → audio replays
  5. User must type K → green flash → clear → next

- **Statistics**:
  - First encounters (answer shown) = logged as correct
  - Quiz mode: Only first attempt counts (forced correction is not logged)
- **No timeout**: Unlimited time to answer

### High-Level Plan
1. Query user's historical statistics to determine un-mastered characters for the level
2. Create handler module: `src/features/session/modes/learn/practiceHandler.ts`
3. Implement adaptive character handler with state machine:
   - **FIRST_ENCOUNTER** (un-mastered only): Show character, wait for input
   - **AWAITING_ANSWER** (quiz mode): Show "?", wait for input
   - **SHOWING_FEEDBACK**: Show typed character with flash (green/red)
   - **CORRECTION_MODE**: Show correct answer, replay audio, wait for correct input
   - **ADVANCING**: Clear display, move to next
4. Track practice state:
   - Set of encountered characters within session (Set<string>)
   - Set of un-mastered characters (from historical stats)
   - Current character in sequence
   - Expected character
   - User's first attempt (for statistics)
   - Whether in correction mode
5. Integrate with audio system to replay on errors
6. Update statistics based on first attempt (first encounters = correct, quiz = as answered)

### Implementation Notes
- Adaptive reveal logic: Check if (char not in encounteredSet) AND (char in unMasteredSet) → show answer
- State machine ensures clear transitions between phases
- Audio replay must wait for red flash to complete
- Correction mode accepts ONLY the correct character (ignore other input)
- Statistics tracking:
  - First encounters (answer shown) = logged as correct
  - Quiz mode: first attempt determines outcome (correct/incorrect)
- The forced correction ensures users see and type the correct answer before moving on
- Un-mastered character determination happens once at session start (query historical stats)

### Implementation Notes (continued)
- Flash duration: 300ms (consistent with other modes)
- Input during flash: Ignore keyboard input during flash animation to prevent confusion from queued inputs
- Correction mode visual cue: The displayed correct answer is sufficient; no additional UI needed
- Audio replay: Automatic (plays immediately after red flash clears)

### Acceptance Criteria
- [ ] Queries historical stats to determine un-mastered characters
- [ ] First encounter with un-mastered char: shows character immediately
- [ ] First encounter: green flash, logged as correct, advances
- [ ] Quiz mode: "?" displays when audio starts
- [ ] Quiz correct answer: shows character, green flash, advances
- [ ] Quiz incorrect answer: shows wrong character, red flash, clears
- [ ] After incorrect: shows correct answer, replays audio automatically
- [ ] Correction mode only accepts correct character
- [ ] Statistics: first encounters = correct, quiz = first attempt only (not correction)
- [ ] Tracks encountered characters correctly (Set updates)
- [ ] Unit tests for first encounter, correct, and incorrect paths
- [ ] State machine transitions are deterministic and tested

---

## Phase 4: Mode Handler Integration

### Goal
Integrate the practice handler with adaptive reveal into a unified mode handler that works with the session runtime system.

### Relevant Spec Details
- **Session flow**: 50 character practice session with adaptive reveal
- **Emission granularity**: 'character'
- **Total duration**: Variable (based on user speed, no timeout)
- **End condition**: After 50 characters complete

### High-Level Plan
1. Create main handler: `src/features/session/modes/learn/handler.ts`
2. Implement session initialization:
   - Query user's historical stats to determine un-mastered characters
   - Fetch practice source from backend (50 weighted characters)
   - Store un-mastered character set for adaptive reveal logic
3. Implement `handleCharacter` function that:
   - Delegates to practice handler (with adaptive reveal)
   - Tracks session progress
   - Triggers session end after 50th character
4. Create mode state management:
   - Track total characters (50)
   - Track current index
   - Track encountered characters (Set)
   - Track un-mastered characters (Set)
5. Integrate with session runtime's `HandlerContext`

### Implementation Notes
- The `handleCharacter` function is called by `sessionProgram.ts` for each character
- Mode state should be stored in `SessionSnapshot.modeState`
- Session end is triggered by calling `ctx.requestQuit()` after 50th character
- Practice source comes from backend (fetched once at session start)
- Un-mastered character set determined once at session start
- Encountered character set updated throughout session
- Statistics tracking: All 50 characters count (first encounters = correct, quiz = as answered)
- Mode state initialization: Initialize in separate setup function with un-mastered chars from stats query
- Emission logic: Use standard character emission (no custom logic needed)

### Acceptance Criteria
- [ ] Session initialization queries stats for un-mastered characters
- [ ] Session initialization fetches practice source (50 characters)
- [ ] Un-mastered and encountered character sets properly maintained
- [ ] Session ends after exactly 50 characters
- [ ] Statistics correctly track all 50 characters (first encounters = correct)
- [ ] Mode state is properly maintained throughout session
- [ ] Integration test with full session flow (mock audio/input)
- [ ] Works with existing session runtime without modifications

---

## Phase 5: UI Components - Character Display

### Goal
Build the custom UI components for Learn Mode's character display, progress counter, and visual feedback.

### Relevant Spec Details
- **Character display**: Large, prominent, center screen
  - First encounter (un-mastered): shows actual character
  - Quiz mode: shows "?" initially, then user's typed character
  - Flashes green (correct) or red (incorrect)
- **Progress counter**: Shows current position (e.g., "15 / 50")
- **Exit button**: Always accessible
- **No character history**: Unlike other modes, no scrolling list

### High-Level Plan
1. Create UI module: `src/features/session/modes/learn/ui.tsx`
2. Build components:
   - `LearnDisplay`: Main display component
   - `CharacterDisplay`: Large character with flash animations
   - `ProgressCounter`: Shows X / Total
3. Implement flash animations:
   - Green flash: briefly highlight in green
   - Red flash: briefly highlight in red
   - CSS transitions for smooth effect
4. Create keyboard input hook: `useLearnInput`
   - Captures keyboard input
   - Publishes to input bus
   - Handles input during first encounter vs quiz mode
5. Integrate with mode state from SessionSnapshot

### Implementation Notes
- Character display should be LARGE (consider 4-6rem font size)
- Flash animation should be brief but noticeable (~300ms)
- Input handling: Ignore keyboard input during flash animations (prevents confusion from rapid key presses)
- Progress counter format: "X / 50" (e.g., "15 / 50")
- Use CSS animations for flash effect (more performant than JS animation)
- Morse pattern display: Not included in initial implementation (can add later if requested)
- Font: Monospace, bold, high contrast for character display

### Acceptance Criteria
- [ ] Character displays prominently in center of screen
- [ ] First encounter: shows character immediately
- [ ] Quiz mode: shows "?" initially
- [ ] Green flash animation works and is noticeable
- [ ] Red flash animation works and is noticeable
- [ ] Progress counter updates correctly (X / 50 format)
- [ ] No character history display (verified by visual inspection)
- [ ] Keyboard input correctly captured and published
- [ ] Input ignored during flash animations
- [ ] UI is responsive and works on mobile
- [ ] Visual testing confirms good UX

---

## Phase 6: Configuration Page

### Goal
Build the Learn Mode configuration page with level selector, WPM controls, and star display.

### Relevant Spec Details
- **Header**: "Learn Mode" + description
- **WPM slider**: 15-25 WPM range (character speed, default 20)
  - No Farnsworth option (same as character speed)
  - No speed tier option (fixed to 'slow')
  - No feedback option (fixed to replay behavior)
- **Level selector**:
  - List all 20 levels
  - Show level number + characters (e.g., "Level 3: K M R S U A" or "Level 3 (+U +A)")
  - Star indicators: gray/empty (not attempted), 1-3 colored stars (best achievement)
  - Visual states: current (highlighted), completed (normal), future (greyed)
  - All levels are clickable (even "locked" ones)
- **Start button**: "Start Level X" (dynamic based on selection)

### High-Level Plan
1. Add Learn Mode case to `SessionConfigPage.tsx` or create dedicated `LearnConfigPage.tsx`
2. Implement level selector:
   - Render list of 20 levels
   - Fetch historical stats to determine stars per level
   - Determine "next level" (first with 0 stars)
   - Handle level selection
   - Visual styling for different states
3. Implement WPM slider (15-25 range)
4. Build session config object with Learn Mode specific fields:
   - `mode: 'learn'`
   - `learnLevel: <selected>`
   - Fixed values: `speedTier: 'slow'`, `feedback: 'none'`, `replay: true`
   - `effectiveAlphabet`: characters for selected level
   - `sourceId: 'koch-level-{N}'` (backend source)
   - `sourceName: 'Koch Method - Level X'`
5. Handle "Start" button click → begin session (practice fetch happens in mode handler)

### Implementation Notes
- Star ratings are calculated from historical sessions (query all sessions, filter by learnLevel)
- Best star rating for each level is the maximum `learnStars` value across all sessions
- The level selector should be scrollable (20 levels may not fit on screen)
- Character list for each level can be derived from Koch sequence utility (Phase 0)
- Level display format: Show all characters for clarity (e.g., "Level 3: K M R S U A")
- Locked level interaction: Allow clicking any level (per spec); gating is only on "Next Level" button
- Authentication requirement: Learn Mode requires authenticated user (prompt to sign up/login if anonymous)

### Acceptance Criteria
- [ ] Learn Mode requires authentication (redirects to login if not authenticated)
- [ ] All 20 levels displayed in selector
- [ ] Star ratings loaded from historical sessions
- [ ] Correct "next level" determined (first with 0 stars)
- [ ] WPM slider works (15-25 range)
- [ ] Start button text updates based on selected level
- [ ] Can select any level (even future ones)
- [ ] Session config correctly populated with Learn Mode fields
- [ ] Visual styling matches Learn Mode design
- [ ] Unit tests for level selection logic
- [ ] Integration test for config page rendering

---

## Phase 7: Session Complete Page

### Goal
Build the session completion page with star rating display, per-character breakdown, and navigation buttons.

### Relevant Spec Details
- **Star calculation**:
  - 3 stars: ≥95% accuracy
  - 2 stars: ≥90% accuracy
  - 1 star: ≥85% accuracy
  - 0 stars: <85% accuracy
  - Based on overall session accuracy (50 practice characters)
- **Results display**:
  - Large star visual (0-3 stars)
  - Overall accuracy percentage
  - Total characters completed
- **Per-character breakdown**:
  - Show all characters from level
  - Highlight characters with <80% accuracy (struggling)
  - Show individual accuracy for each character
- **Action buttons**:
  - "Try Again" - always enabled, restarts current level
  - "Next Level" - enabled only if ≥1 star, proceeds to next level
  - "Back to Levels" - return to level selector

### High-Level Plan
1. Extend `SessionCompletePage.tsx` or create Learn Mode specific completion page
2. Implement star rating calculation:
   - Calculate from final session statistics
   - Use overall accuracy (50 practice characters)
   - Map to 0-3 stars based on thresholds
3. Build results display:
   - Visual star component (0-3 filled stars)
   - Accuracy percentage (large, prominent)
   - Total characters completed (50)
4. Implement per-character breakdown:
   - Extract character stats from session statistics
   - Calculate per-character accuracy
   - Highlight struggling chars (<80%)
   - Display in list or grid
5. Implement action buttons:
   - "Try Again": restart with same level config
   - "Next Level": enabled if stars ≥1, navigate to next level config
   - "Back to Levels": navigate to Learn Mode config page
6. Save session statistics with star rating

### Implementation Notes
- Star calculation happens client-side before saving statistics
- Star calculation based on session accuracy (50 practice characters)
- The `learnStars` field must be added to session config before saving
- Per-character accuracy comes from `characterStats` map in session statistics
- Struggling characters are those with <80% accuracy IN THIS SESSION (different from mastery threshold which is historical)
- "Next Level" should loop to Level 20 if already on final level
- "Try Again" behavior: Return to config page (per spec line 209: "restarts current level" means going through config)
- Celebration animations: Not included in initial implementation (listed in spec as future enhancement)
- Overall progress display: Not included in initial implementation (listed in spec as future enhancement)
- Star storage: Stars calculated from `overallAccuracy` and saved to `SessionStatistics.learnStars` (not in config)

### Acceptance Criteria
- [ ] Star rating calculated correctly (unit test all thresholds)
- [ ] Stars displayed visually (0-3 filled stars)
- [ ] Overall accuracy and character count shown (50 characters)
- [ ] Per-character breakdown displays all level characters
- [ ] Struggling characters highlighted (<80% in session)
- [ ] "Try Again" button works (returns to config)
- [ ] "Next Level" button enabled only if stars ≥1
- [ ] "Next Level" navigates to next level (or stays at 20)
- [ ] "Back to Levels" returns to config page
- [ ] Session saved with `learnStars` in SessionStatistics (not config)
- [ ] Session saved with `learnLevel` in SessionStatistics (duplicated from config)
- [ ] Visual testing confirms good UX

---

## Phase 8: Learn Mode Statistics Extensions

### Goal
Extend the existing statistics system to support Learn Mode specific fields and add querying helpers for Learn Mode features.

**Note**: The core statistics system already exists and is used by earlier phases. This phase adds Learn Mode specific extensions only.

### Relevant Spec Details
- Sessions saved to statistics like other modes
- Learn Mode specific fields:
  - Config: `learnLevel: <level number>` (1-20)
  - Statistics: `learnLevel: <level number>` (duplicated from config for querying)
  - Statistics: `learnStars: <0-3>` (calculated from accuracy at session end)
- Historical queries:
  - On session start: query all sessions for mastery calculation
  - On config page: query all sessions for star ratings per level
  - Scope: ALL sessions (not just Learn Mode)

### High-Level Plan
1. Verify type extensions from Phase 0 are in place:
   - SessionConfig: `learnLevel?: number` (1-20)
   - SessionStatistics: `learnLevel?: number` (1-20)
   - SessionStatistics: `learnStars?: number` (0-3)
2. Implement Learn Mode specific querying functions:
   - `getLearnModeProgress()`: Returns best stars for each level (queries `SessionStatistics.learnStars`)
   - `getCharacterMastery(chars: string[])`: Returns mastery status for given characters
   - These use existing statistics API but add Learn Mode specific logic
3. Ensure Learn Mode statistics are properly serialized/deserialized
4. Update backend validation to accept new SessionStatistics fields
5. Test statistics persistence with Learn Mode sessions

### Implementation Notes
- Existing system: Phases 1-3 already use the statistics system for mastery queries; this phase just adds new fields
- Field locations:
  - `learnLevel` in SessionConfig: Used during session setup
  - `learnLevel` in SessionStatistics: Duplicated from config for efficient querying
  - `learnStars` in SessionStatistics: Calculated from `overallAccuracy` at session end
- Backend validation function needs updates to accept optional `learnLevel` and `learnStars` in SessionStatistics
- Mastery calculation should query across ALL modes (per spec)
- Star ratings should be cached on config page to avoid repeated queries
- Consider performance: querying all sessions could be slow for users with many sessions
- Query optimization: Measure performance first, add indices if needed for users with many sessions
- Mastery recency: No - simple accuracy across all historical sessions (per spec)
- Backend unavailability: Graceful degradation - treat all chars as un-mastered, allow session to proceed

### Acceptance Criteria
- [ ] SessionStatistics type includes `learnLevel?: number` and `learnStars?: number`
- [ ] Learn Mode sessions saved with `learnLevel` in both config and statistics
- [ ] Learn Mode sessions saved with `learnStars` in statistics only (calculated from accuracy)
- [ ] Can query best stars for each level (queries SessionStatistics.learnStars)
- [ ] Can query character mastery across all historical sessions
- [ ] Backend validation accepts optional `learnLevel` and `learnStars` in statistics
- [ ] Frontend correctly deserializes saved Learn Mode sessions
- [ ] Integration test: save session → query → verify results
- [ ] Performance is acceptable for users with 100+ sessions

---

## Phase 9: End-to-End Integration & Testing

### Goal
Integrate all phases, test the complete user journey, and fix any integration issues.

### Complete User Flow
1. User navigates to Learn Mode from main menu
2. Config page loads, showing 20 levels with star ratings
3. User selects a level (or defaults to next unfinished)
4. User adjusts WPM (15-25)
5. User clicks "Start Level X"
6. Session initialization:
   - Frontend queries historical stats to determine un-mastered characters
   - Frontend fetches practice source from backend (50 weighted characters)
7. Session begins (50 characters with adaptive reveal):
   - First encounter with un-mastered char → character shown immediately
   - User types character → green flash → next (logged as correct)
   - All other encounters → "?" appears with audio (quiz mode)
   - User types answer → feedback (green/red)
   - If incorrect: correction mode with replay
8. After 50 characters, session ends
9. Completion page shows stars (based on all 50 characters), accuracy, struggling characters
10. User clicks "Next Level" or "Try Again"
11. Session statistics saved to backend (all 50 characters counted)

### High-Level Plan
1. Verify all phases work together without errors
2. Test complete user journey multiple times:
   - First time user (no history) - many adaptive reveals
   - Returning user (some history) - mix of reveals and quizzes
   - Advanced user (high mastery) - mostly quiz mode
3. Test edge cases:
   - All characters mastered (all quiz mode, no reveals)
   - All characters un-mastered (many reveals on first encounters)
   - Switching between levels
   - Restarting after failure (<1 star)
4. Performance testing:
   - Statistics query performance
   - UI responsiveness during session
   - Audio playback smoothness
5. Bug fixing and polish:
   - Fix any integration issues
   - Smooth out UX rough edges
   - Ensure consistent styling
   - Verify accessibility (keyboard navigation)
6. Final testing on multiple devices/browsers

### Implementation Notes
- Use automated end-to-end tests where possible (Playwright/Cypress)
- Manual testing critical for UX evaluation
- Test with real audio playback (not mocked)
- Verify statistics are correctly saved and retrieved
- Authentication: Learn Mode requires authenticated user throughout entire flow

### Acceptance Criteria
- [ ] Complete user journey works without errors
- [ ] All edge cases handled gracefully
- [ ] Statistics correctly saved and retrieved
- [ ] Performance is acceptable (no lag/stuttering)
- [ ] UI is responsive and works on mobile
- [ ] Keyboard navigation works throughout
- [ ] Visual styling is consistent with app design
- [ ] No console errors or warnings
- [ ] End-to-end tests pass
- [ ] Manual testing sign-off from stakeholders

