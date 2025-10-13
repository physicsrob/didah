/**
 * Type definitions for the Morse Runner game.
 */

/**
 * Character state enum
 */
export type CharacterState = 'running' | 'jumping' | 'dead';

/**
 * Obstacle size tiers
 */
export const ObstacleSize = {
  SMALL: 'SMALL',
  MEDIUM: 'MEDIUM',
  LARGE: 'LARGE'
} as const;

export type ObstacleSize = typeof ObstacleSize[keyof typeof ObstacleSize];

/**
 * Character object representing the player character
 */
export interface Character {
  y: number;
  state: CharacterState;
  jumpStartTime: number | null;
  jumpDuration: number | null;
  jumpHeight: number | null;
}

/**
 * Obstacle object with timing metadata
 */
export interface Obstacle {
  x: number;
  width: number;
  height: number;
  duration: number;
  spawnTime: number;
  requiredLetter: string;
  morseDuration: number;
  morseEndTime: number;
  approachTime: number;
  size: ObstacleSize;
}

/**
 * Complete game state
 */
export interface GameState {
  character: Character;
  obstacles: Obstacle[];
  scrollOffset: number;
  currentTime: number;
  isGameOver: boolean;
  currentLevel: number;
  charactersCleared: number;
  isGameComplete: boolean;
  failedCharacter: string | null;  // Character that caused game over
}

/**
 * Level configuration parameters
 */
export interface LevelConfig {
  scrollSpeed: number;
  wpm: number;
  obstacleSmallFraction: number;
  obstacleMediumFraction: number;
  obstacleLargeFraction: number;
  downtimeMin: number;
  downtimeMax: number;

  /**
   * Minimum reaction window after morse ends.
   * Note: MEDIUM obstacles auto-capped at 0.8s, LARGE at 0.5s (see obstacle spawn logic)
   */
  minApproachTime: number;

  /**
   * Maximum reaction window after morse ends.
   * Note: MEDIUM obstacles auto-capped at 0.8s, LARGE at 0.5s (see obstacle spawn logic)
   */
  maxApproachTime: number;
}

/**
 * Configuration for AnimationManager
 */
export interface AnimationConfig {
  frameBasePath?: string;
  frameCount?: number;
  animationFPS?: number;
}
