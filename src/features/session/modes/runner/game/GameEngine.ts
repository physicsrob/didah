import type { GameState, LevelConfig, Obstacle } from './types';
import { ObstacleSize } from './types';
import {
  GROUND_Y,
  CHARACTER_WIDTH,
  CHARACTER_X,
  OBSTACLE_DURATION_SMALL,
  OBSTACLE_DURATION_MEDIUM,
  OBSTACLE_DURATION_LARGE,
  GRAVITY,
  MIN_OBSTACLE_HEIGHT,
  OBSTACLE_HEIGHT_VARIANCE,
  LEVEL_CONFIGS
} from './constants';

/**
 * Calculates bonus airtime based on reaction time.
 * @param reactionTime - Reaction time in seconds
 * @returns Bonus airtime in seconds
 */
function getBonusAirtime(reactionTime: number): number {
  const rtMs = reactionTime * 1000;
  if (rtMs > 800) return OBSTACLE_DURATION_SMALL;   // 0.2s
  if (rtMs > 500) return OBSTACLE_DURATION_MEDIUM;  // 0.4s
  return OBSTACLE_DURATION_LARGE;                   // 0.6s
}

/**
 * Calculates visual jump arc height at a given progress point.
 * Uses physics-based parabolic motion (symmetric - time up = time down).
 * @param progress - Jump progress from 0.0 to 1.0
 * @param maxHeight - Maximum jump height
 * @returns Y offset for visual arc
 */
function calculateJumpArc(progress: number, maxHeight: number): number {
  // Physics-based parabolic arc: y = maxHeight * (1 - (2*progress - 1)²)
  // Peaks at progress = 0.5, returns to 0 at progress = 1.0
  const normalized = 2 * progress - 1; // Maps [0,1] to [-1,1]
  return maxHeight * (1 - normalized * normalized);
}

/**
 * Core game engine that manages all game logic and state.
 * Handles physics, collision detection, and obstacle management.
 * Uses explicit timing-based spawning (no auto-spawning).
 */
export class GameEngine {
  private state: GameState;
  private config: LevelConfig;
  private activeObstacle: Obstacle | null = null;

  /**
   * Creates a new GameEngine instance.
   * @param config - Optional level configuration (uses level 1 if not provided)
   */
  constructor(config?: LevelConfig) {
    this.config = config || LEVEL_CONFIGS[0];
    this.state = {
      character: {
        y: GROUND_Y,
        state: 'running',
        jumpStartTime: null,
        jumpDuration: null,
        jumpHeight: null
      },
      obstacles: [],
      scrollOffset: 0,
      currentTime: 0,
      isGameOver: false,
      currentLevel: 1,
      charactersCleared: 0,
      isGameComplete: false,
      failedCharacter: null
    };
  }

  /**
   * Updates the game state for one frame.
   * Only handles physics, collisions, and time tracking.
   * Does NOT auto-spawn obstacles (use spawnObstacle() explicitly).
   * @param deltaTime - Time elapsed since last update in seconds
   */
  update(deltaTime: number): void {
    if (this.state.isGameOver) {
      console.log(`[${this.state.currentTime.toFixed(3)}s] ⏸️  Update skipped - game is over`);
      return;
    }

    // Validate deltaTime
    if (deltaTime < 0 || !isFinite(deltaTime)) {
      console.warn('Invalid deltaTime:', deltaTime);
      return;
    }

    // Track game time
    this.state.currentTime += deltaTime;

    // Update scroll offset
    this.state.scrollOffset += this.config.scrollSpeed * deltaTime;

    // Update character physics
    this.updateCharacter(deltaTime);

    // Update obstacles
    this.updateObstacles(deltaTime);

    // Check collisions
    this.checkCollisions();

    // Validate state after update
    this.validateState();
  }

  /**
   * Spawns an obstacle with explicit timing parameters.
   * This is the primary way to create obstacles in the game.
   * @param letter - The letter the player must type
   * @param spawnDistance - Distance from character's right edge to obstacle's left edge (pixels)
   * @param obstacleDuration - Duration (width) of obstacle in seconds
   * @param morseDuration - How long the morse code plays
   * @param approachTime - Allowed reaction window after morse ends
   */
  spawnObstacle(
    letter: string,
    spawnDistance: number,
    obstacleDuration: number,
    morseDuration: number,
    approachTime: number
  ): void {
    // Spawn distance is from character's right edge (where collision starts)
    const spawnX = CHARACTER_X + CHARACTER_WIDTH + spawnDistance;
    const width = obstacleDuration * this.config.scrollSpeed;
    const height = MIN_OBSTACLE_HEIGHT + Math.random() * OBSTACLE_HEIGHT_VARIANCE;

    // Determine obstacle size from duration
    let size: ObstacleSize;
    if (obstacleDuration === OBSTACLE_DURATION_SMALL) {
      size = ObstacleSize.SMALL;
    } else if (obstacleDuration === OBSTACLE_DURATION_MEDIUM) {
      size = ObstacleSize.MEDIUM;
    } else {
      size = ObstacleSize.LARGE;
    }

    const obstacle: Obstacle = {
      x: spawnX,
      width: width,
      height: height,
      duration: obstacleDuration,
      spawnTime: this.state.currentTime,
      requiredLetter: letter,
      morseDuration: morseDuration,
      morseEndTime: this.state.currentTime + morseDuration,
      approachTime: approachTime,
      size: size
    };

    this.state.obstacles.push(obstacle);

    // Set as active obstacle if we don't have one
    if (this.activeObstacle === null) {
      this.activeObstacle = obstacle;
    }

    console.log(`[${this.state.currentTime.toFixed(3)}s] 🚧 OBSTACLE SPAWNED - letter: "${letter}", x: ${spawnX.toFixed(1)}, size: ${size}, morse ends at: ${obstacle.morseEndTime.toFixed(3)}s, approach: ${approachTime.toFixed(3)}s`);
  }

  /**
   * Handles player input (letter typing).
   * Validates the letter against the active obstacle and triggers jump or death.
   * @param letter - The letter the player typed (uppercase)
   */
  handleInput(letter: string): void {
    if (this.state.isGameOver || this.state.character.state !== 'running') {
      return;
    }

    // Check if we have an active obstacle to respond to
    if (this.activeObstacle === null) {
      // No obstacle to respond to, ignore input
      console.log(`[${this.state.currentTime.toFixed(3)}s] INPUT: "${letter}" - IGNORED (no active obstacle)`);
      return;
    }

    console.log(`[${this.state.currentTime.toFixed(3)}s] INPUT: "${letter}" (expected: "${this.activeObstacle.requiredLetter}")`);

    // Validate letter against required letter
    if (letter.toUpperCase() !== this.activeObstacle.requiredLetter.toUpperCase()) {
      // Wrong letter - instant death
      console.log(`  ❌ WRONG LETTER - Game Over`);
      this.gameOver(this.activeObstacle.requiredLetter);
      return;
    }

    // Calculate reaction time (from when morse ended)
    const reactionTime = this.state.currentTime - this.activeObstacle.morseEndTime;

    // Ignore input if pressed before morse ends
    if (reactionTime < 0) {
      console.log(`  ⏸️  TOO EARLY - pressed ${(-reactionTime * 1000).toFixed(0)}ms before morse ended (ignored)`);
      return;
    }

    console.log(`  Morse ended at: ${this.activeObstacle.morseEndTime.toFixed(3)}s`);
    console.log(`  Reaction time: ${(reactionTime * 1000).toFixed(0)}ms`);
    console.log(`  Approach window: ${this.activeObstacle.approachTime.toFixed(3)}s`);

    // Check if reaction is within approach window
    if (reactionTime > this.activeObstacle.approachTime) {
      // Too slow - death
      console.log(`  ❌ TOO SLOW (${(reactionTime * 1000).toFixed(0)}ms > ${(this.activeObstacle.approachTime * 1000).toFixed(0)}ms) - Game Over`);
      this.gameOver(this.activeObstacle.requiredLetter);
      return;
    }

    // Correct letter and within time window - trigger jump
    const extraTime = this.activeObstacle.approachTime - reactionTime;
    const bonusAirtime = getBonusAirtime(reactionTime);
    const characterWidthTime = CHARACTER_WIDTH / this.config.scrollSpeed;
    const jumpDuration = extraTime + bonusAirtime + characterWidthTime;
    const jumpHeight = Math.min((GRAVITY * jumpDuration * jumpDuration) / 8, GROUND_Y);

    console.log(`  ✓ CORRECT & ON TIME`);
    console.log(`  Extra time: ${extraTime.toFixed(3)}s`);
    console.log(`  Bonus airtime: ${bonusAirtime.toFixed(3)}s`);
    console.log(`  Character width time: ${characterWidthTime.toFixed(3)}s`);
    console.log(`  Jump duration: ${jumpDuration.toFixed(3)}s`);
    console.log(`  Jump height: ${jumpHeight.toFixed(1)}px`);
    console.log(`  Obstacle duration: ${this.activeObstacle.duration.toFixed(3)}s`);

    this.triggerJump(jumpDuration, jumpHeight);

    // Clear active obstacle (player has responded)
    this.activeObstacle = null;
  }

  /**
   * Triggers a jump with specific duration and height.
   * @param jumpDuration - Total time to remain airborne (seconds)
   * @param jumpHeight - Visual jump height (pixels)
   */
  private triggerJump(jumpDuration: number, jumpHeight: number): void {
    if (this.state.character.state === 'running') {
      this.state.character.jumpStartTime = this.state.currentTime;
      this.state.character.jumpDuration = jumpDuration;
      this.state.character.jumpHeight = jumpHeight;
      this.state.character.state = 'jumping';
      console.log(`[${this.state.currentTime.toFixed(3)}s] 🦘 JUMP STARTED - will land at ${(this.state.currentTime + jumpDuration).toFixed(3)}s`);
    }
  }

  /**
   * Sets an obstacle as the active obstacle (waiting for player input).
   * @param obstacle - The obstacle to set as active
   */
  setActiveObstacle(obstacle: Obstacle): void {
    this.activeObstacle = obstacle;
  }

  /**
   * Checks if character has valid jump state (all jump properties are non-null).
   * @returns True if jump state is valid
   */
  private hasValidJumpState(): boolean {
    const char = this.state.character;
    return char.jumpStartTime !== null &&
           char.jumpDuration !== null &&
           char.jumpHeight !== null;
  }

  /**
   * Gets the remaining time in the current jump.
   * @returns Remaining jump time in seconds, or 0 if not jumping or invalid state
   */
  private getJumpTimeRemaining(): number {
    const char = this.state.character;
    if (char.jumpStartTime !== null && char.jumpDuration !== null) {
      return (char.jumpStartTime + char.jumpDuration) - this.state.currentTime;
    }
    return 0;
  }

  /**
   * Updates character state based on time-based jump system.
   * @param _deltaTime - Time elapsed since last update in seconds
   */
  private updateCharacter(_deltaTime: number): void {
    const char = this.state.character;

    if (char.state === 'jumping') {
      const jumpTimeRemaining = this.getJumpTimeRemaining();

      // Check if jump duration is complete
      if (jumpTimeRemaining <= 0) {
        char.y = GROUND_Y;
        char.state = 'running';
        console.log(`[${this.state.currentTime.toFixed(3)}s] 🏃 LANDED - back to running`);
      } else if (this.hasValidJumpState()) {
        // Calculate visual arc position (aesthetic only)
        const jumpProgress = (this.state.currentTime - char.jumpStartTime!) / char.jumpDuration!;
        const arcOffset = calculateJumpArc(jumpProgress, char.jumpHeight!);
        char.y = GROUND_Y - arcOffset;
      }
    }
  }

  /**
   * Updates obstacle positions and removes off-screen obstacles.
   * @param deltaTime - Time elapsed since last update in seconds
   */
  private updateObstacles(deltaTime: number): void {
    // Move obstacles left
    for (const obstacle of this.state.obstacles) {
      obstacle.x -= this.config.scrollSpeed * deltaTime;
    }

    // Remove off-screen obstacles
    const removed: Obstacle[] = [];
    this.state.obstacles = this.state.obstacles.filter(obstacle => {
      const keep = obstacle.x + obstacle.width > 0;
      if (!keep) {
        removed.push(obstacle);
      }
      return keep;
    });

    // Log removed obstacles
    if (removed.length > 0) {
      console.log(`[${this.state.currentTime.toFixed(3)}s] 🗑️  Removed ${removed.length} off-screen obstacles:`, removed.map(o => `"${o.requiredLetter}" at x=${o.x.toFixed(1)}`).join(', '));
    }

    // Clear active obstacle if it was removed
    if (this.activeObstacle && !this.state.obstacles.includes(this.activeObstacle)) {
      console.log(`[${this.state.currentTime.toFixed(3)}s] ⚠️  Active obstacle was removed (off-screen)`);
      this.activeObstacle = null;
    }
  }

  /**
   * Checks for collisions.
   * Simple rule: if obstacle overlaps character and character is not jumping, it's a collision.
   * Jump duration is already calculated correctly to clear obstacles, so we don't need to re-check.
   */
  private checkCollisions(): void {
    const char = this.state.character;

    for (const obstacle of this.state.obstacles) {
      // Check if obstacle overlaps with character horizontally
      const obstacleLeftEdge = obstacle.x;
      const obstacleRightEdge = obstacle.x + obstacle.width;
      const charRightEdge = CHARACTER_X + CHARACTER_WIDTH;

      const isOverlapping = obstacleLeftEdge <= charRightEdge && obstacleRightEdge >= CHARACTER_X;

      if (isOverlapping && char.state !== 'jumping') {
        // Running into obstacle - death
        console.log(`[${this.state.currentTime.toFixed(3)}s] ❌ COLLISION DETECTED - character is ${char.state}, obstacle at x=${obstacle.x.toFixed(1)}`);
        this.gameOver(obstacle.requiredLetter);
        return;
      }
      // If jumping while overlapping, we're OK - the jump duration was calculated to clear this
    }
  }

  /**
   * Handles game over state.
   */
  private gameOver(failedCharacter: string): void {
    console.log(`[${this.state.currentTime.toFixed(3)}s] 💀 GAME OVER - setting isGameOver=true, failed character: "${failedCharacter}"`);
    this.state.isGameOver = true;
    this.state.character.state = 'dead';
    this.state.failedCharacter = failedCharacter;
  }

  /**
   * Validates the game state to ensure it's within expected bounds.
   */
  private validateState(): void {
    const char = this.state.character;

    // Ensure character Y position is valid
    if (char.y < 0) {
      console.warn('Character Y position below 0, clamping');
      char.y = 0;
    }

    // Ensure obstacles have valid properties
    for (const obstacle of this.state.obstacles) {
      if (obstacle.width <= 0 || obstacle.height <= 0) {
        console.warn('Invalid obstacle dimensions:', obstacle);
      }
    }
  }

  /**
   * Gets the current game state.
   * @returns Current game state
   */
  getState(): GameState {
    return this.state;
  }

  /**
   * Gets the current level configuration.
   * @returns Current level config
   */
  getConfig(): LevelConfig {
    return this.config;
  }

  /**
   * Resets the game to initial state.
   * @param startingLevel - Optional starting level (1-10), defaults to 1
   */
  reset(startingLevel: number = 1): void {
    console.log(`[RESET] 🔄 Resetting game to level ${startingLevel}`);
    const level = Math.max(1, Math.min(10, startingLevel)); // Clamp to 1-10
    this.config = LEVEL_CONFIGS[level - 1]; // Array is 0-indexed
    this.state = {
      character: {
        y: GROUND_Y,
        state: 'running',
        jumpStartTime: null,
        jumpDuration: null,
        jumpHeight: null
      },
      obstacles: [],
      scrollOffset: 0,
      currentTime: 0,
      isGameOver: false,
      currentLevel: level,
      charactersCleared: 0,
      isGameComplete: false,
      failedCharacter: null
    };
    this.activeObstacle = null;
  }

  /**
   * Increments the character count when an obstacle is successfully cleared.
   */
  incrementCharacterCount(): void {
    this.state.charactersCleared++;
  }

  /**
   * Advances to a new level with updated configuration.
   * @param level - The level number to advance to (1-10)
   */
  advanceToLevel(level: number): void {
    if (level < 1 || level > 10) {
      console.warn(`Invalid level ${level}, must be between 1 and 10`);
      return;
    }

    this.state.currentLevel = level;
    this.state.charactersCleared = 0;
    this.config = LEVEL_CONFIGS[level - 1]; // Array is 0-indexed
    console.log(`[${this.state.currentTime.toFixed(3)}s] 🎯 ADVANCED TO LEVEL ${level}`);
  }

  /**
   * Marks the game as complete (all levels finished).
   */
  completeGame(): void {
    this.state.isGameComplete = true;
    console.log(`[${this.state.currentTime.toFixed(3)}s] 🏆 GAME COMPLETE!`);
  }
}
