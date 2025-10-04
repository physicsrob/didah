/**
 * Shared types for mode system
 *
 * Defines the contracts that all session modes must implement.
 */

import type { SessionConfig, SessionMode } from '../../../../core/types/domain';
import type { IO, SessionSnapshot } from '../../runtime/io';
import type { InputBus } from '../../runtime/inputBus';
import type { Clock } from '../../runtime/clock';

/**
 * Dependencies available to mode handlers
 */
export interface ModeDeps {
  io: IO;
  input: InputBus;
  clock: Clock;
}

/**
 * Context passed to handlers for state updates
 * (Will be provided by sessionProgram.ts)
 */
export interface HandlerContext extends ModeDeps {
  snapshot: SessionSnapshot;
  updateSnapshot(updates: Partial<SessionSnapshot>): void;
  updateStats(outcome: 'correct' | 'incorrect' | 'timeout'): void;
  updateRemainingTime(startTime: number, config: SessionConfig): void;
  publish(): void;
  waitIfPaused(): Promise<void>;
}

/**
 * Context object for UI keyboard input hooks
 * Modes can destructure only the fields they need
 */
export interface UIContext {
  input: InputBus;
  sessionPhase: 'waiting' | 'countdown' | 'active';
  isPaused: boolean;
  snapshot: SessionSnapshot;
  updateSnapshot: (updates: Partial<SessionSnapshot>) => void;
  onPause?: () => void;
}

/**
 * Complete mode definition
 */
export interface ModeDefinition {
  id: SessionMode;
  displayName: string;
  description: string;

  // Config capabilities
  usesSpeedTier: boolean;
  usesFeedback: boolean;
  usesReplay: boolean;
  usesStats: boolean;

  // Core implementation
  handleCharacter(
    config: SessionConfig,
    char: string,
    startTime: number,
    ctx: HandlerContext,
    signal: AbortSignal
  ): Promise<void>;

  // UI components
  renderDisplay(props: { snapshot: SessionSnapshot; [key: string]: unknown }): React.ReactNode;

  // UI hooks (optional - modes without keyboard input can omit)
  useKeyboardInput?(context: UIContext): void;
}
