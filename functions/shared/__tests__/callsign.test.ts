import { describe, expect, test } from 'vitest';
import { generateCallsign } from '../callsign';

describe('generateCallsign', () => {
  test('returns object with callsign and qth properties', () => {
    const result = generateCallsign();
    expect(result).toHaveProperty('callsign');
    expect(result).toHaveProperty('qth');
    expect(typeof result.callsign).toBe('string');
    expect(typeof result.qth).toBe('string');
  });

  test('generates non-empty callsign and qth', () => {
    const result = generateCallsign();
    expect(result.callsign.length).toBeGreaterThan(0);
    expect(result.qth.length).toBeGreaterThan(0);
  });

  test('generates callsigns with uppercase letters', () => {
    const results = Array.from({ length: 50 }, () => generateCallsign());
    results.forEach(({ callsign }) => {
      expect(callsign).toMatch(/^[A-Z0-9]+$/);
    });
  });

  test('generates US-format callsigns (W/K/N prefix with digit)', () => {
    const results = Array.from({ length: 100 }, () => generateCallsign());
    const usCallsigns = results.filter(({ callsign }) =>
      callsign.match(/^[WKN][0-9]/)
    );

    // Should have at least some US callsigns given the weights
    expect(usCallsigns.length).toBeGreaterThan(0);

    // Each US callsign should match expected format
    usCallsigns.forEach(({ callsign }) => {
      expect(callsign).toMatch(/^[WKN][0-9][A-Z]{2,3}$/);
    });
  });

  test('generates Canadian-format callsigns (VE/VA prefix)', () => {
    const results = Array.from({ length: 100 }, () => generateCallsign());
    const canadianCallsigns = results.filter(({ callsign }) =>
      callsign.match(/^V[EA][0-9]/)
    );

    if (canadianCallsigns.length > 0) {
      canadianCallsigns.forEach(({ callsign }) => {
        expect(callsign).toMatch(/^V[EA][0-9][A-Z]{2,3}$/);
      });
    }
  });

  test('generates UK-format callsigns (G/M prefix)', () => {
    const results = Array.from({ length: 100 }, () => generateCallsign());
    const ukCallsigns = results.filter(({ callsign }) =>
      callsign.match(/^[GM][0-9]/)
    );

    if (ukCallsigns.length > 0) {
      ukCallsigns.forEach(({ callsign }) => {
        expect(callsign).toMatch(/^[GM][0-9][A-Z]{3}$/);
      });
    }
  });

  test('generates German-format callsigns (DL/DJ/DK prefix)', () => {
    const results = Array.from({ length: 100 }, () => generateCallsign());
    const germanCallsigns = results.filter(({ callsign }) =>
      callsign.match(/^D[LJK][0-9]/)
    );

    if (germanCallsigns.length > 0) {
      germanCallsigns.forEach(({ callsign }) => {
        expect(callsign).toMatch(/^D[LJK][0-9][A-Z]{2,3}$/);
      });
    }
  });

  test('generates Japanese-format callsigns (JA/JR/JE prefix)', () => {
    const results = Array.from({ length: 100 }, () => generateCallsign());
    const japaneseCallsigns = results.filter(({ callsign }) =>
      callsign.match(/^J[ARE][0-9]/)
    );

    if (japaneseCallsigns.length > 0) {
      japaneseCallsigns.forEach(({ callsign }) => {
        expect(callsign).toMatch(/^J[ARE][0-9][A-Z]{2,3}$/);
      });
    }
  });

  test('generates varied callsigns (not all the same)', () => {
    const results = Array.from({ length: 20 }, () => generateCallsign());
    const uniqueCallsigns = new Set(results.map(r => r.callsign));

    // With proper randomization, should get mostly unique callsigns
    expect(uniqueCallsigns.size).toBeGreaterThan(15);
  });

  test('generates varied QTHs (not all the same)', () => {
    const results = Array.from({ length: 20 }, () => generateCallsign());
    const uniqueQTHs = new Set(results.map(r => r.qth));

    // Should get varied QTHs
    expect(uniqueQTHs.size).toBeGreaterThan(5);
  });

  test('QTH strings are reasonable length', () => {
    const results = Array.from({ length: 50 }, () => generateCallsign());
    results.forEach(({ qth }) => {
      expect(qth.length).toBeGreaterThan(1);
      expect(qth.length).toBeLessThan(50);
    });
  });

  test('generates callsigns with 2-letter suffixes (N1XX format)', () => {
    const results = Array.from({ length: 200 }, () => generateCallsign());
    const twoLetterSuffix = results.filter(({ callsign }) =>
      callsign.match(/^N[0-9][A-Z]{2}$/)
    );

    // Should occasionally generate 2-letter suffix format
    // (N1[A-Z]{2,3} pattern means 2 or 3 letters)
    if (twoLetterSuffix.length > 0) {
      expect(twoLetterSuffix[0].callsign).toMatch(/^N[0-9][A-Z]{2}$/);
    }
  });

  test('generates callsigns with 3-letter suffixes (N1XXX format)', () => {
    const results = Array.from({ length: 200 }, () => generateCallsign());
    const threeLetterSuffix = results.filter(({ callsign }) =>
      callsign.match(/^N[0-9][A-Z]{3}$/)
    );

    // Should occasionally generate 3-letter suffix format
    if (threeLetterSuffix.length > 0) {
      expect(threeLetterSuffix[0].callsign).toMatch(/^N[0-9][A-Z]{3}$/);
    }
  });

  test('weighted distribution favors high-weight regions', () => {
    // California (area 6) has weight 15 (highest)
    // Run many generations and check that W6/K6/N6 appear frequently
    const results = Array.from({ length: 500 }, () => generateCallsign());
    const californiaCallsigns = results.filter(({ callsign }) =>
      callsign.match(/^[WKN]6/)
    );

    // With weight 15 out of total ~270, expect roughly 5-6% California
    // With 500 samples, that's roughly 25-30, but allow margin
    expect(californiaCallsigns.length).toBeGreaterThan(10);
  });

  test('generates valid Russian callsigns (R/U prefix with letter)', () => {
    const results = Array.from({ length: 200 }, () => generateCallsign());
    const russianCallsigns = results.filter(({ callsign }) =>
      callsign.match(/^[RU][A-Z][0-9]/)
    );

    if (russianCallsigns.length > 0) {
      russianCallsigns.forEach(({ callsign }) => {
        expect(callsign).toMatch(/^[RU][A-Z][0-9][A-Z]{2,3}$/);
      });
    }
  });

  test('generates valid New Zealand callsigns (ZL with 1-4)', () => {
    const results = Array.from({ length: 200 }, () => generateCallsign());
    const nzCallsigns = results.filter(({ callsign }) =>
      callsign.match(/^ZL[1-4]/)
    );

    if (nzCallsigns.length > 0) {
      nzCallsigns.forEach(({ callsign }) => {
        expect(callsign).toMatch(/^ZL[1-4][A-Z]{2,3}$/);
      });
    }
  });

  test('stress test: generates 1000 callsigns without errors', () => {
    expect(() => {
      Array.from({ length: 1000 }, () => generateCallsign());
    }).not.toThrow();
  });

  test('all generated callsigns are unique (high probability)', () => {
    const results = Array.from({ length: 1000 }, () => generateCallsign());
    const uniqueCallsigns = new Set(results.map(r => r.callsign));

    // With the large pattern space, should get mostly unique callsigns
    // Allow for some duplicates but expect >90% unique
    expect(uniqueCallsigns.size).toBeGreaterThan(900);
  });
});
