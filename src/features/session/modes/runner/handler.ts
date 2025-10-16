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
} from './constants';
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
  signal: AbortSignal,
  nextChar: string | null
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

  // Check if first obstacle - needs special handling with 1s delay
  const isFirstObstacle = engine.getState().obstacles.length === 0 &&
                          engine.getState().charactersCleared === 0;

  // Check if this character's obstacle was already pre-spawned
  const existingObstacle = engine.getState().obstacles
    .find(o => o.requiredLetter === char.toUpperCase());

  if (existingObstacle) {
    // Already spawned by previous character - just set as active
    engine.setActiveObstacle(existingObstacle);
    console.log(`[Runner] Found pre-spawned obstacle for "${char}"`);
  } else {
    // First character or pre-spawn didn't happen - spawn normally

    // Get actual morse duration from timing module (in seconds)
    const morseDuration = calculateCharacterDurationMs(char, levelWpm, 0) / 1000;

    // Select random approach time and obstacle size
    const approachTime = randomInRange(gameConfig.minApproachTime, gameConfig.maxApproachTime);
    const obstacleSize = selectObstacleSize(gameConfig);
    const obstacleDuration = getObstacleDuration(obstacleSize);

    if (isFirstObstacle) {
      // First obstacle: spawn with timeOffset to account for 1s delay
      // This allows obstacle to scroll smoothly during the delay period
      const timeOffset = 1.0; // 1 second before morse plays
      const normalSpawnDistance = (morseDuration + approachTime) * gameConfig.scrollSpeed;
      const offsetDistance = timeOffset * gameConfig.scrollSpeed;
      const adjustedSpawnDistance = normalSpawnDistance + offsetDistance;

      console.log('[Runner] Spawning first obstacle with 1s timeOffset');
      engine.spawnObstacle(
        char,
        adjustedSpawnDistance,
        obstacleDuration,
        morseDuration,
        approachTime,
        timeOffset
      );
    } else {
      // Normal spawn (not first obstacle, not pre-spawned)
      const spawnDistance = (morseDuration + approachTime) * gameConfig.scrollSpeed;

      engine.spawnObstacle(
        char,
        spawnDistance,
        obstacleDuration,
        morseDuration,
        approachTime
      );
    }
  }

  // Add delay before first obstacle's morse plays
  if (isFirstObstacle) {
    console.log('[Runner] Adding 1s delay before first morse plays');
    await ctx.clock.sleep(1000, signal);
  }

  // Log emission event (for statistics tracking)
  const emissionStart = ctx.clock.now();
  ctx.io.log({ type: 'emission', at: emissionStart, char });

  // Play morse audio at level's WPM
  await ctx.io.playChar(char, levelWpm);

  // Wait for player input (any valid morse character)
  const keyEvent = await ctx.input.takeUntil(
    (event) => isValidChar(event.key),
    signal
  );

  // Handle input
  const inputTime = ctx.clock.now();
  const inputKey = keyEvent.key.toUpperCase();
  engine.handleInput(inputKey);

  // Check if game over happened
  if (engine.getState().isGameOver) {
    // Log incorrect event (wrong character input led to game over)
    ctx.io.log({
      type: 'incorrect',
      at: inputTime,
      expected: char,
      got: inputKey
    });
    // Determine which key to use for restart/quit decision
    let actionKey: string;
    if (keyEvent.key === ' ' || keyEvent.key.toLowerCase() === 'q') {
      // The key that caused game over is Q or SPACE - use it
      actionKey = keyEvent.key;
    } else {
      // Different key caused game over - wait for explicit Q or SPACE
      const restartEvent = await ctx.input.takeUntil(
        (event) => event.key === ' ' || event.key.toLowerCase() === 'q',
        signal
      );
      actionKey = restartEvent.key;
    }

    // Handle the action
    if (actionKey.toLowerCase() === 'q') {
      ctx.requestQuit();
      return;
    }

    // Must be SPACE - reset and continue
    const startingLevel = config.startingLevel || 1;
    engine.reset(startingLevel);
  } else {
    // Not game over - character is now jumping
    // PRE-SPAWN NEXT OBSTACLE IMMEDIATELY (while still jumping)
    if (nextChar && nextChar !== ' ') {
      // Get jump duration that was just set
      const jumpDuration = engine.getState().character.jumpDuration!;

      // Calculate time until next character's morse plays
      const downtimeDuration = gameConfig.downtime;
      const timeUntilNextMorse = jumpDuration + downtimeDuration;

      // Calculate next character's parameters
      const nextMorseDuration = calculateCharacterDurationMs(nextChar, levelWpm, 0) / 1000;
      const nextApproachTime = randomInRange(gameConfig.minApproachTime, gameConfig.maxApproachTime);
      const nextObstacleSize = selectObstacleSize(gameConfig);
      const nextObstacleDuration = getObstacleDuration(nextObstacleSize);

      // Calculate adjusted spawn distance
      const normalSpawnDistance = (nextMorseDuration + nextApproachTime) * gameConfig.scrollSpeed;
      const offsetDistance = timeUntilNextMorse * gameConfig.scrollSpeed;
      const adjustedSpawnDistance = normalSpawnDistance + offsetDistance;

      // Pre-spawn next obstacle with time offset
      engine.spawnObstacle(
        nextChar,
        adjustedSpawnDistance,
        nextObstacleDuration,
        nextMorseDuration,
        nextApproachTime,
        timeUntilNextMorse
      );

      console.log(`[Runner] Pre-spawned obstacle for next char "${nextChar}", offset: ${timeUntilNextMorse.toFixed(3)}s`);
    }

    // Wait for jump to complete
    while (engine.getState().character.state === 'jumping') {
      await ctx.clock.sleep(50, signal);
    }

    // Successfully cleared obstacle - log correct event
    ctx.io.log({
      type: 'correct',
      at: inputTime,
      char,
      latencyMs: inputTime - emissionStart
    });
    // Increment count and check level progression
    engine.incrementCharacterCount();

    const state = engine.getState();
    const currentLevel = state.currentLevel;
    const charsCleared = state.charactersCleared;

    // Check if reached threshold for current level
    if (currentLevel <= 10 && charsCleared >= CHARACTERS_PER_LEVEL[currentLevel - 1]) {
      // Log level completion
      ctx.io.log({
        type: 'levelAdvanced',
        at: ctx.clock.now(),
        level: currentLevel
      });

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
        const nextLevel = currentLevel + 1;
        engine.advanceToLevel(nextLevel);
      }
    }
  }

  // Brief downtime before next character
  const downtimeDuration = gameConfig.downtime;
  await ctx.clock.sleep(downtimeDuration * 1000, signal);

  // Update remaining time
  ctx.updateRemainingTime(startTime, config);
  ctx.publish();
}
