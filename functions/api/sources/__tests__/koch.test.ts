import { describe, it, expect, vi, beforeEach } from 'vitest';
import { onRequestGet } from '../koch';
import type { SessionStatistics, CharacterStatistics } from '../../../shared/types';
import { PRACTICE_SESSION_LENGTH } from '../../../shared/koch';

// Mock dependencies
vi.mock('../../../shared/auth', () => ({
  getUserIdFromRequest: vi.fn()
}));

import { getUserIdFromRequest } from '../../../shared/auth';

// Test context type (subset of CloudflareContext needed for tests)
type TestContext = {
  params: { id: string };
  request: Request;
  env?: {
    KV?: unknown;
    CLERK_SECRET_KEY?: string;
    CLERK_PUBLISHABLE_KEY?: string;
  };
};

// Helper to create mock SessionStatistics
function createMockSession(
  charStats: Record<string, { correct: number; incorrect: number }>
): SessionStatistics {
  const characterStats: Record<string, CharacterStatistics> = {};

  for (const [char, stats] of Object.entries(charStats)) {
    const total = stats.correct + stats.incorrect;
    const accuracy = total > 0 ? (stats.correct / total) * 100 : 0;

    characterStats[char] = {
      char,
      attempts: total,
      correct: stats.correct,
      incorrect: stats.incorrect,
      timeout: 0,
      accuracy,
      recognitionTimes: [],
      meanRecognitionTimeMs: 0,
      medianRecognitionTimeMs: 0
    };
  }

  return {
    startedAt: Date.now(),
    endedAt: Date.now() + 60000,
    durationMs: 60000,
    config: {
      mode: 'practice',
      lengthMs: 60000,
      wpm: 20,
      speedTier: 'slow',
      sourceId: 'test',
      replay: false,
      feedback: 'none',
      effectiveAlphabet: []
    },
    overallAccuracy: 80,
    timeoutPercentage: 0,
    achievedWpm: 15,
    totalCharacters: 10,
    correctCount: 8,
    incorrectCount: 2,
    timeoutCount: 0,
    characterStats,
    confusionMatrix: {},
    meanRecognitionTimeMs: 1000,
    medianRecognitionTimeMs: 1000
  };
}

// Mock KV namespace
class MockKV {
  private data = new Map<string, string>();

  async get(key: string, type?: string): Promise<unknown> {
    const value = this.data.get(key);
    if (type === 'json' && value) {
      return JSON.parse(value);
    }
    return value || null;
  }

  async put(key: string, value: string): Promise<void> {
    this.data.set(key, value);
  }

  setMockData(key: string, value: unknown): void {
    this.data.set(key, JSON.stringify(value));
  }
}

describe('Koch Source Endpoint', () => {
  let mockKV: MockKV;
  const mockUserId = 'user_123';

  beforeEach(() => {
    mockKV = new MockKV();
    vi.mocked(getUserIdFromRequest).mockResolvedValue(mockUserId);
  });

  it('should return 400 for invalid source ID format', async () => {
    const context: TestContext = {
      params: { id: 'koch-invalid' },
      request: new Request('http://localhost/api/sources/koch-invalid'),
      env: {
        KV: mockKV,
        CLERK_SECRET_KEY: 'test-key',
        CLERK_PUBLISHABLE_KEY: 'test-pub-key'
      }
    };

    const response = await onRequestGet(context as Parameters<typeof onRequestGet>[0]);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('Invalid Koch source ID format');
  });

  it('should return 400 for invalid level (0)', async () => {
    const context: TestContext = {
      params: { id: 'koch-level-0' },
      request: new Request('http://localhost/api/sources/koch-level-0'),
      env: {
        KV: mockKV,
        CLERK_SECRET_KEY: 'test-key',
        CLERK_PUBLISHABLE_KEY: 'test-pub-key'
      }
    };

    const response = await onRequestGet(context as Parameters<typeof onRequestGet>[0]);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('Invalid level: 0');
  });

  it('should return 400 for invalid level (21)', async () => {
    const context: TestContext = {
      params: { id: 'koch-level-21' },
      request: new Request('http://localhost/api/sources/koch-level-21'),
      env: {
        KV: mockKV,
        CLERK_SECRET_KEY: 'test-key',
        CLERK_PUBLISHABLE_KEY: 'test-pub-key'
      }
    };

    const response = await onRequestGet(context as Parameters<typeof onRequestGet>[0]);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('Invalid level: 21');
  });

  it('should return 500 if KV is not available', async () => {
    const context: TestContext = {
      params: { id: 'koch-level-1' },
      request: new Request('http://localhost/api/sources/koch-level-1'),
      env: {
        CLERK_SECRET_KEY: 'test-key',
        CLERK_PUBLISHABLE_KEY: 'test-pub-key'
        // KV missing
      }
    };

    const response = await onRequestGet(context as Parameters<typeof onRequestGet>[0]);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toContain('KV storage not available');
  });

  it('should return 401 if user is not authenticated', async () => {
    vi.mocked(getUserIdFromRequest).mockRejectedValue(new Error('Invalid token'));

    const context: TestContext = {
      params: { id: 'koch-level-1' },
      request: new Request('http://localhost/api/sources/koch-level-1'),
      env: {
        KV: mockKV,
        CLERK_SECRET_KEY: 'test-key',
        CLERK_PUBLISHABLE_KEY: 'test-pub-key'
      }
    };

    const response = await onRequestGet(context as Parameters<typeof onRequestGet>[0]);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toContain('Authentication required');
  });

  it('should return correct number of characters for level 1 with no history', async () => {
    const context: TestContext = {
      params: { id: 'koch-level-1' },
      request: new Request('http://localhost/api/sources/koch-level-1'),
      env: {
        KV: mockKV,
        CLERK_SECRET_KEY: 'test-key',
        CLERK_PUBLISHABLE_KEY: 'test-pub-key'
      }
    };

    const response = await onRequestGet(context as Parameters<typeof onRequestGet>[0]);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBe('koch-level-1');
    expect(typeof body.text).toBe('string');

    // Split into individual characters
    const chars = body.text.split('');
    expect(chars).toHaveLength(PRACTICE_SESSION_LENGTH);

    // All characters should be K or M (Level 1)
    for (const char of chars) {
      expect(['K', 'M']).toContain(char);
    }
  });

  it('should return correct number of characters for level 5 with no history', async () => {
    const context: TestContext = {
      params: { id: 'koch-level-5' },
      request: new Request('http://localhost/api/sources/koch-level-5'),
      env: {
        KV: mockKV,
        CLERK_SECRET_KEY: 'test-key',
        CLERK_PUBLISHABLE_KEY: 'test-pub-key'
      }
    };

    const response = await onRequestGet(context as Parameters<typeof onRequestGet>[0]);
    const body = await response.json();

    expect(response.status).toBe(200);
    const chars = body.text.split('');
    expect(chars).toHaveLength(PRACTICE_SESSION_LENGTH);

    // Level 5 = K M R S U A P T L O (10 characters)
    const validChars = ['K', 'M', 'R', 'S', 'U', 'A', 'P', 'T', 'L', 'O'];
    for (const char of chars) {
      expect(validChars).toContain(char);
    }
  });

  it('should weight un-mastered characters more heavily', async () => {
    // Set up mock session data where K is mastered (90%) and M is un-mastered (50%)
    const today = new Date().toISOString().split('T')[0];
    const session = createMockSession({
      'K': { correct: 9, incorrect: 1 },  // 90% - mastered
      'M': { correct: 5, incorrect: 5 }   // 50% - un-mastered
    });

    mockKV.setMockData(`user:${mockUserId}:stats:${today}`, [session]);

    const context: TestContext = {
      params: { id: 'koch-level-1' },
      request: new Request('http://localhost/api/sources/koch-level-1'),
      env: {
        KV: mockKV,
        CLERK_SECRET_KEY: 'test-key',
        CLERK_PUBLISHABLE_KEY: 'test-pub-key'
      }
    };

    const response = await onRequestGet(context as Parameters<typeof onRequestGet>[0]);
    const body = await response.json();

    expect(response.status).toBe(200);
    const chars = body.text.split('');
    expect(chars).toHaveLength(PRACTICE_SESSION_LENGTH);

    // Count occurrences
    const kCount = chars.filter((c: string) => c === 'K').length;
    const mCount = chars.filter((c: string) => c === 'M').length;

    // M (un-mastered, weight=2) should appear roughly twice as often as K (mastered, weight=1)
    // With PRACTICE_SESSION_LENGTH chars and 2:1 weighting, expect roughly K≈1/3, M≈2/3
    // Allow variance for randomness
    const minK = Math.floor(PRACTICE_SESSION_LENGTH / 3) - 3;
    const maxK = Math.floor(PRACTICE_SESSION_LENGTH / 3) + 3;
    const minM = Math.floor((PRACTICE_SESSION_LENGTH * 2) / 3) - 3;
    const maxM = Math.floor((PRACTICE_SESSION_LENGTH * 2) / 3) + 3;

    expect(kCount).toBeGreaterThan(minK);
    expect(kCount).toBeLessThan(maxK);
    expect(mCount).toBeGreaterThan(minM);
    expect(mCount).toBeLessThan(maxM);
  });

  it('should handle stats query failure gracefully (fallback to equal weighting)', async () => {
    // Mock KV.get to throw an error
    const errorKV = {
      get: vi.fn().mockRejectedValue(new Error('KV error'))
    };

    const context: TestContext = {
      params: { id: 'koch-level-1' },
      request: new Request('http://localhost/api/sources/koch-level-1'),
      env: {
        KV: errorKV,
        CLERK_SECRET_KEY: 'test-key',
        CLERK_PUBLISHABLE_KEY: 'test-pub-key'
      }
    };

    const response = await onRequestGet(context as Parameters<typeof onRequestGet>[0]);
    const body = await response.json();

    // Should still succeed with fallback to equal weighting
    expect(response.status).toBe(200);
    const chars = body.text.split('');
    expect(chars).toHaveLength(PRACTICE_SESSION_LENGTH);
  });

  it('should set no-cache headers', async () => {
    const context: TestContext = {
      params: { id: 'koch-level-1' },
      request: new Request('http://localhost/api/sources/koch-level-1'),
      env: {
        KV: mockKV,
        CLERK_SECRET_KEY: 'test-key',
        CLERK_PUBLISHABLE_KEY: 'test-pub-key'
      }
    };

    const response = await onRequestGet(context as Parameters<typeof onRequestGet>[0]);

    expect(response.headers.get('Cache-Control')).toBe('no-store, no-cache, must-revalidate');
    expect(response.headers.get('Pragma')).toBe('no-cache');
    expect(response.headers.get('Expires')).toBe('0');
  });
});
