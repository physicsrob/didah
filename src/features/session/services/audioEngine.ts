/**
 * Audio Engine for Morse Code Generation
 *
 * Handles WebAudio tone generation for dit/dah patterns using shaped envelopes
 * to avoid clicks and provide clean audio output.
 */

import { getMorsePattern, type MorsePattern } from '../../../core/morse/alphabet.js';
import { wpmToDitMs, getSpacingMs } from '../../../core/morse/timing.js';

export interface AudioEngineConfig {
  frequency: number; // Tone frequency in Hz (typically 600-800 Hz)
  wpm: number;       // Words per minute for timing calculations
  volume: number;    // Volume (0.0 to 1.0)
}

export class AudioEngine {
  private audioContext: AudioContext | null = null;
  private currentGain: GainNode | null = null;
  private currentOscillator: OscillatorNode | null = null;
  private isPlaying = false;
  private playbackPromise: Promise<void> | null = null;

  private config: AudioEngineConfig;

  constructor(config: AudioEngineConfig) {
    this.config = config;
    // Initialize audio engine with provided config
  }

  /**
   * Initialize the audio context (must be called after user interaction)
   */
  async initialize(): Promise<void> {
    if (this.audioContext) return;

    try {
      // Check if we're in a browser environment
      const AudioContextClass =
        typeof window !== 'undefined'
          ? (window.AudioContext || (window as any).webkitAudioContext)
          : globalThis.AudioContext || (globalThis as any).webkitAudioContext;

      if (!AudioContextClass) {
        throw new Error('AudioContext not available in this environment');
      }

      this.audioContext = new AudioContextClass();

      // Resume context if suspended (required by some browsers)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
    } catch (error) {
      throw new Error(`Failed to initialize audio context: ${error}`);
    }
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AudioEngineConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Play a character's Morse pattern
   */
  async playCharacter(char: string): Promise<void> {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized');
    }

    const pattern = getMorsePattern(char);
    if (!pattern) {
      throw new Error(`No Morse pattern found for character: ${char}`);
    }

    await this.stop(); // Stop any current playback
    this.playbackPromise = this.playPattern(pattern);
    return this.playbackPromise;
  }

  /**
   * Stop current audio playback
   */
  async stop(): Promise<void> {
    if (this.currentOscillator) {
      this.currentOscillator.stop();
      this.currentOscillator = null;
    }

    if (this.currentGain) {
      this.currentGain.disconnect();
      this.currentGain = null;
    }

    this.isPlaying = false;

    // Wait for any pending playback to complete
    if (this.playbackPromise) {
      try {
        await this.playbackPromise;
      } catch {
        // Ignore errors from cancelled playback
      }
      this.playbackPromise = null;
    }
  }

  /**
   * Check if audio is currently playing
   */
  get playing(): boolean {
    return this.isPlaying;
  }

  /**
   * Dispose of the audio context
   */
  dispose(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  /**
   * Play a dit/dah pattern with proper timing and spacing
   */
  private async playPattern(pattern: MorsePattern): Promise<void> {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized');
    }

    this.isPlaying = true;

    try {
      const ditMs = wpmToDitMs(this.config.wpm);
      const { intraSymbolMs } = getSpacingMs(this.config.wpm);

      for (let i = 0; i < pattern.length; i++) {
        const element = pattern[i];
        const duration = element === '.' ? ditMs : ditMs * 3; // dah is 3x dit

        await this.playTone(duration);

        // Add intra-symbol spacing between elements (except after the last one)
        if (i < pattern.length - 1) {
          await this.silence(intraSymbolMs);
        }
      }
    } finally {
      this.isPlaying = false;
    }
  }

  /**
   * Play a tone for the specified duration with shaped envelope
   */
  private async playTone(durationMs: number): Promise<void> {
    if (!this.audioContext) return;

    return new Promise((resolve, reject) => {
      try {
        const startTime = this.audioContext!.currentTime;
        const duration = durationMs / 1000;

        // Create oscillator and gain node
        const oscillator = this.audioContext!.createOscillator();
        const gainNode = this.audioContext!.createGain();

        this.currentOscillator = oscillator;
        this.currentGain = gainNode;

        // Configure oscillator
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(this.config.frequency, startTime);

        // Configure gain with shaped envelope to avoid clicks
        const riseTime = Math.min(0.005, duration * 0.1); // 5ms or 10% of duration
        const fallTime = Math.min(0.005, duration * 0.1);

        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(this.config.volume, startTime + riseTime);
        gainNode.gain.setValueAtTime(this.config.volume, startTime + duration - fallTime);
        gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

        // Connect audio graph
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext!.destination);

        // Schedule playback
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);

        // Handle completion
        oscillator.onended = () => {
          oscillator.disconnect();
          gainNode.disconnect();
          if (this.currentOscillator === oscillator) {
            this.currentOscillator = null;
            this.currentGain = null;
          }
          resolve();
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Wait for a specified duration (silence)
   */
  private async silence(durationMs: number): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, durationMs);
    });
  }
}

/**
 * Default audio configuration
 */
export const DEFAULT_AUDIO_CONFIG: AudioEngineConfig = {
  frequency: 700, // Hz
  wpm: 5,        // Words per minute - slowed down for debugging
  volume: 0.3,   // 30% volume
};