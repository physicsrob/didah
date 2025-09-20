# Technical Debt Analysis

This document catalogs the technical debt in the current codebase. These are areas where shortcuts were taken, patterns weren't followed consistently, or code quality could be improved. This is NOT about missing features or incomplete functionality.

## Priority: Critical Issues (Impacts Functionality)

### WPM Configuration Duplication
**Severity:** High
**Location:** Multiple files
**Description:** WPM configuration is hardcoded in multiple places with inconsistent values:
- `StudyPage.tsx`: wpm: 5 (line 27)
- `audioEngine.ts`: wpm: 5 (line 229)
- `cli/args.ts`: wpm: 20 (line 18)
- Tests: Various hardcoded values (20, 15, 25, etc.)

**Impact:** Confusing user experience; changes to WPM setting may not propagate correctly
**Solution:** Create a single source of truth for default configuration values

### Timing Bug in Active Mode
**Severity:** High
**Location:** `src/features/session/runtime/__tests__/charPrograms.test.ts`
**Description:** Test comments indicate a timing bug where timeout happens during audio playback rather than after audio completion plus window duration (lines 233-307). The test explicitly mentions "BUG DETECTED" scenarios.

**Impact:** Incorrect timing windows for user input in active mode
**Solution:** Fix the timeout calculation in charPrograms.ts to properly account for audio duration

## Priority : Configuration & Constants

### Magic Numbers Throughout
**Severity:** Low
**Location:** Multiple files
**Description:** Magic numbers without named constants:
- 1200 (WPM formula constant) appears directly in calculations
- 600, 800 Hz frequency values in tests
- 3000, 5000 timeout values
- Envelope timing values (0.01, 0.02, etc.)

**Impact:** Unclear intent, harder to maintain
**Solution:** Define named constants with explanatory comments

## Priority: Inconsistent Patterns

### Error Handling Inconsistency
**Severity:** Low
**Location:** Throughout codebase
**Description:** Error handling approaches vary:
- Some functions throw errors (timing.ts)
- Some use try/catch with console.error
- Some silently fail
- No consistent error boundary strategy

**Impact:** Unpredictable error behavior, difficult debugging
**Solution:** Establish and document consistent error handling patterns

### Passive Mode Lightning Speed Issue
**Severity:** Low
**Location:** `src/core/morse/timing.ts`
**Description:** Lightning and Fast speeds have identical timing in passive mode (both use 2 dit pre-reveal, 1 dit post-reveal). This contradicts the spec's intention of having distinct speed tiers.

**Impact:** Lightning speed doesn't provide additional challenge in passive mode
**Solution:** Differentiate lightning timing or document why they're the same

## Priority: Testing & Documentation

### Test Organization Inconsistency
**Severity:** Low
**Location:** Test files
**Description:** Tests are split between:
- `/src/tests/` (timing.test.ts, scheduler.test.ts, audioEngine.integration.test.ts)
- `/src/features/session/runtime/__tests__/` (component-specific tests)

**Impact:** Unclear where to add new tests
**Solution:** Adopt consistent test organization (co-located or centralized)

## Code Duplication

### Repeated Configuration Objects
**Severity:** Low
**Location:** Test files
**Description:** Similar SessionConfig objects are created repeatedly across test files with slight variations. No shared test fixtures or factories.

**Impact:** Test maintenance burden, risk of inconsistency
**Solution:** Create shared test fixtures or factory functions

