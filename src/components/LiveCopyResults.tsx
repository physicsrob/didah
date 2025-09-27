/**
 * Live Copy Results Display
 *
 * Shows the session results for Live Copy mode with statistics and comparison.
 */

import type { LiveCopyState } from '../features/session/livecopy/evaluator';
import { CharacterDisplay } from './CharacterDisplay';
import { liveCopyResultsDisplay } from './CharacterDisplay.transformations';
import './LiveCopyResults.css';

/**
 * Results display for end of Live Copy session
 */
export function LiveCopyResults({ state }: { state: LiveCopyState }) {
  const { userCopy, correctText } = liveCopyResultsDisplay(state.display);

  return (
    <div className="live-copy-results">
      <h3 className="live-copy-results__title">Session Complete</h3>

      <div className="live-copy-results__stats-grid">
        <div className="live-copy-results__stat">
          <div className="live-copy-results__stat-value live-copy-results__stat-value--correct">{state.score.correct}</div>
          <div className="live-copy-results__stat-label">Correct</div>
        </div>
        <div className="live-copy-results__stat">
          <div className="live-copy-results__stat-value live-copy-results__stat-value--wrong">{state.score.wrong}</div>
          <div className="live-copy-results__stat-label">Wrong</div>
        </div>
        <div className="live-copy-results__stat">
          <div className="live-copy-results__stat-value live-copy-results__stat-value--missed">{state.score.missed}</div>
          <div className="live-copy-results__stat-label">Missed</div>
        </div>
      </div>

      <div className="live-copy-results__accuracy">
        <div className="live-copy-results__accuracy-value">{state.score.accuracy}%</div>
        <div className="live-copy-results__accuracy-label">Accuracy</div>
      </div>

      <div className="live-copy-results__section">
        <h4 className="live-copy-results__section-title">Your Copy:</h4>
        <div className="live-copy-results__copy-display">
          <CharacterDisplay
            characters={userCopy}
            placeholder=""
            autoScroll={false}
          />
        </div>
      </div>

      <div className="live-copy-results__section">
        <h4 className="live-copy-results__section-title">Correct Text:</h4>
        <div className="live-copy-results__copy-display">
          <CharacterDisplay
            characters={correctText}
            placeholder=""
            autoScroll={false}
          />
        </div>
      </div>
    </div>
  );
}