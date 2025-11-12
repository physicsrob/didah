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
  private scheduledNodes: Array<{
    oscillator: OscillatorNode;
    gain: GainNode;
  }> = [];
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
  async playCharacter(char: string, wpm: number, extraWordSpacing: number): Promise<void> {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized');
    }

    // Resume context if suspended (iOS Safari requirement)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // Handle space and newline characters as a silent pause (4 dits + extra word spacing)
    // This adds to the standard 3-dit inter-character spacing for 7 total (or more with extraWordSpacing)
    // Each extra word spacing adds 7 dits (one full space character worth)
    if (char === ' ' || char === '\n') {
      const ditMs = wpmToDitMs(wpm);
      await this.stop(); // Stop any current playback
      this.playbackPromise = new Promise(resolve => {
        setTimeout(resolve, ditMs * (4 + (extraWordSpacing * 7)));
      });
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
    // Stop and disconnect all scheduled oscillators
    for (const { oscillator, gain } of this.scheduledNodes) {
      try {
        oscillator.stop();
        oscillator.disconnect();
        gain.disconnect();
      } catch {
        // Oscillator may already be stopped
      }
    }
    this.scheduledNodes = [];

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
   * Get the audio context
   */
  getAudioContext(): AudioContext | null {
    return this.audioContext;
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
   * Pre-schedules all tones in WebAudio timeline for precise timing
   */
  private async playPattern(pattern: MorsePattern, wpm: number): Promise<void> {
    if (!this.audioContext) {
      throw new Error('Audio context not initialized');
    }

    this.isPlaying = true;

    try {
      const ditMs = wpmToDitMs(wpm);
      const { intraSymbolMs } = getSpacingMs(wpm);

      // Calculate timing for all elements upfront
      let currentTimeOffset = 0;
      const schedule: Array<{ startTime: number; duration: number }> = [];

      for (let i = 0; i < pattern.length; i++) {
        const element = pattern[i];
        const durationMs = element === '.' ? ditMs : ditMs * 3; // dah is 3x dit

        schedule.push({
          startTime: currentTimeOffset / 1000, // Convert to seconds
          duration: durationMs / 1000
        });

        currentTimeOffset += durationMs;

        // Add spacing after each element except the last
        if (i < pattern.length - 1) {
          currentTimeOffset += intraSymbolMs;
        }
      }

      // Schedule all tones at precise times relative to now
      const baseTime = this.audioContext.currentTime;
      const promises: Promise<void>[] = [];

      for (const { startTime, duration } of schedule) {
        promises.push(this.playToneAtTime(baseTime + startTime, duration));
      }

      // Wait for all tones to complete
      await Promise.all(promises);

    } finally {
      this.isPlaying = false;
      this.scheduledNodes = [];
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
   * Get envelope timings based on tone setting and duration
   * Scales envelope times to prevent cutting off short tones
   */
  private getEnvelopeTimings(durationMs: number): { riseTime: number; fallTime: number } {
    const duration = durationMs / 1000; // Convert to seconds

    switch (this.config.tone) {
      case 'soft': {
        // Use 15% of duration for rise/fall, but cap at 25ms each
        const softTime = Math.min(0.025, duration * 0.15);
        return { riseTime: softTime, fallTime: softTime };
      }
      case 'hard':
        return { riseTime: 0.001, fallTime: 0.001 };
      case 'normal':
      default: {
        // Use 10% of duration for rise/fall, but cap at 5ms each
        const normalTime = Math.min(0.005, duration * 0.10);
        return { riseTime: normalTime, fallTime: normalTime };
      }
    }
  }

  /**
   * Play a tone at a specific time with shaped envelope
   */
  private async playToneAtTime(startTime: number, durationSeconds: number): Promise<void> {
    if (!this.audioContext) return;

    return new Promise((resolve, reject) => {
      try {
        const oscillator = this.audioContext!.createOscillator();
        const gainNode = this.audioContext!.createGain();

        // Track nodes for cleanup
        this.scheduledNodes.push({ oscillator, gain: gainNode });

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(this.config.frequency, startTime);

        const { riseTime, fallTime } = this.getEnvelopeTimings(durationSeconds * 1000);

        // All timing scheduled relative to startTime (not currentTime)
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(this.config.volume, startTime + riseTime);
        gainNode.gain.setValueAtTime(this.config.volume, startTime + durationSeconds - fallTime);
        gainNode.gain.linearRampToValueAtTime(0, startTime + durationSeconds);

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
        oscillator.stop(startTime + durationSeconds);

        oscillator.onended = () => {
          oscillator.disconnect();
          gainNode.disconnect();
          resolve();
        };

      } catch (error) {
        reject(error);
      }
    });
  }

}

// Default audio config moved to src/core/config/defaults.ts