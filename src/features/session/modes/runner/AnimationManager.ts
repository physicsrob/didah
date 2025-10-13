import type { AnimationConfig, CharacterState } from './types';
import { JUMP_FRAME_INDEX } from './constants';

/**
 * Manages sprite animation frames with time-based animation cycling.
 * Handles loading sprite images and providing the correct frame based on character state.
 */
export class AnimationManager {
  private frameBasePath: string;
  private frameCount: number;
  private animationFPS: number;
  private frameTime: number;
  private frames: HTMLImageElement[];
  private currentFrameIndex: number;
  private timeAccumulator: number;
  private isReady: boolean;
  private fallbackImage: HTMLImageElement | null;

  /**
   * Creates an AnimationManager instance.
   * @param config - Configuration object
   */
  constructor(config: AnimationConfig = {}) {
    this.frameBasePath = config.frameBasePath || '/assets/runner/frames/run_';
    this.frameCount = config.frameCount || 6;
    this.animationFPS = config.animationFPS || 24;
    this.frameTime = 1 / this.animationFPS; // Time per frame in seconds

    this.frames = [];
    this.currentFrameIndex = 0;
    this.timeAccumulator = 0;
    this.isReady = false;
    this.fallbackImage = null;
  }

  /**
   * Loads all animation frame images.
   * @returns Resolves when all images are loaded
   */
  async loadFrames(): Promise<void> {
    const loadPromises: Promise<HTMLImageElement>[] = [];

    for (let i = 1; i <= this.frameCount; i++) {
      const img = new Image();
      const promise = new Promise<HTMLImageElement>((resolve, reject) => {
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load frame: ${this.frameBasePath}${i}.png`));
      });
      img.src = `${this.frameBasePath}${i}.png`;
      loadPromises.push(promise);
    }

    try {
      this.frames = await Promise.all(loadPromises);
      this.isReady = true;
    } catch (error) {
      console.error('Error loading animation frames:', error);
      throw error;
    }
  }

  /**
   * Updates animation state based on elapsed time.
   * @param deltaTime - Time elapsed since last update in seconds
   */
  update(deltaTime: number): void {
    this.timeAccumulator += deltaTime;

    // Advance frame when enough time has accumulated
    while (this.timeAccumulator >= this.frameTime) {
      this.timeAccumulator -= this.frameTime;
      this.currentFrameIndex = (this.currentFrameIndex + 1) % this.frameCount;
    }
  }

  /**
   * Creates a fallback placeholder image for when frames aren't loaded.
   * @returns A canvas-based placeholder image
   */
  private createFallbackImage(): HTMLImageElement {
    const canvas = document.createElement('canvas');
    canvas.width = 249;  // CHARACTER_WIDTH
    canvas.height = 322; // CHARACTER_HEIGHT

    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Draw a magenta rectangle as a clear indicator something is wrong
      ctx.fillStyle = '#FF00FF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add text to indicate this is a fallback
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('LOADING', canvas.width / 2, canvas.height / 2);
    }

    const img = new Image();
    img.src = canvas.toDataURL();
    return img;
  }

  /**
   * Gets the current animation frame based on character state.
   * @param characterState - Current state ('running', 'jumping', or 'dead')
   * @returns The current sprite frame
   */
  getCurrentFrame(characterState: CharacterState): HTMLImageElement {
    if (!this.isReady || this.frames.length === 0) {
      console.warn('Animation frames not loaded, using fallback image');

      // Create fallback image on first use
      if (!this.fallbackImage) {
        this.fallbackImage = this.createFallbackImage();
      }
      return this.fallbackImage;
    }

    if (characterState === 'jumping') {
      // Return jump frame (run_5.png)
      return this.frames[JUMP_FRAME_INDEX];
    } else if (characterState === 'dead') {
      // TBD - for now return first frame
      return this.frames[0];
    } else {
      // Running animation
      return this.frames[this.currentFrameIndex];
    }
  }
}
