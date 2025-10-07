import type { LevelConfig } from './types';
import { ObstacleSize } from './types';

// Logical game dimensions (game logic operates in this coordinate space)
export const LOGICAL_WIDTH = 1200 as const;
export const LOGICAL_HEIGHT = 600 as const;

// Timing system constants - obstacle duration tiers
// These determine required reaction speeds via the bonus airtime system (see getBonusAirtime in GameEngine.ts):
// - SMALL (0.2s): Clearable with any reaction speed (>800ms reaction gets 0.2s bonus ≥ 0.2s required)
// - MEDIUM (0.4s): Requires ≤800ms reaction (500-800ms reaction gets 0.4s bonus ≥ 0.4s required)
// - LARGE (0.6s): Requires ≤500ms reaction (≤500ms reaction gets 0.6s bonus ≥ 0.6s required)
// Changing these values affects which reaction tiers can clear which obstacles!
export const OBSTACLE_DURATION_SMALL = 0.2 as const;   // seconds
export const OBSTACLE_DURATION_MEDIUM = 0.4 as const;  // seconds
export const OBSTACLE_DURATION_LARGE = 0.6 as const;   // seconds

// Physics constants
export const GRAVITY = 1000 as const;                    // Gravity constant for jump physics (game units/s²)

// Character properties
export const GROUND_Y = 300 as const; // Y position of ground (top of character when standing)
export const CHARACTER_WIDTH = 125 as const; // Half original size (was 249)
export const CHARACTER_HEIGHT = 161 as const; // Half original size (was 322)
export const CHARACTER_X = 100 as const; // Fixed x position for character

// Derived constant for ground bottom
export const GROUND_BOTTOM = GROUND_Y + CHARACTER_HEIGHT;

// Obstacle visual properties
export const MIN_OBSTACLE_HEIGHT = 50 as const; // Minimum obstacle height in pixels
export const OBSTACLE_HEIGHT_VARIANCE = 10 as const; // Random height variation in pixels

// Animation constants
export const JUMP_FRAME_INDEX = 4 as const; // Frame index for jumping sprite (run_5.png)

// Default level configuration (Level 1 - Easy)
export const DEFAULT_LEVEL_CONFIG: LevelConfig = {
  scrollSpeed: 400,
  wpm: 10,
  obstacleSmallFraction: 1.0,
  obstacleMediumFraction: 0.0,
  obstacleLargeFraction: 0.0,
  downtimeMin: 0.5,
  downtimeMax: 2.0,

  // IMPORTANT: Approach time controls the reaction window, but is auto-capped by obstacle spawn logic:
  // - SMALL obstacles: Use full approach_time (any reaction speed works)
  // - MEDIUM obstacles: Effective max 0.8s (requires ≤800ms reaction for 0.4s bonus)
  // - LARGE obstacles: Effective max 0.5s (requires ≤500ms reaction for 0.6s bonus)
  // This ensures obstacles arrive at the moment they become unclearable (visual alignment).
  // To change MEDIUM/LARGE difficulty, modify getBonusAirtime thresholds or OBSTACLE_DURATION_* constants.
  minApproachTime: 1.0,
  maxApproachTime: 1.5,
};

export const LEVEL_CONFIG_10: LevelConfig = {
  scrollSpeed: 600,
  wpm: 20,
  obstacleSmallFraction: 0.0,
  obstacleMediumFraction: 0.5,
  obstacleLargeFraction: 0.5,
  downtimeMin: 0.1,
  downtimeMax: 0.6,

  // IMPORTANT: Approach time controls the reaction window, but is auto-capped by obstacle spawn logic:
  // - SMALL obstacles: Use full approach_time (any reaction speed works)
  // - MEDIUM obstacles: Effective max 0.8s (requires ≤800ms reaction for 0.4s bonus)
  // - LARGE obstacles: Effective max 0.5s (requires ≤500ms reaction for 0.6s bonus)
  // This ensures obstacles arrive at the moment they become unclearable (visual alignment).
  // To change MEDIUM/LARGE difficulty, modify getBonusAirtime thresholds or OBSTACLE_DURATION_* constants.
  minApproachTime: 0.5,
  maxApproachTime: 1.0,
};

// All 10 level configurations (interpolated from level 1 to level 10)
export const LEVEL_CONFIGS: LevelConfig[] = [
  DEFAULT_LEVEL_CONFIG, // Level 1
  { // Level 2
    scrollSpeed: 422,
    wpm: 11,
    obstacleSmallFraction: 0.8,
    obstacleMediumFraction: 0.2,
    obstacleLargeFraction: 0.0,
    downtimeMin: 0.45,
    downtimeMax: 1.84,
    minApproachTime: 0.94,
    maxApproachTime: 1.44,
  },
  { // Level 3
    scrollSpeed: 444,
    wpm: 12,
    obstacleSmallFraction: 0.6,
    obstacleMediumFraction: 0.3,
    obstacleLargeFraction: 0.1,
    downtimeMin: 0.4,
    downtimeMax: 1.68,
    minApproachTime: 0.88,
    maxApproachTime: 1.38,
  },
  { // Level 4
    scrollSpeed: 467,
    wpm: 13,
    obstacleSmallFraction: 0.5,
    obstacleMediumFraction: 0.35,
    obstacleLargeFraction: 0.15,
    downtimeMin: 0.36,
    downtimeMax: 1.52,
    minApproachTime: 0.83,
    maxApproachTime: 1.33,
  },
  { // Level 5
    scrollSpeed: 489,
    wpm: 14,
    obstacleSmallFraction: 0.4,
    obstacleMediumFraction: 0.4,
    obstacleLargeFraction: 0.2,
    downtimeMin: 0.32,
    downtimeMax: 1.36,
    minApproachTime: 0.78,
    maxApproachTime: 1.28,
  },
  { // Level 6
    scrollSpeed: 511,
    wpm: 16,
    obstacleSmallFraction: 0.3,
    obstacleMediumFraction: 0.45,
    obstacleLargeFraction: 0.25,
    downtimeMin: 0.27,
    downtimeMax: 1.2,
    minApproachTime: 0.72,
    maxApproachTime: 1.22,
  },
  { // Level 7
    scrollSpeed: 533,
    wpm: 17,
    obstacleSmallFraction: 0.2,
    obstacleMediumFraction: 0.5,
    obstacleLargeFraction: 0.3,
    downtimeMin: 0.23,
    downtimeMax: 1.04,
    minApproachTime: 0.67,
    maxApproachTime: 1.17,
  },
  { // Level 8
    scrollSpeed: 556,
    wpm: 18,
    obstacleSmallFraction: 0.15,
    obstacleMediumFraction: 0.5,
    obstacleLargeFraction: 0.35,
    downtimeMin: 0.18,
    downtimeMax: 0.88,
    minApproachTime: 0.61,
    maxApproachTime: 1.11,
  },
  { // Level 9
    scrollSpeed: 578,
    wpm: 19,
    obstacleSmallFraction: 0.05,
    obstacleMediumFraction: 0.5,
    obstacleLargeFraction: 0.45,
    downtimeMin: 0.14,
    downtimeMax: 0.72,
    minApproachTime: 0.56,
    maxApproachTime: 1.06,
  },
  LEVEL_CONFIG_10, // Level 10
];

// Number of characters to clear per level before advancing
export const CHARACTERS_PER_LEVEL = [5, 8, 10, 12, 15, 18, 20, 25, 30, 35];

// Helper functions

/**
 * Returns a random number in the given range [min, max]
 */
export function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/**
 * Selects an obstacle size based on level configuration fractions
 */
export function selectObstacleSize(config: LevelConfig): ObstacleSize {
  const roll = Math.random();
  if (roll < config.obstacleSmallFraction) {
    return ObstacleSize.SMALL;
  } else if (roll < config.obstacleSmallFraction + config.obstacleMediumFraction) {
    return ObstacleSize.MEDIUM;
  } else {
    return ObstacleSize.LARGE;
  }
}

/**
 * Converts obstacle size to duration in seconds
 */
export function getObstacleDuration(size: ObstacleSize): number {
  switch (size) {
    case ObstacleSize.SMALL:
      return OBSTACLE_DURATION_SMALL;
    case ObstacleSize.MEDIUM:
      return OBSTACLE_DURATION_MEDIUM;
    case ObstacleSize.LARGE:
      return OBSTACLE_DURATION_LARGE;
    default:
      return OBSTACLE_DURATION_SMALL;
  }
}
