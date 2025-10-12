/**
 * Runner Mode - UI Components
 *
 * React wrapper for the canvas-based runner game.
 */

import { useEffect, useRef } from 'react';
import type { SessionSnapshot } from '../../runtime/io';
import type { UIContext } from '../shared/types';
import type { Game } from './game/Game';
import { getOrCreateRunnerGame, unregisterRunnerGame } from './gameRegistry';
import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from './game/constants';

/**
 * Display component for runner mode.
 * Just renders the canvas - game initialization happens in useKeyboardInput
 * Breaks out of normal container to use full viewport.
 */
export function RunnerDisplay(_props: { snapshot: SessionSnapshot }) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#222',
      zIndex: 1
    }}>
      <canvas
        id="runner-canvas"
        style={{
          border: '2px solid #fff',
          maxWidth: '95vw',
          maxHeight: '95vh',
          imageRendering: 'pixelated',
        }}
      />
    </div>
  );
}

/**
 * Resizes the canvas to fit the viewport while maintaining aspect ratio.
 * @param canvas - The canvas element to resize
 */
function resizeCanvas(canvas: HTMLCanvasElement): void {
  const targetAspect = LOGICAL_WIDTH / LOGICAL_HEIGHT; // 2:1 aspect ratio

  // Get available viewport space (with some padding)
  const maxWidth = window.innerWidth * 0.95;
  const maxHeight = window.innerHeight * 0.95;

  // Calculate dimensions that fit while maintaining aspect ratio
  let width = maxWidth;
  let height = width / targetAspect;

  if (height > maxHeight) {
    height = maxHeight;
    width = height * targetAspect;
  }

  // Set canvas internal resolution (always logical size for consistent rendering)
  canvas.width = LOGICAL_WIDTH;
  canvas.height = LOGICAL_HEIGHT;

  // Set canvas display size via CSS
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
}

/**
 * Keyboard input hook for runner mode.
 * Initializes and manages the game instance, and handles keyboard input.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useRunnerInput(context: UIContext): void {
  const gameRef = useRef<Game | null>(null);
  const { input, sessionPhase, isPaused, onPause, config } = context;

  // Game initialization effect - runs when session becomes active
  useEffect(() => {
    // Only initialize when session becomes active
    if (sessionPhase !== 'active') {
      return;
    }

    // Don't recreate if already exists
    if (gameRef.current) {
      return;
    }

    const canvas = document.getElementById('runner-canvas') as HTMLCanvasElement | null;

    if (!canvas) {
      console.error('[Runner] Canvas element not found!');
      return;
    }

    // Set canvas size
    resizeCanvas(canvas);

    // Get or create game (singleton)
    const game = getOrCreateRunnerGame(canvas);
    gameRef.current = game;

    // Start game (idempotent - safe to call multiple times)
    const startingLevel = config.startingLevel || 1;
    game.start().then(() => {
      // Set starting level if specified in config
      if (startingLevel > 1) {
        game.getEngine().advanceToLevel(startingLevel);
      }
    }).catch((error) => {
      console.error('Failed to start runner game:', error);
    });

    // Handle window resize
    const handleResize = () => {
      resizeCanvas(canvas);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup only resize listener (not the game)
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [sessionPhase, config.startingLevel]);

  // Game cleanup effect - only runs on unmount
  useEffect(() => {
    return () => {
      unregisterRunnerGame();
      if (gameRef.current) {
        gameRef.current.destroy();
        gameRef.current = null;
      }
    };
  }, []);

  // Sync pause state with game
  useEffect(() => {
    if (gameRef.current) {
      gameRef.current.setPaused(isPaused);
    }
  }, [isPaused]);

  // Keyboard input effect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle pause
      if (e.key === 'Escape' && onPause && sessionPhase === 'active') {
        onPause();
        return;
      }

      // Only capture input during active session
      if (sessionPhase === 'active' && !isPaused && e.key.length === 1) {
        input.push({ at: performance.now(), key: e.key });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [input, sessionPhase, isPaused, onPause]);
}
