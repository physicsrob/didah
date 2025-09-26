import React, { useRef, useCallback, useEffect } from 'react';
import { AudioEngine } from '../features/session/services/audioEngine';
import { AudioContext } from './AudioContextType';
import { useSettings } from '../features/settings/hooks/useSettings';

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const isInitializedRef = useRef(false);
  const { settings } = useSettings();

  const getAudioEngine = useCallback(() => {
    if (!audioEngineRef.current) {
      if (!settings) {
        throw new Error('Settings must be loaded before AudioEngine can be created');
      }
      audioEngineRef.current = new AudioEngine({
        frequency: settings.frequency,
        volume: settings.volume,
        tone: settings.tone
      });
    }
    return audioEngineRef.current;
  }, [settings]);

  useEffect(() => {
    if (audioEngineRef.current && settings) {
      audioEngineRef.current.updateConfig({
        frequency: settings.frequency,
        volume: settings.volume,
        tone: settings.tone
      });
    }
  }, [settings]);

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