/**
 * Global registry for the runner game instance.
 * Allows the handler to access the game created by the UI hook.
 */

import type { Game } from './game/Game';

let gameInstance: Game | null = null;

export function registerRunnerGame(game: Game): void {
  gameInstance = game;
}

export function unregisterRunnerGame(): void {
  gameInstance = null;
}

export function getRunnerGame(): Game | null {
  return gameInstance;
}
