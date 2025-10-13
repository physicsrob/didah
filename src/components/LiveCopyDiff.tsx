/**
 * Live Copy Diff Visualization
 *
 * Displays the user's transcription with inline markings showing differences
 * from the transmitted reference.
 */

import type { SessionStatistics } from '../core/types/statistics';

interface LiveCopyDiffProps {
  diffSegments: NonNullable<SessionStatistics['liveCopyDiff']>;
}

export function LiveCopyDiff({ diffSegments }: LiveCopyDiffProps) {
  if (diffSegments.length === 0) {
    return (
      <div className="live-copy-diff">
        <p className="text-muted">No transcription to display</p>
      </div>
    );
  }

  return (
    <div className="live-copy-diff">
      <div className="diff-container">
        {diffSegments.map((segment, index) => (
          <span
            key={index}
            className={`diff-segment diff-${segment.type}`}
            data-type={segment.type}
          >
            {segment.char}
          </span>
        ))}
      </div>
    </div>
  );
}
