import { createContext } from 'react';
import type { AudioEngine } from '../features/session/services/audioEngine';

export interface AudioContextValue {
  initializeAudio: () => Promise<boolean>;
  getAudioEngine: () => AudioEngine;
  isAudioReady: () => boolean;
}

export const AudioContext = createContext<AudioContextValue | null>(null);