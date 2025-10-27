# Learn Mode Specification

## Overview

Learn Mode is an onboarding experience for users learning Morse code from scratch using the Koch method. It provides a structured, progressive curriculum with warm-up phases for character familiarization and practice phases for skill building.

## Koch Method Implementation

### Character Sequence
Standard Koch sequence (40 characters total):
```
K M R S U A P T L O W I . N J E F 0 Y , V G 5 / Q 9 Z H 3 8 B ? 4 2 7 C 1 D 6 X
```

### Level Structure
- **2 characters introduced per level** = 20 levels total
  - Level 1: K M
  - Level 2: K M R S
  - Level 3: K M R S U A
  - Level 4: K M R S U A P T
  - ...and so on

- Each level includes **all characters from previous levels** plus the new additions

## Session Structure

### Practice Phase (30 Characters)
**Purpose**: Build fluency with all level characters using adaptive reveal for first encounters

**Character Selection**:
- All characters from current level
- **Weighted selection**:
  - Un-mastered characters (< 80% historical accuracy): weight = 2
  - Mastered characters (≥ 80% historical accuracy): weight = 1
- Otherwise random selection within those weights

**Adaptive Reveal Behavior**:
- **First encounter** with an un-mastered character → answer shown immediately (familiarization)
- **All other encounters** → quiz format with "?" (assessment)
- Mastered characters → always quiz format
- Tracks encountered characters within the session

**Interaction Flow - First Encounter (Un-mastered Character) - Correct Input**:
1. Audio plays → character "R" immediately appears in character display
2. User types R → character flashes green → clears → next character

**Interaction Flow - First Encounter (Un-mastered Character) - Wrong Input**:
1. Audio plays → character "R" immediately appears in character display
2. User types M (wrong) → character flashes red
3. Audio replays → "R" still displayed
4. User must type R → character flashes green → clears → next character

**Interaction Flow - Quiz Mode (Correct Answer)**:
1. Audio plays → "?" appears in character display
2. User types K → display changes to "K"
3. Character flashes green → clears → next character

**Interaction Flow - Quiz Mode (Incorrect Answer)**:
1. Audio plays → "?" appears in character display
2. User types M (wrong) → display changes to "M"
3. Character flashes red → clears
4. Correct answer "K" appears in character display → audio replays
5. User must type K → character flashes green → clears → next character

**Statistics Counting**:
- Each of the 30 characters counts once toward session statistics
- First encounter (answer shown) = logged as correct (even if user types wrong initially)
- Quiz mode incorrect first attempt = logged as incorrect
- Forced correct attempts (correction mode or first encounter replays) = do NOT count as separate characters (not logged)
- Only the initial quiz attempt affects statistics; first encounters always count as correct

**UI Elements**:
- Large character display (center screen) showing the character (first encounter) or "?" (quiz mode) or the typed character
- Progress counter: "X / 30" (e.g., "15 / 30")
- Exit button
- No character history display

**Behavior**:
- No timeout (unlimited time for beginners)
- Built-in replay behavior (not configurable)
- Forced correction on errors:
  - Quiz mode incorrect: must type correct answer after seeing it
  - First encounter wrong input: must type correct character (replays audio on wrong input)
  - Correction mode wrong input: replays audio until correct character typed
- Adaptive reveal: shows answer on first encounter with un-mastered characters
- Input handling: Keyboard input ignored during flash animations and audio replay to prevent confusion

**Session End**:
- Ends automatically after 30 characters complete

## Visual Interaction Examples

### First Encounter (Un-mastered Character) - Correct Input
```
[Character Display shows: blank]
Audio: "dah dit dah" (R)
[Character Display shows: R]
User presses: R
[Character Display: R flashes green]
[Character Display clears]
→ Next character
(Logged as correct in statistics)
```

### First Encounter (Un-mastered Character) - Wrong Input
```
[Character Display shows: blank]
Audio: "dah dit dah" (R)
[Character Display shows: R]
User presses: M (wrong)
[Character Display: R flashes red]
[R still displayed]
Audio: "dah dit dah" (R replays)
User presses: R
[Character Display: R flashes green]
[Character Display clears]
→ Next character
(Still logged as correct in statistics - first encounters always correct)
```

### Quiz Mode - Correct
```
[Character Display shows: ?]
Audio: "dah dit" (K)
User presses: K
[Character Display shows: K]
[Character Display: K flashes green]
[Character Display clears]
→ Next character
```

### Quiz Mode - Incorrect
```
[Character Display shows: ?]
Audio: "dah dit" (K)
User presses: M
[Character Display shows: M]
[Character Display: M flashes red]
[Character Display clears]
[Character Display shows: K]
Audio: "dah dit" (K replays)
User presses: K
[Character Display: K flashes green]
[Character Display clears]
→ Next character
(Only the incorrect "M" counts in statistics, not the forced "K")

Note: If user types wrong character during correction (e.g., types J instead of K),
the character flashes red and audio replays again until K is typed correctly.
```

## Scoring & Progression

### Star Rating
Based on mistakes across all **30 practice characters**:
- **3 stars**: 0 mistakes (100% accuracy)
- **2 stars**: 1 mistake (96.67% accuracy)
- **1 star**: 3 mistakes (90% accuracy)
- **0 stars**: 4+ mistakes (<90% accuracy)

Note: First encounters (where answer is shown) count as correct, which may slightly inflate accuracy for sessions with many un-mastered characters.

### Progression Rules
- **Gating**: At session end, "Next Level" button only enabled if earned ≥ 1 star
- **Re-attempt**: "Try Again" button always available to retry current level
- **Navigation**: Users can always navigate to any level from settings page (even "locked" ones)

## Configuration Page

### UI Layout

**Header Section**:
- Title: "Learn Mode"
- Description: "Learn Morse code from scratch using the Koch method. Progress through 20 levels, mastering 2 new characters at a time. The first time you hear an un-mastered character, it will be shown to you."

**Settings** (Minimal):
- **WPM Slider**: 15-25 WPM range (character speed)
  - Default: 20 WPM
  - No Farnsworth speed option
  - No timeout speed option (fixed to "slow")
  - No feedback option (fixed to "replay")

**Level Selector**:
- List of all 20 levels, always visible
- Each level shows:
  - Level number
  - Characters in that level (e.g., "Level 3: K M R S U A")
  - Or show introduced characters (e.g., "Level 3 (+U +A)")
  - Star indicator:
    - Gray/empty: Not yet attempted
    - 1-3 colored stars: Best achievement for this level
- Visual state:
  - Current level: Highlighted
  - Completed levels (≥ 1 star): Normal opacity
  - Future levels (0 stars): Greyed out but still clickable
- Clicking a level selects it for the session

**Start Button**:
- Large, prominent button at bottom
- Dynamic text: "Start Level 1", "Start Level 5", etc. based on next unfinished level
- If user manually selects a different level, updates to "Start Level X"

### Determining "Next Level"
- Next level = first level without any stars
- If all levels have stars, "next level" = Level 20 (or show completion state)

## Session Complete Page

### UI Layout

**Results Display**:
- Stars earned: Large visual display (0-3 stars)
- Overall accuracy percentage
- Total characters completed

**Per-Character Breakdown**:
- Show all characters from the level
- Highlight characters with < 80% accuracy (missed/struggling)
- Show individual accuracy for each character

**Action Buttons**:
- "Try Again" - Always enabled, restarts current level
- "Next Level" - Enabled only if earned ≥ 1 star, proceeds to next level
- "Back to Levels" - Return to level selector

## Statistics Integration

### Mastery Tracking
- **Definition**: A character is "mastered" if it has ≥ 80% accuracy across all historical sessions (all modes)
- **Scope**: Uses existing SessionStatistics system, queries across ALL saved sessions
- **Calculation**: Per-character accuracy aggregated from characterStats in all sessions

### Session Saving
- Learn Mode sessions saved to statistics like other modes
- SessionConfig includes:
  ```typescript
  {
    mode: 'learn',
    lengthMs: <actual duration>,
    wpm: <user selected>,
    farnsworthWpm: <same as wpm>,
    speedTier: 'slow',
    sourceId: 'koch-level-{N}',  // e.g., 'koch-level-5'
    sourceName: 'Koch Method - Level X',
    feedback: 'none',
    replay: true,
    effectiveAlphabet: [...level characters],
    extraWordSpacing: 0,
    listenTimingOffset: 1.0,
    characterSpeed: <wpm>,
    // Learn mode specific (input):
    learnLevel: <level number>  // 1-20
  }
  ```
- SessionStatistics includes Learn Mode specific fields (output):
  ```typescript
  {
    // ... all standard SessionStatistics fields ...

    // Learn mode specific (output):
    learnLevel: <level number>,  // 1-20, duplicated from config for easy querying
    learnStars: <0-3>            // calculated from overallAccuracy at session end
  }
  ```

### Historical Queries
- On session start, query all sessions to determine which characters are un-mastered (for adaptive reveal)
- On level selector page, query all sessions to show star ratings per level (from SessionStatistics.learnStars)

## Technical Implementation Notes

### Mode Definition
- Mode ID: `'learn'`
- Display Name: "Learn Mode"
- Emission granularity: 'character'
- Uses keyboard input: Yes
- **Does NOT use standard timeout/feedback abstractions** - has custom interaction model
- Uses stats: Yes

### Unique Characteristics
Learn Mode has its own interaction model rather than reusing existing mode abstractions:
- No timeout system (unlimited time)
- Built-in replay behavior (not configurable)
- Forced correction on errors (must type correct answer)
- Custom UI: prominent character display, no character history
- Custom keyboard handler: manages first encounter vs quiz mode display logic

### Text Generation
- **Practice characters**: Generated by backend source endpoint (`/api/sources/koch-level-{N}`)
  - Backend has access to user's historical statistics
  - Generates 30 weighted characters based on mastery (un-mastered weight=2, mastered weight=1)
  - Personalized to each user's current progress
  - Not cacheable (must be fresh for each session)
- **Adaptive reveal**: Frontend tracks encountered characters within session
  - First encounter with un-mastered character → show answer
  - All other encounters → quiz format
- No external text sources used

### State Management
- Track characters completed: count of 30
- Track which characters are un-mastered (from historical stats)
- Track encountered characters within session (Set<string>)
- Track whether user is in "correction mode" (after incorrect answer)
- Track current expected character (for validation)

### UI Components
- **Character display**: Large, prominent, center screen
  - First encounter (un-mastered): shows actual character immediately
  - Quiz mode: shows "?" initially, then user's typed character
  - Flashes green (correct) or red (incorrect)
  - Flash duration: ~300ms
  - **Input handling**: Keyboard input ignored during flash animations AND audio replay to prevent confusion
  - **Wrong input during first encounter/correction**: Red flash, audio replays, must type correct character
- **Progress counter**: "X / 30" (e.g., "15 / 30")
- **Exit button**: Always accessible
- **No character history**: Unlike other modes, no scrolling history of past characters

## Open Questions / Future Enhancements

1. Should we show the morse pattern (dit-dah notation) during first encounters?
2. Celebration animation when achieving 3 stars?
3. Overall progress dashboard (e.g., "12 / 20 levels completed")?
4. Option to review individual characters outside of level context?
5. Spaced repetition integration for long-term retention?
6. Certificate or achievement for completing all 20 levels?

## Session Flow Diagram

```
[Config Page: Select Level]
         ↓
[Load historical stats to determine un-mastered chars]
         ↓
[Backend generates 30 weighted characters]
         ↓
    [Start Session]
         ↓
  ┌──────────────────────────┐
  │ Practice Phase           │
  │ 30 characters            │
  │                          │
  │ For each character:      │
  │ - First encounter +      │
  │   un-mastered?           │
  │   → Show answer          │
  │ - Else → Quiz with "?"   │
  └──────────────────────────┘
         ↓
  [Calculate stars based on accuracy]
         ↓
  ┌──────────────────┐
  │Session Complete  │
  │ Stars: 0-3       │
  │ Show missed chars│
  │ Try Again / Next │
  └──────────────────┘
```

## Character Weighting Example

**Level 5 characters**: K M R S U A P T (Level 4 + P T)

**Historical accuracy**:
- K: 92% (mastered)
- M: 88% (mastered)
- R: 75% (un-mastered) → adaptive reveal on first encounter
- S: 91% (mastered)
- U: 82% (mastered)
- A: 65% (un-mastered) → adaptive reveal on first encounter
- P: 78% (un-mastered) → adaptive reveal on first encounter
- T: new character (un-mastered) → adaptive reveal on first encounter

**Backend Generation** (30 chars):
- Weight 2: R, A, P, T (un-mastered)
- Weight 1: K, M, S, U (mastered)
- Selection pool: [R, R, A, A, P, P, T, T, K, M, S, U] → random selection → 30 chars

**Example Sequence**: K, R, M, R, A, T, P, K, R, S, A, U, P, T, R, ... (30 total)

**Adaptive Reveal Behavior**:
1. K (mastered) → Quiz with "?"
2. R (un-mastered, **first encounter**) → **Show "R"** (logged as correct, even if user types wrong initially and must retry)
3. M (mastered) → Quiz with "?"
4. R (un-mastered, second encounter) → Quiz with "?" (may get wrong, logged accordingly)
5. A (un-mastered, **first encounter**) → **Show "A"** (logged as correct, even if user types wrong initially and must retry)
6. T (un-mastered, **first encounter**) → **Show "T"** (logged as correct, even if user types wrong initially and must retry)
7. P (un-mastered, **first encounter**) → **Show "P"** (logged as correct, even if user types wrong initially and must retry)
8. K (mastered, second encounter) → Quiz with "?"
9. R (un-mastered, third encounter) → Quiz with "?"
... continues for all 30 characters

**Total Session**: 30 characters
**Counted in Statistics**: All 30 characters (first encounters logged as correct, quiz responses logged as answered)
**Adaptive reveals**: 4 in this example (R, A, P, T on first encounter)
