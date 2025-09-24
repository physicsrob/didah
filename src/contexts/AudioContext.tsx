import React, { useRef, useCallback, useEffect } from 'react';
import { AudioEngine } from '../features/session/services/audioEngine';
import { DEFAULT_AUDIO_CONFIG } from '../core/config/defaults';
import { AudioContext } from './AudioContextType';
import { useSettings } from '../features/settings/hooks/useSettings';

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const isInitializedRef = useRef(false);
  const { settings } = useSettings();

  const getAudioEngine = useCallback(() => {
    if (!audioEngineRef.current) {
      // Use frequency from settings if available, otherwise use default
      const frequency = settings?.frequency || DEFAULT_AUDIO_CONFIG.frequency;
      audioEngineRef.current = new AudioEngine({
        ...DEFAULT_AUDIO_CONFIG,
        frequency
      });
    }
    return audioEngineRef.current;
  }, [settings?.frequency]);

  // Update audio engine frequency when settings change
  useEffect(() => {
    if (audioEngineRef.current && settings?.frequency) {
      audioEngineRef.current.updateConfig({
        frequency: settings.frequency,
        volume: DEFAULT_AUDIO_CONFIG.volume
      });
    }
  }, [settings?.frequency]);

  const initializeAudio = useCallback(async (): Promise<boolean> => {
    try {
      const engine = getAudioEngine();

      if (!isInitializedRef.current) {
        await engine.initialize();
        isInitializedRef.current = true;
      }

      return true;
    } catch (error) {
      console.error('[AudioContext] Failed to initialize audio:', error);
      return false;
    }
  }, [getAudioEngine]);

  const isAudioReady = useCallback(() => {
    return isInitializedRef.current;
  }, []);

  return (
    <AudioContext.Provider value={{ initializeAudio, getAudioEngine, isAudioReady }}>
      {children}
    </AudioContext.Provider>
  );
}