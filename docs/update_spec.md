# Learn Mode Page Redesign - Hero Card Spec (Revised)

## Problem
Current design feels like a lesson selector rather than a guided learning path. Users need clearer direction on what to practice next.

## Solution
Hero card showing recommended next lesson + browsable lesson list with inline action buttons.

---

## Layout

```
Character Speed: [========●====] 20 WPM

┌─────────────────────────────────────────┐
│  🎯 Next Lesson                         │
│                                         │
│  Lesson 5: L O                          │
│  2 new characters, 10 total             │
│                                         │
│  [     Start Lesson 5     ]            │
└─────────────────────────────────────────┘

All Lessons
┌─────────────────────────────────────────┐
│ Lesson 1: K M  ★★★                     │
│ Lesson 2: R S  ★★★                     │
│ Lesson 3: U A  ★★☆                     │
│ Lesson 4: P T  ★★★                     │
│┌────────────────────────────────────────┐│ ← Selected (expanded)
││ Lesson 5: L O  ☆☆☆                    ││
││ New: L O (2)                           ││
││ Previous: K M R S U A P T (8)          ││
││ [    Jump to Lesson 5    ]            ││
│└────────────────────────────────────────┘│
│ Lesson 6: W I  ☆☆☆                     │
│ ... (scrollable, max-height: 300px)     │
└─────────────────────────────────────────┘
```

---

## Behavior

### Character Speed Slider
- Position: Very top of page (above hero card)
- Same functionality as current implementation

### Hero Card - "Next Lesson" Recommendation

**Purpose:** Clear, prescriptive guidance on what to practice next

**Content:**
- Shows recommended next lesson (first lesson with 0 stars)
- Displays new characters prominently
- Shows character counts (new + total)
- Primary CTA button

**Logic:**
- Uses existing `nextLesson()` function from `LearnConfigPage.tsx`
- If any lessons have 0 stars → Show first lesson with 0 stars
- If all lessons have stars → Show congratulations (see edge case below)

**Visual Style:**
- Nearly identical to lesson list items
- Just positioned at top with minimal styling difference

**Interaction:**
- Hero card content is **fixed** - doesn't change based on list selection
- Button always starts the recommended lesson

---

### Lesson List - Browse & Select

**Purpose:** Allow users to review progress and optionally skip around

**Unselected State:**
- Minimal display: "Lesson 5: L O ★★☆"
- Star display: ★ (filled) for earned, ☆ (hollow) for unearned
- Scrollable list (max-height: 300px)
- No auto-scroll - always starts at top on page load
- Nothing selected by default

**Selection Behavior:**
- Click any lesson to select it
- Only one lesson can be selected at a time
- Previous selection clears when new lesson is clicked

**Selected State - Expanded View:**
- Shows all characters included:
  ```
  New: L O (2)
  Previous: K M R S U A P T (8)
  ```
- For Lesson 1 (no previous): Just show "New: K M (2)"
- Reveals action button:
  - "**Jump to Lesson X**" if lesson has 0 stars
  - "**Revisit Lesson X**" if lesson has any stars

---

## Edge Cases

### First-Time User (No Progress)
```
┌─────────────────────────────────────────┐
│  🎯 Start Your Journey                  │
│                                         │
│  Lesson 1: K M                          │
│  Learn your first 2 characters!         │
│                                         │
│  [     Start Lesson 1     ]            │
└─────────────────────────────────────────┘
```

### All Lessons Complete
```
┌─────────────────────────────────────────┐
│  🎉 Congratulations!                    │
│                                         │
│  You've completed all 20 lessons!       │
│                                         │
│  (no button)                            │
└─────────────────────────────────────────┘
```
- Hero card shows congratulations message only
- No button in hero card
- User must select from lesson list to revisit

---

## Implementation Notes

### Components to Modify
- `src/pages/LearnConfigPage.tsx`
- `src/styles/learnConfig.css`

### Key Logic (Already Exists)
- `nextLesson()` - Determines recommended lesson
- `learnProgress` - Settings-based star tracking
- `selectedLesson` state - Used for list selection/expansion

### New Elements Needed
- Hero card component/section with conditional content:
  - First-time: "Start Your Journey"
  - In progress: "Next Lesson"
  - Complete: "Congratulations!"
- Lesson list item expansion logic
- Character breakdown display (New/Previous)
- Conditional button text ("Jump to" vs "Revisit")

### No Longer Needed from Original Spec
- ✓ checkmarks for completed lessons
- Progress summary ("X/20 complete")
- "X new, Y total" in collapsed lesson items

---

## Success Criteria

✅ New users immediately see "Start Lesson 1" without scrolling
✅ Returning users see clear next step in hero card
✅ Users can browse and select any lesson to see details
✅ Selected lesson clearly shows what's new vs. review
✅ No confusion about which lesson will start (one button per action)
✅ Clean, minimal UI - not overwhelming
