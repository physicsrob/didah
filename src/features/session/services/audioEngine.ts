/**
 * Audio Engine for Morse Code Generation
 *
 * Handles WebAudio tone generation for dit/dah patterns using shaped envelopes
 * to avoid clicks and provide clean audio output.
 */

import { getMorsePattern, type MorsePattern } from '../../../core/morse/alphabet.js';
import { wpmToDitMs, getSpacingMs } from '../../../core/morse/timing.js';
import type { ToneSetting } from '../../../core/types/domain.js';

export interface AudioEngineConfig {
  frequency: number;
  volume: number;
  tone: ToneSetting;
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
          ? (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
          : globalThis.AudioContext || (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

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
  async playCharacter(char: string, wpm: number, extraWordSpacing: number = 0): Promise<void> {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized');
    }

    // Handle space character as a silent pause (4 dits + extra word spacing)
    // This adds to the standard 3-dit inter-character spacing for 7 total (or more with extraWordSpacing)
    // Each extra word spacing adds 7 dits (one full space character worth)
    if (char === ' ') {
      const ditMs = wpmToDitMs(wpm);
      await this.stop(); // Stop any current playback
      this.playbackPromise = this.silence(ditMs * (4 + (extraWordSpacing * 7)));
      return this.playbackPromise;
    }

    const pattern = getMorsePattern(char);
    if (!pattern) {
      throw new Error(`No Morse pattern found for character: ${char}`);
    }

    await this.stop(); // Stop any current playback
    this.playbackPromise = this.playPattern(pattern, wpm);
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
  private async playPattern(pattern: MorsePattern, wpm: number): Promise<void> {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized');
    }

    this.isPlaying = true;

    try {
      const ditMs = wpmToDitMs(wpm);
      const { intraSymbolMs } = getSpacingMs(wpm);

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
   * Create a distortion curve for the WaveShaperNode
   */
  private createDistortionCurve(amount: number): Float32Array {
    const samples = 44100;
    const curve = new Float32Array(samples);

    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = Math.tanh(x * amount) / amount;
    }
    return curve;
  }

  /**
   * Get envelope timings based on tone setting
   */
  private getEnvelopeTimings(): { riseTime: number; fallTime: number } {
    switch (this.config.tone) {
      case 'soft':
        return { riseTime: 0.025, fallTime: 0.025 };
      case 'hard':
        return { riseTime: 0.001, fallTime: 0.001 };
      case 'normal':
      default:
        return { riseTime: 0.005, fallTime: 0.005 };
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

        const oscillator = this.audioContext!.createOscillator();
        const gainNode = this.audioContext!.createGain();

        this.currentOscillator = oscillator;
        this.currentGain = gainNode;

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(this.config.frequency, startTime);

        const { riseTime, fallTime } = this.getEnvelopeTimings();

        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(this.config.volume, startTime + riseTime);
        gainNode.gain.setValueAtTime(this.config.volume, startTime + duration - fallTime);
        gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

        oscillator.connect(gainNode);

        if (this.config.tone === 'hard') {
          const shaper = this.audioContext!.createWaveShaper();
          shaper.curve = this.createDistortionCurve(3.0);
          gainNode.connect(shaper);
          shaper.connect(this.audioContext!.destination);
        } else {
          gainNode.connect(this.audioContext!.destination);
        }

        oscillator.start(startTime);
        oscillator.stop(startTime + duration);

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

// Default audio config moved to src/core/config/defaults.ts