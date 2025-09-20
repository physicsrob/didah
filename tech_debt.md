# Technical Debt Analysis

This document catalogs the technical debt in the current codebase. These are areas where shortcuts were taken, patterns weren't followed consistently, or code quality could be improved. This is NOT about missing features or incomplete functionality.

## Priority 1: Critical Issues (Impacts Functionality)

### 1. WPM Configuration Duplication
**Severity:** High
**Location:** Multiple files
**Description:** WPM configuration is hardcoded in multiple places with inconsistent values:
- `StudyPage.tsx`: wpm: 5 (line 27)
- `audioEngine.ts`: wpm: 5 (line 229)
- `cli/args.ts`: wpm: 20 (line 18)
- Tests: Various hardcoded values (20, 15, 25, etc.)

**Impact:** Confusing user experience; changes to WPM setting may not propagate correctly
**Solution:** Create a single source of truth for default configuration values

### 2. Timing Bug in Active Mode
**Severity:** High
**Location:** `src/features/session/runtime/__tests__/charPrograms.test.ts`
**Description:** Test comments indicate a timing bug where timeout happens during audio playback rather than after audio completion plus window duration (lines 233-307). The test explicitly mentions "BUG DETECTED" scenarios.

**Impact:** Incorrect timing windows for user input in active mode
**Solution:** Fix the timeout calculation in charPrograms.ts to properly account for audio duration

## Priority 2: Dead Code

### 3. Unused Scheduler Service
**Severity:** Medium
**Location:** `src/features/session/services/scheduler.ts`
**Description:** The scheduler service is fully implemented with 151 lines of code and has comprehensive tests (14 tests in scheduler.test.ts), but it's not used anywhere in production code. STATUS.md notes it as "Exists but unused (was part of old approach?)".

**Impact:** Maintenance burden, confusion about which approach is active
**Solution:** Delete scheduler.ts and its tests if confirmed unused, or document why it's being kept

### 4. Unused BrowserIOAdapter Class
**Severity:** Medium
**Location:** `src/features/session/runtime/ioAdapter.ts` (line 127+)
**Description:** BrowserIOAdapter class is defined but never instantiated or used. Only createIOAdapter function is used.

**Impact:** Dead code taking up space and causing confusion
**Solution:** Remove the BrowserIOAdapter class

## Priority 3: Code Organization Issues

### 5. CLI Code in Main Source Directory
**Severity:** Medium
**Location:** `/src/cli/`
**Description:** Command-line tools are mixed into the main source directory. These development utilities should be separated from production code.

**Files affected:**
- morse-sim.ts
- mockIO.ts
- clocks.ts
- args.ts

**Impact:** Unclear boundaries between production and development code
**Solution:** Move CLI tools to a separate directory outside of /src (e.g., /tools or /scripts)

### 6. Massive Inline Styles in StudyPage
**Severity:** Medium
**Location:** `src/pages/StudyPage.tsx` (lines 155-397)
**Description:** Over 240 lines of inline CSS styles embedded in the React component using a `<style>` tag. This makes the component file 511 lines long.

**Impact:**
- Poor maintainability
- No style reuse
- Difficult to find and modify styles
- Component file is bloated

**Solution:** Extract styles to CSS modules or styled-components

## Priority 4: Configuration & Constants

### 7. Hardcoded Audio Configuration
**Severity:** Low
**Location:** `src/features/session/services/audioEngine.ts`
**Description:** Audio configuration is hardcoded:
- frequency: 700 Hz (line 228)
- volume: 0.2 (line 230)
- Envelope timings hardcoded in applyEnvelope()

**Impact:** Users cannot customize audio settings to their preference
**Solution:** Make audio configuration user-adjustable through settings

### 8. Magic Numbers Throughout
**Severity:** Low
**Location:** Multiple files
**Description:** Magic numbers without named constants:
- 1200 (WPM formula constant) appears directly in calculations
- 600, 800 Hz frequency values in tests
- 3000, 5000 timeout values
- Envelope timing values (0.01, 0.02, etc.)

**Impact:** Unclear intent, harder to maintain
**Solution:** Define named constants with explanatory comments

## Priority 5: Inconsistent Patterns

### 9. Error Handling Inconsistency
**Severity:** Low
**Location:** Throughout codebase
**Description:** Error handling approaches vary:
- Some functions throw errors (timing.ts)
- Some use try/catch with console.error
- Some silently fail
- No consistent error boundary strategy

**Impact:** Unpredictable error behavior, difficult debugging
**Solution:** Establish and document consistent error handling patterns

### 10. Passive Mode Lightning Speed Issue
**Severity:** Low
**Location:** `src/core/morse/timing.ts`
**Description:** Lightning and Fast speeds have identical timing in passive mode (both use 2 dit pre-reveal, 1 dit post-reveal). This contradicts the spec's intention of having distinct speed tiers.

**Impact:** Lightning speed doesn't provide additional challenge in passive mode
**Solution:** Differentiate lightning timing or document why they're the same

## Priority 6: Testing & Documentation

### 11. Test Organization Inconsistency
**Severity:** Low
**Location:** Test files
**Description:** Tests are split between:
- `/src/tests/` (timing.test.ts, scheduler.test.ts, audioEngine.integration.test.ts)
- `/src/features/session/runtime/__tests__/` (component-specific tests)

**Impact:** Unclear where to add new tests
**Solution:** Adopt consistent test organization (co-located or centralized)

### 12. Outdated Architecture Documentation
**Severity:** Low
**Location:** `arch.md`
**Description:** STATUS.md notes that arch.md "describes old approach" and doesn't reflect the current runtime-based implementation.

**Impact:** Misleading documentation for new contributors
**Solution:** Update arch.md to reflect actual implementation

## Code Duplication

### 13. Repeated Configuration Objects
**Severity:** Low
**Location:** Test files
**Description:** Similar SessionConfig objects are created repeatedly across test files with slight variations. No shared test fixtures or factories.

**Impact:** Test maintenance burden, risk of inconsistency
**Solution:** Create shared test fixtures or factory functions

## Summary

**Total Issues:** 13

**By Priority:**
- Priority 1 (Critical): 2 issues
- Priority 2 (Dead Code): 2 issues
- Priority 3 (Organization): 2 issues
- Priority 4 (Config): 2 issues
- Priority 5 (Patterns): 2 issues
- Priority 6 (Testing): 3 issues

**Recommended Action Order:**
1. Fix timing bug and WPM configuration duplication (Priority 1)
2. Remove dead code (scheduler, BrowserIOAdapter) (Priority 2)
3. Extract inline styles from StudyPage (Priority 3)
4. Move CLI tools out of /src (Priority 3)
5. Address remaining issues as time permits

**Estimated Effort:**
- Quick wins (< 30 min): Remove dead code, fix WPM config
- Medium effort (1-2 hours): Extract styles, move CLI tools
- Larger effort (2-4 hours): Fix timing bug, establish patterns

## Notes

This analysis focuses on actual technical debt in the implemented code, not missing features. The codebase is generally well-structured following the runtime approach, but these issues should be addressed before adding new features to maintain code quality and prevent future problems.