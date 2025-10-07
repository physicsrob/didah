import { GameEngine } from './GameEngine';
import { AnimationManager } from '../rendering/AnimationManager';
import { CanvasRenderer } from '../rendering/CanvasRenderer';
import {
  LOGICAL_WIDTH,
  LOGICAL_HEIGHT
} from './constants';

// Maximum delta time to prevent large jumps (e.g., first frame or tab switching)
const MAX_DELTA_TIME = 0.1;

/**
 * Main game class that coordinates rendering and physics.
 * Character handling is managed by the session mode handler.
 */
export class Game {
  private canvas: HTMLCanvasElement;
  private engine: GameEngine;
  private animationManager: AnimationManager;
  private renderer: CanvasRenderer;
  private lastTime: number;
  private running: boolean;

  /**
   * Creates a new Game instance.
   * @param canvas - The canvas element to render to
   */
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.engine = new GameEngine();
    this.animationManager = new AnimationManager();
    this.renderer = new CanvasRenderer(canvas, this.animationManager);
    this.lastTime = 0;
    this.running = false;
  }

  /**
   * Get the game engine for external control.
   */
  getEngine(): GameEngine {
    return this.engine;
  }

  /**
   * Initializes the game by loading assets and starting the game loop.
   * @returns Resolves when game is ready and started
   */
  async start(): Promise<void> {
    try {
      // Show loading screen
      this.showLoadingScreen();

      // Load all assets
      await this.animationManager.loadFrames();

      // Assets loaded, start game loop
      this.startGameLoop();
    } catch (error) {
      console.error('Failed to start game:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.showErrorScreen(errorMessage);
    }
  }

  /**
   * Starts the game loop.
   */
  private startGameLoop(): void {
    this.running = true;
    this.lastTime = 0;
    requestAnimationFrame((t) => this.loop(t));
  }

  /**
   * Main game loop - updates and renders the game state.
   * @param currentTime - Current timestamp from requestAnimationFrame
   */
  private loop(currentTime: number): void {
    if (!this.running) return;

    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Clamp delta time to prevent large jumps (first frame, tab switching, debugging)
    const clampedDeltaTime = Math.min(deltaTime, MAX_DELTA_TIME);

    // Only update if we have a reasonable delta time
    if (clampedDeltaTime > 0) {
      // Update game physics and animation
      this.engine.update(clampedDeltaTime);
      this.animationManager.update(clampedDeltaTime);

      // Render current state
      this.renderer.render(this.engine.getState());
    }

    // Continue loop
    requestAnimationFrame((t) => this.loop(t));
  }

  /**
   * Cleans up all game resources.
   */
  destroy(): void {
    this.running = false;
    if (this.renderer) {
      this.renderer.destroy();
    }
  }

  /**
   * Displays a loading screen while assets are being loaded.
   */
  private showLoadingScreen(): void {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#87CEEB';
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    ctx.fillStyle = '#000';
    ctx.font = '32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Loading...', LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2);
  }

  /**
   * Displays an error screen if loading fails.
   * @param message - Error message to display
   */
  private showErrorScreen(message: string): void {
    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#f44';
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    ctx.fillStyle = '#fff';
    ctx.font = '32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Error Loading Game', LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 - 20);

    ctx.font = '16px Arial';
    ctx.fillText(message, LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 + 20);
  }
}
