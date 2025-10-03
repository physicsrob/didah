# Word Practice Mode Specification

## Overview

Word Practice mode is a recognition-based learning experience where users identify complete words from Morse code audio by selecting from multiple choice options. Unlike character-by-character Practice mode, this mode focuses on whole-word recognition, training users to process complete words without mentally breaking them down into individual characters.

**Key Learning Goals**:
- Develop whole-word recognition skills
- Reduce mental decoding overhead
- Build fluency with common words
- Practice under realistic transmission speeds using Farnsworth timing

## Configuration Options

### Required Configuration
- **Word Source**: Dropdown selection of available word lists
  - Top-100 Words (most common English words)
  - Top-1000 Words (expanded common word set)
- **Duration**: 1-5 minutes
- **Character Speed**: WPM for individual character timing
- **Effective Speed**: Farnsworth WPM for overall transmission rate
  - When Effective Speed < Character Speed, Farnsworth timing extends inter-character spacing
  - When speeds are equal, standard Morse timing is used

### Not Used
- Speed Tier (slow/medium/fast/lightning) - Not applicable for multiple choice
- Feedback settings (buzzer/flash) - Feedback is always visual (green/red flash)
- Replay setting - Always replays on incorrect answers
- Text sources - Word Practice uses dedicated word sources, not text sources

## User Flow

### 1. Word Transmission
- A single word is selected from the word source
- The word is played using Morse code audio at configured speeds
- **Nothing is displayed** on screen except the header (pause button, brand icon, source name, time remaining)
- No buttons or text are visible during audio playback

### 2. Answer Selection
- Immediately after audio completes, **3 buttons always appear** vertically
- Each button contains a word:
  - One correct word (the word that was played)
  - Two distractor words (see Distractor Algorithm below)
- Button order is randomized on each trial
- User clicks the button they believe is correct

### 3. Feedback - Correct Answer
- Button flashes **green**
- 500ms pause
- Next word begins (return to step 1)

### 4. Feedback - Incorrect Answer
- Button flashes **red**
- 500ms pause
- Word audio replays
- Buttons reappear immediately after audio (same 3 options, newly randomized order)
- User can attempt again (repeats until correct or session expires)

### 5. Statistics Tracking
- Each button click counts as one **attempt**
- Each correct answer (regardless of previous attempts on that word) counts as one **success**
- **Word Accuracy** = successes / attempts × 100%

**Example**: User hears "plant", clicks "plan" (wrong), clicks "plant" (correct)
- Attempts: 2
- Successes: 1
- Running accuracy updates accordingly

## Word Sources

### Source Types

#### Top-100 Words
- The 100 most common English words by frequency
- API endpoint: `/api/word-sources/top-100`
- Response format:
```json
{
  "id": "top-100",
  "words": ["the", "be", "to", "of", "and", ...]
}
```

#### Top-1000 Words
- The 1000 most common English words by frequency
- API endpoint: `/api/word-sources/top-1000`
- Response format:
```json
{
  "id": "top-1000",
  "words": ["the", "be", "to", ..., "thousand"]
}
```

### Word Selection
- Only words with valid distractors are used (see Distractor Algorithm)
- Valid words are selected randomly from the source during session
- Same word may appear multiple times in a session
- No intelligent spacing or repetition avoidance (keep simple)

## Distractor Algorithm

To generate realistic, confusable distractors, we use a **simplified word mapping** that groups words by their Morse code similarity patterns.

### Simplified Letter Mapping

Each letter maps to a simplified character based on Morse code confusion patterns:

| Group | Letters | Simplified |
|-------|---------|------------|
| Short sounds | i, s, h | i |
| Short with tail | n, d, b | n |
| Medium sounds | m, o, p, g, z | m |
| Hard sounds | c, k, x, q, y | c |
| Single dit | e | e |
| Single dah | t | t |
| Long sounds | a, w, j, r, l, f, u, v | a |

### Simplified Word Calculation

To find the simplified form of any word:
1. Convert word to lowercase
2. Apply letter mapping to each character
3. Concatenate result

**Examples**:
- "plant" → "maant" (p→m, l→a, a→a, n→n, t→t)
- "plan" → "maan" (p→m, l→a, a→a, n→n)
- "the" → "tie" (t→t, h→i, e→e)
- "that" → "tiat" (t→t, h→i, a→a, t→t)

### Grouping Words

Before the session:
1. Calculate simplified form for all words in the source
2. Group words by their simplified form
3. Index words by starting letter and length for fallback matching

**Example groups**:
- "tiat": ["that", "the", "this"] (3+ words)
- "maan": ["plan", "plant"] (2 words only)

### Distractor Selection

Word Practice always displays exactly **3 buttons**. Distractors are selected using a two-tier approach:

#### Primary: Simplified Group Matching
For each target word:
1. Look up the word's simplified group
2. If group has 3+ words (including target):
   - Randomly select 2 words from the group as distractors
   - Done ✓

#### Secondary: Same Start + Length Matching
3. If group has < 3 words:
   - Use all other words from simplified group (0 or 1 distractors)
   - Fill remaining distractor slots with random words from source that match:
     - **Same starting letter** as target word
     - **Same character length** as target word
   - Randomly select to fill (avoid duplicates)

#### Word Exclusion
4. If we cannot find 2 total distractors using both methods:
   - **Exclude this word** from the session entirely
   - It will never be presented to the user

**Examples**:

**Example 1: Sufficient simplified group**
- Target: "that" → simplified "tiat"
- Group: ["that", "the", "this", "to"] (4 words)
- Distractors: Randomly pick 2 from ["the", "this", "to"]
- Buttons: ["that", "the", "this"] (randomized order)

**Example 2: Small group, fallback needed**
- Target: "plant" (5 letters, starts with 'p') → simplified "maant"
- Group: ["plant", "plan"] (2 words only)
- Simplified distractors: ["plan"] (1 distractor)
- Fallback pool: Words starting with 'p' and 5 letters → ["place", "point", "power", "prove"]
- Final distractors: ["plan", "place"] (1 from group + 1 from fallback)
- Buttons: ["plant", "plan", "place"] (randomized order)

**Example 3: Word excluded**
- Target: "xylophone" (9 letters, starts with 'x')
- Group: ["xylophone"] (singleton)
- Fallback pool: No words starting with 'x' and 9 letters
- **Result**: Word excluded from session

## Statistics

### Metrics to Track
- **Word Accuracy**: (successes / attempts) × 100%
  - Success: User clicks correct button
  - Attempt: Any button click
  - Multi-attempt words count each click separately

### Future Extensions (not in initial implementation)
- Per-word accuracy (track which words are hardest)
- First-attempt accuracy (% correct on first try)
- Average attempts per word
- Confusion matrices (which words get confused)

## UI Layout

### During Word Playback
```
┌─────────────────────────────────────┐
│  [Pause] [Brand] Source  [Time]     │ ← Header
├─────────────────────────────────────┤
│                                     │
│                                     │
│          (blank area)               │
│                                     │
│                                     │
└─────────────────────────────────────┘
```

### After Playback (Always 3 Buttons)
```
┌─────────────────────────────────────┐
│  [Pause] [Brand] Source  [Time]     │
├─────────────────────────────────────┤
│                                     │
│      ┌───────────────────┐          │
│      │      plant        │          │
│      └───────────────────┘          │
│                                     │
│      ┌───────────────────┐          │
│      │       plan        │          │
│      └───────────────────┘          │
│                                     │
│      ┌───────────────────┐          │
│      │      place        │          │
│      └───────────────────┘          │
│                                     │
└─────────────────────────────────────┘
```
Note: Button order is randomized on each trial

### Button States
- **Normal**: Default button styling
- **Flash Green**: Correct answer clicked (500ms)
- **Flash Red**: Incorrect answer clicked (500ms)
- **Disabled**: All buttons disabled during flash and audio replay

### Header Components
- **Pause button**: Click to pause/resume session
- **Brand icon**: Morse Academy logo
- **Source name**: "Top-100 Words" or "Top-1000 Words"
- **Time remaining**: Countdown timer (MM:SS)

## Technical Implementation Notes

### Mode Architecture Alignment

Word Practice follows the standard mode architecture in `src/features/session/modes/`:

```
modes/
  wordPractice/
    emission.ts      # Word playback, button waiting, outcome handling
    handler.ts       # Session integration, stats, history
    ui.tsx          # Button display, click handling
    index.ts        # Mode definition
    __tests__/
```

### Mode Definition Flags
```typescript
usesSpeedTier: false   // Uses Farnsworth timing instead
usesFeedback: false    // Visual feedback only (green/red flash)
usesReplay: false      // Always replays (not configurable)
usesStats: true        // Tracks word accuracy
```

### Emission Function Signature
```typescript
async function runWordPracticeEmission(
  config: SessionConfig,
  word: string,
  distractors: string[],
  io: IO,
  input: InputBus,
  clock: Clock,
  signal: AbortSignal
): Promise<'correct' | 'incorrect'>
```

### Session Integration
- Word source selected during config (replaces text source)
- Words fetched from API at session start
- Simplified grouping calculated in backend (API returns pre-grouped words)
- Session runner calls handler for each word trial
- Handler manages retry logic (incorrect answers replay word)

### API Design

**List available word sources**:
```
GET /api/word-sources
Response: {
  "sources": [
    { "id": "top-100", "name": "Top-100 Words", "wordCount": 100 },
    { "id": "top-1000", "name": "Top-1000 Words", "wordCount": 1000 }
  ]
}
```

**Get words from source**:
```
GET /api/word-sources/top-100
Response: {
  "id": "top-100",
  "words": [
    {
      "word": "that",
      "distractors": ["the", "this"]
    },
    {
      "word": "plant",
      "distractors": ["plan", "place"]
    },
    {
      "word": "the",
      "distractors": ["that", "this"]
    }
  ]
}
```

**Note**:
- API pre-calculates all valid distractors for each word
- Only words with exactly 2 valid distractors are included
- Words without sufficient distractors are excluded
- Frontend receives ready-to-use word + distractor pairs

### Timing Details
- **Character speed**: Morse timing for individual dits/dahs within characters
- **Effective speed (Farnsworth)**: Extended spacing between characters to slow overall rate
- **Between-word pause**: 500ms (fixed, after correct or incorrect flash)
- **Flash duration**: 500ms (green or red)
- **Button enable**: Immediate after audio completes
- **Button disable**: During flash and audio replay

### Statistics Storage
- Store per-session word accuracy
- Use existing stats infrastructure (`SessionStats` type)
- Add new field: `wordAccuracy: { attempts: number, successes: number }`

## Open Questions / Future Enhancements

1. Should we track per-word confusion matrices?
2. Should we avoid repeating recently-seen words?
3. Should we add keyboard shortcuts (1/2/3 for button selection)?
4. Should we show running accuracy during the session?
5. Should we add difficulty progression (start with Top-100, unlock Top-1000)?
6. Should we add user-uploaded word lists?

## Success Criteria

The mode is successful when:
- Users can complete a full session with word recognition
- Distractors are confusable (not obviously different)
- Visual feedback is clear and immediate
- Statistics accurately reflect word-level accuracy
- Farnsworth timing provides appropriate challenge levels
