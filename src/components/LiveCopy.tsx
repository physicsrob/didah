import { useState, useEffect } from 'react';
import type { HistoryItem } from '../features/session/runtime/io';

/**
 * Hook to handle keyboard input for Live Copy mode
 */
export function useLiveCopyInput(isActive: boolean) {
  const [typedChars, setTypedChars] = useState<string[]>([]);

  useEffect(() => {
    if (!isActive) return;

    const handleKey = (e: KeyboardEvent) => {
      // Ignore special keys
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Prevent default for keys we handle
      if (e.key === 'Backspace' || e.key.length === 1) {
        e.preventDefault();
      }

      if (e.key === 'Backspace') {
        setTypedChars(prev => prev.slice(0, -1));
      } else if (e.key.length === 1) {
        // Single printable character (including space)
        setTypedChars(prev => [...prev, e.key.toUpperCase()]);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isActive]);

  const reset = () => setTypedChars([]);

  return { typedChars, reset };
}

/**
 * Apply corrections for Live Copy immediate feedback mode
 */
export function applyCorrections(
  typed: string[],
  transmitted: string[]
): Array<{ char: string; corrected: boolean }> {
  const maxLength = Math.max(typed.length, transmitted.length);
  const result: Array<{ char: string; corrected: boolean }> = [];

  for (let i = 0; i < maxLength; i++) {
    if (i < transmitted.length) {
      // Position has been transmitted
      if (i < typed.length) {
        // User has typed something here
        if (typed[i] === transmitted[i]) {
          // Correct
          result.push({ char: typed[i], corrected: false });
        } else {
          // Wrong - show correction
          result.push({ char: transmitted[i], corrected: true });
        }
      } else {
        // User is behind - add correction
        result.push({ char: transmitted[i], corrected: true });
      }
    } else {
      // Beyond transmitted chars - just show what user typed
      if (i < typed.length) {
        result.push({ char: typed[i], corrected: false });
      }
    }
  }

  return result;
}

/**
 * Character display component (similar to CharacterHistory but for individual chars)
 */
function CharacterDisplay({ chars }: { chars: Array<{ char: string; corrected: boolean }> }) {
  return (
    <div className="character-history-container">
      <div className="character-history-text">
        {chars.length === 0 ? (
          <span className="history-placeholder">Start typing...</span>
        ) : (
          chars.map((item, i) => (
            <span
              key={i}
              className={item.corrected ? 'char-incorrect' : 'char-correct'}
            >
              {item.char}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Comparison view shown after session ends
 */
function ComparisonView({ transmitted, typed }: { transmitted: string; typed: string }) {
  return (
    <div className="comparison-view p-4 bg-gray-50 rounded">
      <div className="mb-3">
        <label className="text-sm text-muted block mb-1">Transmitted:</label>
        <div className="font-mono text-lg">{transmitted}</div>
      </div>
      <div>
        <label className="text-sm text-muted block mb-1">Your copy:</label>
        <div className="font-mono text-lg">{typed}</div>
      </div>
    </div>
  );
}

/**
 * Main Live Copy display component
 */
export function LiveCopyDisplay({
  phase,
  transmittedChars,
  typedChars,
  feedbackMode
}: {
  phase: 'idle' | 'running' | 'ended';
  transmittedChars: string[];
  typedChars: string[];
  feedbackMode?: 'end' | 'immediate';
}) {
  if (phase === 'ended') {
    // After session - show comparison
    return (
      <ComparisonView
        transmitted={transmittedChars.join('')}
        typed={typedChars.join('')}
      />
    );
  }

  // During session - show character-by-character display
  const displayChars = feedbackMode === 'immediate'
    ? applyCorrections(typedChars, transmittedChars)
    : typedChars.map(c => ({ char: c, corrected: false }));

  return <CharacterDisplay chars={displayChars} />;
}

/**
 * Unified session display component
 */
export function SessionDisplay({
  mode,
  phase,
  transmittedChars,
  typedChars,
  liveCopyFeedback
}: {
  mode: 'practice' | 'listen' | 'live-copy';
  phase: 'idle' | 'running' | 'ended';
  historyItems?: HistoryItem[];
  transmittedChars?: string[];
  typedChars?: string[];
  liveCopyFeedback?: 'end' | 'immediate';
}) {
  if (mode === 'live-copy') {
    return (
      <LiveCopyDisplay
        phase={phase}
        transmittedChars={transmittedChars || []}
        typedChars={typedChars || []}
        feedbackMode={liveCopyFeedback}
      />
    );
  }

  // For Practice and Listen modes, use the existing CharacterHistory
  // We'll import and use it in StudyPage
  return null; // StudyPage will handle this
}