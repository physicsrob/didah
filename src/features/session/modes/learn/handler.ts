/**
 * Learn Mode Handler (Phase 0 Stub)
 *
 * This is a placeholder implementation for Phase 0.
 * Actual implementation will be done in Phase 3.
 */

import type { SessionConfig } from '../../../../core/types/domain';
import type { HandlerContext } from '../shared/types';

export async function handleLearnCharacter(
  _config: SessionConfig,
  _char: string,
  _startTime: number,
  _ctx: HandlerContext,
  _signal: AbortSignal,
  _nextChar: string | null,
  _hasSpaceAfter: boolean
): Promise<void> {
  // Stub implementation - will be implemented in Phase 3
  throw new Error('Learn Mode handler not yet implemented');
}
