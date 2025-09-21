import React, { createContext, useContext, useRef, useCallback } from 'react';
import { AudioEngine } from '../features/session/services/audioEngine';
import { DEFAULT_AUDIO_CONFIG } from '../core/config/defaults';

interface AudioContextValue {
  initializeAudio: () => Promise<boolean>;
  getAudioEngine: () => AudioEngine;
  isAudioReady: () => boolean;
}

const AudioContext = createContext<AudioContextValue | null>(null);

export function AudioProvider({ children }: { children: React.ReactNode }) {
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const isInitializedRef = useRef(false);

  const getAudioEngine = useCallback(() => {
    if (!audioEngineRef.current) {
      audioEngineRef.current = new AudioEngine(DEFAULT_AUDIO_CONFIG);
    }
    return audioEngineRef.current;
  }, []);

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

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within AudioProvider');
  }
  return context;
}