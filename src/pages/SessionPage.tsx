/**
 * Session Page Container
 *
 * Unified entry point for all session modes. Handles three phases:
 * 1. Config phase - Configure session settings
 * 2. Active phase - Run the session
 * 3. Complete phase - View session results
 *
 * URL: /session/:mode
 * Reload behavior: Naturally resets to config phase (component state is lost)
 */

import { useState } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import type { SessionMode, SessionConfig } from '../core/types/domain';
import type { SourceContent } from '../features/sources';
import type { SessionStatisticsWithMaps } from '../core/types/statistics';
import { SessionConfigPage } from './SessionConfigPage';
import { ActiveSessionPage } from './ActiveSessionPage';
import { SessionCompletePage } from './SessionCompletePage';
import { useSettings } from '../features/settings/hooks/useSettings';

// Type guard for validating SessionMode
function isValidSessionMode(value: unknown): value is SessionMode {
  return value === 'practice' || value === 'listen' || value === 'live-copy' || value === 'head-copy' || value === 'runner';
}

type SessionPhase = 'config' | 'active' | 'complete';

export function SessionPage() {
  const { mode } = useParams<{ mode: string }>();
  const { settings, isLoading: settingsLoading } = useSettings();

  // Phase state management
  const [phase, setPhase] = useState<SessionPhase>('config');
  const [config, setConfig] = useState<SessionConfig | null>(null);
  const [sourceContent, setSourceContent] = useState<SourceContent | null>(null);
  const [statistics, setStatistics] = useState<SessionStatisticsWithMaps | null>(null);

  // Validate mode from URL
  if (!mode || !isValidSessionMode(mode)) {
    return <Navigate to="/" replace />;
  }

  // Wait for settings to load before rendering any child component
  // This prevents race conditions where components try to use settings before they're available
  if (settingsLoading || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="heading-2">Loading...</h2>
        </div>
      </div>
    );
  }

  // Phase 1: Config
  if (phase === 'config') {
    return (
      <SessionConfigPage
        mode={mode}
        onStart={(sessionConfig, content) => {
          setConfig(sessionConfig);
          setSourceContent(content);
          setPhase('active');
        }}
      />
    );
  }

  // Phase 2: Active
  if (phase === 'active' && config && sourceContent !== null) {
    return (
      <ActiveSessionPage
        config={config}
        sourceContent={sourceContent}
        onComplete={(stats) => {
          setStatistics(stats);
          setPhase('complete');
        }}
      />
    );
  }

  // Phase 3: Complete
  if (phase === 'complete' && statistics) {
    return (
      <SessionCompletePage
        statistics={statistics}
        onRestart={() => {
          // Reset to config phase
          setPhase('config');
          setConfig(null);
          setSourceContent(null);
          setStatistics(null);
        }}
      />
    );
  }

  // Fallback: If we're in an invalid state, go back to config
  return <SessionConfigPage mode={mode} onStart={(sessionConfig, content) => {
    setConfig(sessionConfig);
    setSourceContent(content);
    setPhase('active');
  }} />;
}
