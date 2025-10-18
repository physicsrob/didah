/**
 * Tests for CharacterSource implementations
 */

import { describe, it, expect } from 'vitest';
import { ContinuousTextSource } from '../characterSources';

describe('ContinuousTextSource', () => {
  it('should skip characters not in the effective alphabet', () => {
    const text = "white's";
    // Alphabet without apostrophe (only letters)
    const alphabet = ['W', 'H', 'I', 'T', 'E', 'S'];

    const source = new ContinuousTextSource(text, alphabet);

    // Should emit: W, H, I, T, E, S (skipping the apostrophe)
    expect(source.next()).toBe('W');
    expect(source.next()).toBe('H');
    expect(source.next()).toBe('I');
    expect(source.next()).toBe('T');
    expect(source.next()).toBe('E');
    expect(source.next()).toBe('S');

    // Next should be a space (end of word)
    expect(source.next()).toBe(' ');
  });

  it('should handle multiple words with filtered punctuation', () => {
    const text = "don't can't";
    // Alphabet without apostrophe
    const alphabet = ['D', 'O', 'N', 'T', 'C', 'A'];

    const source = new ContinuousTextSource(text, alphabet);

    // Should emit: D, O, N, T (skipping apostrophe), space, C, A, N, T (skipping apostrophe)
    expect(source.next()).toBe('D');
    expect(source.next()).toBe('O');
    expect(source.next()).toBe('N');
    expect(source.next()).toBe('T');
    expect(source.next()).toBe(' '); // space between words
    expect(source.next()).toBe('C');
    expect(source.next()).toBe('A');
    expect(source.next()).toBe('N');
    expect(source.next()).toBe('T');
  });

  it('should include punctuation when it is in the alphabet', () => {
    const text = "it's";
    // Alphabet with apostrophe
    const alphabet = ['I', 'T', 'S', "'"];

    const source = new ContinuousTextSource(text, alphabet);

    // Should emit all characters including apostrophe
    expect(source.next()).toBe('I');
    expect(source.next()).toBe('T');
    expect(source.next()).toBe("'");
    expect(source.next()).toBe('S');
  });
});
