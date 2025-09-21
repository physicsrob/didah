/**
 * Audio Engine Integration Tests
 *
 * Tests that verify the audio engine can initialize and handle basic operations
 * without throwing errors. These are integration tests rather than unit tests
 * since audio functionality depends on WebAudio APIs.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AudioEngine } from '../features/session/services/audioEngine.js';
import { DEFAULT_AUDIO_CONFIG, DEFAULT_WPM } from '../core/config/defaults.js';

// Mock AudioContext for testing environment
class MockAudioContext {
  state = 'running';
  currentTime = 0;
  destination = {};

  createOscillator() {
    const osc = {
      type: 'sine',
      frequency: { setValueAtTime: () => {} },
      connect: () => {},
      disconnect: () => {},
      start: () => {},
      stop: () => {},
      onended: null as (() => void) | null,
    };

    // Simulate immediate completion for testing
    setTimeout(() => {
      if (osc.onended) {
        osc.onended();
      }
    }, 0);

    return osc;
  }

  createGain() {
    return {
      gain: {
        setValueAtTime: () => {},
        linearRampToValueAtTime: () => {},
      },
      connect: () => {},
      disconnect: () => {},
    };
  }

  resume() {
    return Promise.resolve();
  }

  close() {
    return Promise.resolve();
  }
}

// Mock the global AudioContext for Node.js environment
Object.defineProperty(globalThis, 'AudioContext', {
  writable: true,
  value: MockAudioContext,
});

// Also mock the webkit prefixed version
Object.defineProperty(globalThis, 'webkitAudioContext', {
  writable: true,
  value: MockAudioContext,
});

describe('AudioEngine Integration', () => {
  let audioEngine: AudioEngine;

  beforeEach(() => {
    audioEngine = new AudioEngine(DEFAULT_AUDIO_CONFIG);
  });

  afterEach(() => {
    audioEngine.dispose();
  });

  it('should initialize without throwing', async () => {
    await expect(audioEngine.initialize()).resolves.not.toThrow();
  });

  it('should handle configuration updates', () => {
    expect(() => {
      audioEngine.updateConfig({ frequency: 800, volume: 0.5 });
    }).not.toThrow();
  });

  it('should throw error when playing character without initialization', async () => {
    await expect(audioEngine.playCharacter('A', DEFAULT_WPM)).rejects.toThrow('Audio context not initialized');
  });

  it('should handle known characters after initialization', async () => {
    await audioEngine.initialize();

    // These should not throw
    await expect(audioEngine.playCharacter('A', DEFAULT_WPM)).resolves.not.toThrow();
    await expect(audioEngine.playCharacter('E', DEFAULT_WPM)).resolves.not.toThrow();
    await expect(audioEngine.playCharacter('5', DEFAULT_WPM)).resolves.not.toThrow();
    await expect(audioEngine.playCharacter('.', DEFAULT_WPM)).resolves.not.toThrow();
  });

  it('should throw error for unknown characters', async () => {
    await audioEngine.initialize();
    await expect(audioEngine.playCharacter('~', DEFAULT_WPM)).rejects.toThrow('No Morse pattern found for character: ~');
  });

  it('should handle stop without throwing', async () => {
    await audioEngine.initialize();
    await expect(audioEngine.stop()).resolves.not.toThrow();
  });

  it('should report playing status correctly', async () => {
    await audioEngine.initialize();

    expect(audioEngine.playing).toBe(false);

    // Note: In the mock environment, playing status won't change realistically
    // This test mainly ensures the property exists and is accessible
    expect(typeof audioEngine.playing).toBe('boolean');
  });

  it('should handle dispose without throwing', () => {
    expect(() => audioEngine.dispose()).not.toThrow();
  });

  it('should handle case insensitive characters', async () => {
    await audioEngine.initialize();

    // Should work with both cases
    await expect(audioEngine.playCharacter('a', DEFAULT_WPM)).resolves.not.toThrow();
    await expect(audioEngine.playCharacter('A', DEFAULT_WPM)).resolves.not.toThrow();
  });
});