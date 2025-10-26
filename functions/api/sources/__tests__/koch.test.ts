import { describe, it, expect } from 'vitest';
import { onRequestGet } from '../koch';
import { LEARN_SESSION_LENGTH, MIN_NEW_CHAR_DRILLS } from '../../../shared/koch';

// Test context type
type TestContext = {
  params: { id: string };
};

describe('Koch Source Endpoint', () => {
  it('should return 400 for invalid source ID format', async () => {
    const context: TestContext = {
      params: { id: 'koch-invalid' },
    };

    const response = await onRequestGet(context as Parameters<typeof onRequestGet>[0]);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('Invalid Koch source ID format');
  });

  it('should return 400 for invalid lesson (0)', async () => {
    const context: TestContext = {
      params: { id: 'koch-lesson-0' },
    };

    const response = await onRequestGet(context as Parameters<typeof onRequestGet>[0]);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('Invalid lesson: 0');
  });

  it('should return 400 for invalid lesson (21)', async () => {
    const context: TestContext = {
      params: { id: 'koch-lesson-21' },
    };

    const response = await onRequestGet(context as Parameters<typeof onRequestGet>[0]);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('Invalid lesson: 21');
  });

  it('should return correct sequence for lesson 1', async () => {
    const context: TestContext = {
      params: { id: 'koch-lesson-1' },
    };

    const response = await onRequestGet(context as Parameters<typeof onRequestGet>[0]);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBe('koch-lesson-1');
    expect(typeof body.text).toBe('string');

    // Split into individual characters
    const chars = body.text.split('');
    expect(chars).toHaveLength(LEARN_SESSION_LENGTH);

    // All characters should be K or M (Lesson 1)
    for (const char of chars) {
      expect(['K', 'M']).toContain(char);
    }

    // Each new character should appear at least MIN_NEW_CHAR_DRILLS times
    const kCount = chars.filter(c => c === 'K').length;
    const mCount = chars.filter(c => c === 'M').length;

    expect(kCount).toBeGreaterThanOrEqual(MIN_NEW_CHAR_DRILLS);
    expect(mCount).toBeGreaterThanOrEqual(MIN_NEW_CHAR_DRILLS);
  });

  it('should return correct sequence for lesson 2', async () => {
    const context: TestContext = {
      params: { id: 'koch-lesson-2' },
    };

    const response = await onRequestGet(context as Parameters<typeof onRequestGet>[0]);
    const body = await response.json();

    expect(response.status).toBe(200);
    const chars = body.text.split('');
    expect(chars).toHaveLength(LEARN_SESSION_LENGTH);

    // Lesson 2 = K M R S (4 characters total, R S are new)
    const validChars = ['K', 'M', 'R', 'S'];
    for (const char of chars) {
      expect(validChars).toContain(char);
    }

    // New characters (R, S) should each appear at least MIN_NEW_CHAR_DRILLS times
    const rCount = chars.filter(c => c === 'R').length;
    const sCount = chars.filter(c => c === 'S').length;

    expect(rCount).toBeGreaterThanOrEqual(MIN_NEW_CHAR_DRILLS);
    expect(sCount).toBeGreaterThanOrEqual(MIN_NEW_CHAR_DRILLS);
  });

  it('should return correct sequence for lesson 3', async () => {
    const context: TestContext = {
      params: { id: 'koch-lesson-3' },
    };

    const response = await onRequestGet(context as Parameters<typeof onRequestGet>[0]);
    const body = await response.json();

    expect(response.status).toBe(200);
    const chars = body.text.split('');
    expect(chars).toHaveLength(LEARN_SESSION_LENGTH);

    // Lesson 3 = K M R S U A (6 characters total, U A are new)
    const validChars = ['K', 'M', 'R', 'S', 'U', 'A'];
    for (const char of chars) {
      expect(validChars).toContain(char);
    }

    // New characters (U, A) should each appear at least MIN_NEW_CHAR_DRILLS times
    const uCount = chars.filter(c => c === 'U').length;
    const aCount = chars.filter(c => c === 'A').length;

    expect(uCount).toBeGreaterThanOrEqual(MIN_NEW_CHAR_DRILLS);
    expect(aCount).toBeGreaterThanOrEqual(MIN_NEW_CHAR_DRILLS);
  });

  it('should return correct sequence for lesson 10', async () => {
    const context: TestContext = {
      params: { id: 'koch-lesson-10' },
    };

    const response = await onRequestGet(context as Parameters<typeof onRequestGet>[0]);
    const body = await response.json();

    expect(response.status).toBe(200);
    const chars = body.text.split('');
    expect(chars).toHaveLength(LEARN_SESSION_LENGTH);

    // Lesson 10 = K M R S U A P T L O W I . N J E F 0 Y , (20 characters)
    const validChars = ['K', 'M', 'R', 'S', 'U', 'A', 'P', 'T', 'L', 'O',
                        'W', 'I', '.', 'N', 'J', 'E', 'F', '0', 'Y', ','];
    for (const char of chars) {
      expect(validChars).toContain(char);
    }

    // New characters (Y, ,) should each appear at least MIN_NEW_CHAR_DRILLS times
    const yCount = chars.filter(c => c === 'Y').length;
    const commaCount = chars.filter(c => c === ',').length;

    expect(yCount).toBeGreaterThanOrEqual(MIN_NEW_CHAR_DRILLS);
    expect(commaCount).toBeGreaterThanOrEqual(MIN_NEW_CHAR_DRILLS);
  });

  it('should return correct sequence for lesson 20', async () => {
    const context: TestContext = {
      params: { id: 'koch-lesson-20' },
    };

    const response = await onRequestGet(context as Parameters<typeof onRequestGet>[0]);
    const body = await response.json();

    expect(response.status).toBe(200);
    const chars = body.text.split('');
    expect(chars).toHaveLength(LEARN_SESSION_LENGTH);

    // Lesson 20 = all 40 Koch characters
    // New characters (6, X) should each appear at least MIN_NEW_CHAR_DRILLS times
    const sixCount = chars.filter(c => c === '6').length;
    const xCount = chars.filter(c => c === 'X').length;

    expect(sixCount).toBeGreaterThanOrEqual(MIN_NEW_CHAR_DRILLS);
    expect(xCount).toBeGreaterThanOrEqual(MIN_NEW_CHAR_DRILLS);
  });

  it('should set no-cache headers (randomized content)', async () => {
    const context: TestContext = {
      params: { id: 'koch-lesson-1' },
    };

    const response = await onRequestGet(context as Parameters<typeof onRequestGet>[0]);

    const cacheControl = response.headers.get('Cache-Control');
    expect(cacheControl).toContain('no-store');
    expect(cacheControl).toContain('no-cache');
    expect(cacheControl).toContain('must-revalidate');
  });

  it('should generate different sequences on repeated calls (randomness)', async () => {
    const context: TestContext = {
      params: { id: 'koch-lesson-5' },
    };

    const response1 = await onRequestGet(context as Parameters<typeof onRequestGet>[0]);
    const body1 = await response1.json();

    const response2 = await onRequestGet(context as Parameters<typeof onRequestGet>[0]);
    const body2 = await response2.json();

    // Due to shuffling, sequences should be different (very unlikely to be identical)
    // Note: There's a tiny chance they could be the same due to randomness
    // but with 20 characters, the probability is astronomically low
    expect(body1.text).not.toBe(body2.text);
  });
});
