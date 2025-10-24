/**
 * Star Display Component
 *
 * Displays 0-3 stars with filled/empty states.
 * Used in Learn Mode for level progress and session completion.
 */

import '../styles/starDisplay.css';

type StarDisplayProps = {
  /** Number of stars to display as filled (0-3) */
  stars: number;
  /** Whether this level/session has been attempted */
  hasAttempt: boolean;
  /** Size variant for different contexts */
  size?: 'small' | 'medium' | 'large';
};

export function StarDisplay({ stars, hasAttempt, size = 'medium' }: StarDisplayProps) {
  // Show empty stars if no attempt
  if (!hasAttempt) {
    return (
      <div className={`learn-stars learn-stars-${size}`}>
        {[1, 2, 3].map((i) => (
          <span key={i} className="learn-star learn-star-empty">★</span>
        ))}
      </div>
    );
  }

  // Show filled stars based on achievement
  return (
    <div className={`learn-stars learn-stars-${size}`}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`learn-star ${i <= stars ? 'learn-star-filled' : 'learn-star-empty'}`}
        >
          ★
        </span>
      ))}
    </div>
  );
}
