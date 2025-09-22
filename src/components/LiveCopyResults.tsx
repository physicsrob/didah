/**
 * Live Copy Results Display
 *
 * Shows the session results for Live Copy mode with statistics and comparison.
 */

import type { LiveCopyState } from '../features/session/livecopy/evaluator';
import { CharacterDisplay } from './CharacterDisplay';
import { liveCopyResultsDisplay } from './CharacterDisplay.transformations';

/**
 * Results display for end of Live Copy session
 */
export function LiveCopyResults({ state }: { state: LiveCopyState }) {
  const { userCopy, correctText } = liveCopyResultsDisplay(state.display);

  return (
    <div className="results p-4 bg-gray-50 rounded">
      <h3 className="text-lg font-semibold mb-3">Session Complete</h3>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{state.score.correct}</div>
          <div className="text-sm text-gray-600">Correct</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{state.score.wrong}</div>
          <div className="text-sm text-gray-600">Wrong</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-400">{state.score.missed}</div>
          <div className="text-sm text-gray-600">Missed</div>
        </div>
      </div>

      <div className="text-center mb-4">
        <div className="text-3xl font-bold">{state.score.accuracy}%</div>
        <div className="text-sm text-gray-600">Accuracy</div>
      </div>

      <div className="mt-4">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Your Copy:</h4>
        <div className="bg-white p-3 rounded border">
          <CharacterDisplay
            characters={userCopy}
            placeholder=""
            autoScroll={false}
          />
        </div>
      </div>

      <div className="mt-3">
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Correct Text:</h4>
        <div className="bg-white p-3 rounded border">
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