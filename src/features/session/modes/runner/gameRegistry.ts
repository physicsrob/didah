/**
 * Global registry for the runner game instance.
 * Ensures only one game instance exists (singleton pattern).
 * Allows the handler to access the game created by the UI hook.
 */

import { Game } from './game/Game';

let gameInstance: Game | null = null;

/**
 * Gets or creates the runner game instance (singleton).
 * If an instance exists and is running, reuses it.
 * Otherwise, creates a new instance.
 */
export function getOrCreateRunnerGame(canvas: HTMLCanvasElement): Game {
  if (gameInstance) {
    console.log('[Registry] Reusing existing game instance');
    return gameInstance;
  }

  console.log('[Registry] Creating new game instance');
  const game = new Game(canvas);
  gameInstance = game;
  return game;
}

export function registerRunnerGame(game: Game): void {
  gameInstance = game;
}

export function unregisterRunnerGame(): void {
  console.log('[Registry] Unregistering game instance');
  if (gameInstance) {
    gameInstance.destroy();
  }
  gameInstance = null;
}

export function getRunnerGame(): Game | null {
  return gameInstance;
}
