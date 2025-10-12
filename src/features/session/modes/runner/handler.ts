/**
 * Runner Mode - Handler Logic
 *
 * Handles one character at a time, integrating with the session runner.
 */

import type { SessionConfig } from '../../../../core/types/domain';
import type { HandlerContext } from '../shared/types';
import { getRunnerGame } from './gameRegistry';
import {
  randomInRange,
  selectObstacleSize,
  getObstacleDuration,
  CHARACTERS_PER_LEVEL
} from './game/constants';
import { calculateCharacterDurationMs } from '../../../../core/morse/timing';
import { isValidChar } from '../shared/utils';

/**
 * Handler function for runner mode.
 * Processes one character: spawn obstacle, play morse, wait for input, handle jump.
 */
export async function handleRunnerCharacter(
  config: SessionConfig,
  char: string,
  startTime: number,
  ctx: HandlerContext,
  signal: AbortSignal
): Promise<void> {
  // Skip spaces - they have no place in the runner game
  if (char === ' ') {
    return;
  }

  const game = getRunnerGame();
  if (!game) {
    console.error('[Runner] Game not initialized');
    return;
  }

  // Wait for game to be ready (game loop started)
  if (!game.isReady()) {
    console.log('[Runner] Waiting for game to be ready...');
    await game.waitUntilReady(signal);
    console.log('[Runner] Game is now ready');
  }

  const engine = game.getEngine();
  const gameConfig = engine.getConfig();

  // Use level's WPM, not user's configured WPM
  const levelWpm = gameConfig.wpm;

  // Get actual morse duration from timing module (in seconds)
  const morseDuration = calculateCharacterDurationMs(char, levelWpm, 0) / 1000;

  // Select random approach time and obstacle size
  const approachTime = randomInRange(gameConfig.minApproachTime, gameConfig.maxApproachTime);
  const obstacleSize = selectObstacleSize(gameConfig);
  const obstacleDuration = getObstacleDuration(obstacleSize);

  // Calculate spawn distance
  const spawnDistance = (morseDuration + approachTime) * gameConfig.scrollSpeed;

  // Spawn obstacle for this character
  engine.spawnObstacle(
    char,
    spawnDistance,
    obstacleDuration,
    morseDuration,
    approachTime
  );

  // Play morse audio at level's WPM
  await ctx.io.playChar(char, levelWpm);

  // Wait for player input (any valid morse character)
  const keyEvent = await ctx.input.takeUntil(
    (event) => isValidChar(event.key),
    signal
  );

  // Handle input
  engine.handleInput(keyEvent.key.toUpperCase());

  // Wait for jump to complete (if jumping)
  while (engine.getState().character.state === 'jumping') {
    await ctx.clock.sleep(50, signal); // Check every 50ms
  }

  // Check if game over
  if (engine.getState().isGameOver) {
    // Wait for restart (SPACE) or quit (Q)
    const restartEvent = await ctx.input.takeUntil(
      (event) => event.key === ' ' || event.key.toLowerCase() === 'q',
      signal
    );

    if (restartEvent.key.toLowerCase() === 'q') {
      // User wants to quit - request session end
      ctx.requestQuit();
      return;
    }

    // User pressed SPACE - reset game and continue
    const startingLevel = config.startingLevel || 1;
    engine.reset(startingLevel);
    // Continue to next character (downtime will happen below)
  } else {
    // Successfully cleared obstacle - increment count and check level progression
    engine.incrementCharacterCount();

    const state = engine.getState();
    const currentLevel = state.currentLevel;
    const charsCleared = state.charactersCleared;

    // Check if reached threshold for current level
    if (currentLevel <= 10 && charsCleared >= CHARACTERS_PER_LEVEL[currentLevel - 1]) {
      if (currentLevel === 10) {
        // Completed all 10 levels!
        engine.completeGame();
        // Wait for player to acknowledge (SPACE to restart or Q to quit)
        const completeEvent = await ctx.input.takeUntil(
          (event) => event.key === ' ' || event.key.toLowerCase() === 'q',
          signal
        );

        if (completeEvent.key.toLowerCase() === 'q') {
          // User wants to quit - request session end
          ctx.requestQuit();
          return;
        }

        // User pressed SPACE - reset and start over
        const startingLevel = config.startingLevel || 1;
        engine.reset(startingLevel);
      } else {
        // Advance to next level
        engine.advanceToLevel(currentLevel + 1);
      }
    }
  }

  // Brief downtime before next character
  const downtimeDuration = randomInRange(gameConfig.downtimeMin, gameConfig.downtimeMax);
  await ctx.clock.sleep(downtimeDuration * 1000, signal);

  // Update remaining time
  ctx.updateRemainingTime(startTime, config);
  ctx.publish();
}
