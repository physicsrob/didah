import type { GameState, Obstacle, Character } from '../game/types';
import { ObstacleSize } from '../game/types';
import {
  CHARACTER_WIDTH,
  CHARACTER_HEIGHT,
  CHARACTER_X,
  GROUND_BOTTOM,
  GROUND_Y,
  LOGICAL_WIDTH,
  LOGICAL_HEIGHT
} from '../game/constants';
import { AnimationManager } from './AnimationManager';

/**
 * Handles all canvas rendering.
 * Canvas is always rendered at logical resolution (1200x600),
 * and CSS handles scaling to display size.
 */
interface Cloud {
  x: number;
  y: number;
  scale: number;
}

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private animationManager: AnimationManager;
  private rockImage: HTMLImageElement;
  private dirtImage: HTMLImageElement;
  private cloudImage: HTMLImageElement;
  private clouds: Cloud[];
  private readonly PARALLAX_SPEED = 0.3; // Clouds move at 30% of ground speed
  private readonly CLOUD_SPACING = 400; // Average spacing between clouds

  /**
   * Creates a new CanvasRenderer.
   * @param canvas - The canvas to render to
   * @param animationManager - The animation manager for sprites
   */
  constructor(canvas: HTMLCanvasElement, animationManager: AnimationManager) {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context from canvas');
    }
    this.ctx = ctx;
    this.animationManager = animationManager;

    // Load rock image for obstacles
    this.rockImage = new Image();
    this.rockImage.src = '/assets/runner/rock.png';

    // Load dirt image for ground
    this.dirtImage = new Image();
    this.dirtImage.src = '/assets/runner/dirt.png';

    // Load cloud image
    this.cloudImage = new Image();
    this.cloudImage.src = '/assets/runner/cloud.png';

    // Initialize random clouds
    this.clouds = this.generateClouds();

    // Disable image smoothing for pixel art
    this.ctx.imageSmoothingEnabled = false;
  }

  /**
   * Generates random cloud positions across the sky.
   */
  private generateClouds(): Cloud[] {
    const clouds: Cloud[] = [];
    const cloudCount = 8; // Number of clouds

    for (let i = 0; i < cloudCount; i++) {
      clouds.push({
        x: i * this.CLOUD_SPACING + Math.random() * 200 - 100,
        y: Math.random() * (GROUND_Y - 100), // Keep clouds in sky, with margin
        scale: 0.5 + Math.random() * 0.5 // Random scale 0.5-1.0
      });
    }

    return clouds;
  }

  /**
   * Clears the canvas and fills with background color.
   */
  private clear(): void {
    // Sky blue background
    this.ctx.fillStyle = '#87CEEB';
    this.ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  }

  /**
   * Draws parallax scrolling clouds.
   * @param scrollOffset - Current scroll offset from game state
   */
  private drawClouds(scrollOffset: number): void {
    if (!this.cloudImage.complete) {
      return; // Cloud image not loaded yet
    }

    const parallaxOffset = scrollOffset * this.PARALLAX_SPEED;
    const cloudLoopWidth = this.CLOUD_SPACING * this.clouds.length;

    for (const cloud of this.clouds) {
      // Calculate cloud position with parallax
      let cloudX = cloud.x - (parallaxOffset % cloudLoopWidth);

      // Wrap clouds around
      while (cloudX < -200) {
        cloudX += cloudLoopWidth;
      }
      while (cloudX > LOGICAL_WIDTH + 200) {
        cloudX -= cloudLoopWidth;
      }

      // Draw cloud with scaling
      const scaledWidth = this.cloudImage.width * cloud.scale;
      const scaledHeight = this.cloudImage.height * cloud.scale;

      this.ctx.globalAlpha = 0.8; // Slightly transparent for depth effect
      this.ctx.drawImage(
        this.cloudImage,
        cloudX,
        cloud.y,
        scaledWidth,
        scaledHeight
      );
      this.ctx.globalAlpha = 1.0; // Reset alpha
    }
  }

  /**
   * Draws the scrolling ground.
   * @param scrollOffset - Current scroll offset for ground pattern
   */
  private drawGround(scrollOffset: number): void {
    if (!this.dirtImage.complete) {
      // Image not loaded yet, draw placeholder
      this.ctx.fillStyle = '#3D9140';
      this.ctx.fillRect(0, GROUND_BOTTOM, LOGICAL_WIDTH, LOGICAL_HEIGHT - GROUND_BOTTOM);
      return;
    }

    const groundHeight = LOGICAL_HEIGHT - GROUND_BOTTOM;

    // Calculate scaled dimensions (preserve aspect ratio)
    const scale = groundHeight / this.dirtImage.height;
    const scaledWidth = this.dirtImage.width * scale;

    // Calculate offset for scrolling
    const offset = scrollOffset % (scaledWidth * 2); // *2 because pattern repeats every 2 tiles

    // Draw tiled dirt images
    let tileIndex = 0;
    for (let x = -offset; x < LOGICAL_WIDTH + scaledWidth; x += scaledWidth) {
      const isMirrored = tileIndex % 2 === 1;

      this.ctx.save();

      if (isMirrored) {
        // Flip horizontally
        this.ctx.translate(x + scaledWidth, 0);
        this.ctx.scale(-1, 1);
        this.ctx.drawImage(this.dirtImage, 0, GROUND_BOTTOM, scaledWidth, groundHeight);
      } else {
        this.ctx.drawImage(this.dirtImage, x, GROUND_BOTTOM, scaledWidth, groundHeight);
      }

      this.ctx.restore();
      tileIndex++;
    }
  }

  /**
   * Draws all obstacles.
   * @param obstacles - Array of obstacle objects
   */
  private drawObstacles(obstacles: Obstacle[]): void {
    // Log first time we try to draw obstacles
    if (obstacles.length > 0 && !this.rockImage.complete) {
      console.warn('[RENDER] ⚠️  Trying to draw obstacles but rock image not loaded yet!');
    }

    for (const obstacle of obstacles) {
      if (obstacle.size === ObstacleSize.LARGE) {
        // Draw pit extending from ground to bottom of canvas for large obstacles
        const pitHeight = LOGICAL_HEIGHT - GROUND_BOTTOM;
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(
          obstacle.x,
          GROUND_BOTTOM,
          obstacle.width,
          pitHeight
        );

        // Add subtle shadow at top edge to enhance pit appearance
        const gradient = this.ctx.createLinearGradient(
          obstacle.x,
          GROUND_BOTTOM,
          obstacle.x,
          GROUND_BOTTOM + 20
        );
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0.6)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(
          obstacle.x,
          GROUND_BOTTOM,
          obstacle.width,
          20
        );
      } else {
        // Draw rock image above ground for small/medium obstacles
        if (this.rockImage.complete) {
          this.ctx.drawImage(
            this.rockImage,
            obstacle.x,
            GROUND_BOTTOM - obstacle.height,
            obstacle.width,
            obstacle.height
          );
        } else {
          // Fallback: draw a red rectangle if image not loaded
          this.ctx.fillStyle = '#ff0000';
          this.ctx.fillRect(
            obstacle.x,
            GROUND_BOTTOM - obstacle.height,
            obstacle.width,
            obstacle.height
          );
        }
      }
    }
  }

  /**
   * Draws the character sprite.
   * @param character - Character state object
   */
  private drawCharacter(character: Character): void {
    const frame = this.animationManager.getCurrentFrame(character.state);

    // Draw character at its current position
    this.ctx.drawImage(
      frame,
      CHARACTER_X,
      character.y,
      CHARACTER_WIDTH,
      CHARACTER_HEIGHT
    );
  }


  /**
   * Draws the game over overlay.
   */
  private drawGameOver(failedCharacter: string | null): void {
    // Semi-transparent overlay
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    // Game over text
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '48px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Game Over', LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 - 80);

    // Show failed character if available
    if (failedCharacter) {
      this.ctx.fillStyle = '#ff6b6b';
      this.ctx.font = '36px Arial';
      this.ctx.fillText(`You missed: ${failedCharacter}`, LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 - 20);
    }

    this.ctx.fillStyle = '#fff';
    this.ctx.font = '24px Arial';
    this.ctx.fillText('Press SPACE to try again', LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 + 40);
    this.ctx.fillText('Press Q to exit', LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 + 75);
  }

  /**
   * Draws morse playback indicator.
   * @param letter - The letter being played
   */
  private drawMorsePlayback(letter: string): void {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    this.ctx.fillRect(LOGICAL_WIDTH / 2 - 100, 50, 200, 60);

    this.ctx.fillStyle = '#fff';
    this.ctx.font = '36px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`Playing: ${letter}`, LOGICAL_WIDTH / 2, 90);
  }

  /**
   * Draws the level indicator in the top right corner.
   * @param level - Current level number
   */
  private drawLevelIndicator(level: number): void {
    this.ctx.fillStyle = '#000';
    this.ctx.font = '24px Arial';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`Level: ${level}`, LOGICAL_WIDTH - 20, 35);
  }

  /**
   * Draws the game complete overlay.
   */
  private drawGameComplete(): void {
    // Semi-transparent overlay
    this.ctx.fillStyle = 'rgba(0, 100, 0, 0.8)';
    this.ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    // Game complete text
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '48px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Game Complete!', LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 - 20);

    this.ctx.font = '28px Arial';
    this.ctx.fillStyle = '#4ade80';
    this.ctx.fillText('All 10 levels cleared!', LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 + 30);

    this.ctx.fillStyle = '#fff';
    this.ctx.font = '24px Arial';
    this.ctx.fillText('Press SPACE to play again', LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 + 75);
    this.ctx.fillText('Press Q to exit', LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2 + 110);
  }

  /**
   * Main render method - draws the complete game state.
   * @param gameState - Current game state
   * @param morsePlayback - Optional morse playback info { letter: string }
   */
  render(gameState: GameState, morsePlayback?: { letter: string }): void {
    // Log rendering state every 60 frames (approx 1 second at 60fps)
    if (Math.random() < 0.016) {
      console.log(`[RENDER] time: ${gameState.currentTime.toFixed(3)}s, obstacles: ${gameState.obstacles.length}, isGameOver: ${gameState.isGameOver}, char state: ${gameState.character.state}`);
      if (gameState.obstacles.length > 0) {
        console.log(`  Obstacles:`, gameState.obstacles.map(o => `"${o.requiredLetter}" at x=${o.x.toFixed(1)}`).join(', '));
      }
    }

    // Clear canvas
    this.clear();

    // Draw parallax clouds in background
    this.drawClouds(gameState.scrollOffset);

    // Draw all game elements (canvas is at logical resolution)
    this.drawGround(gameState.scrollOffset);
    this.drawObstacles(gameState.obstacles);
    this.drawCharacter(gameState.character);

    // Draw level indicator
    this.drawLevelIndicator(gameState.currentLevel);

    // Draw morse playback indicator
    if (morsePlayback) {
      this.drawMorsePlayback(morsePlayback.letter);
    }

    // Draw game over overlay
    if (gameState.isGameOver) {
      this.drawGameOver(gameState.failedCharacter);
    }

    // Draw game complete overlay
    if (gameState.isGameComplete) {
      this.drawGameComplete();
    }
  }

  /**
   * Cleans up resources (no-op as we removed resize listener).
   */
  destroy(): void {
    // No cleanup needed
  }
}
