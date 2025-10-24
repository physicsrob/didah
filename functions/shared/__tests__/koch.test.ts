import { describe, it, expect } from 'vitest'
import {
  KOCH_SEQUENCE,
  TOTAL_LEVELS,
  CHARACTERS_PER_LEVEL,
  isValidLevel,
  getCharactersForLevel,
  getNewCharactersForLevel,
  getLevelDescription,
  getNewCharactersDescription
} from '../koch'

describe('Koch Module', () => {
  describe('Constants', () => {
    it('should have 40 characters in the Koch sequence', () => {
      expect(KOCH_SEQUENCE).toHaveLength(40)
    })

    it('should have 20 total levels', () => {
      expect(TOTAL_LEVELS).toBe(20)
    })

    it('should have 2 characters per level', () => {
      expect(CHARACTERS_PER_LEVEL).toBe(2)
    })

    it('should start with K M', () => {
      expect(KOCH_SEQUENCE[0]).toBe('K')
      expect(KOCH_SEQUENCE[1]).toBe('M')
    })

    it('should end with X', () => {
      expect(KOCH_SEQUENCE[39]).toBe('X')
    })
  })

  describe('isValidLevel', () => {
    it('should return true for level 1', () => {
      expect(isValidLevel(1)).toBe(true)
    })

    it('should return true for level 20', () => {
      expect(isValidLevel(20)).toBe(true)
    })

    it('should return true for level 10', () => {
      expect(isValidLevel(10)).toBe(true)
    })

    it('should return false for level 0', () => {
      expect(isValidLevel(0)).toBe(false)
    })

    it('should return false for level 21', () => {
      expect(isValidLevel(21)).toBe(false)
    })

    it('should return false for negative levels', () => {
      expect(isValidLevel(-1)).toBe(false)
    })

    it('should return false for non-integer levels', () => {
      expect(isValidLevel(5.5)).toBe(false)
    })
  })

  describe('getCharactersForLevel', () => {
    it('should return K M for level 1', () => {
      expect(getCharactersForLevel(1)).toEqual(['K', 'M'])
    })

    it('should return K M R S for level 2', () => {
      expect(getCharactersForLevel(2)).toEqual(['K', 'M', 'R', 'S'])
    })

    it('should return first 6 characters for level 3', () => {
      expect(getCharactersForLevel(3)).toEqual(['K', 'M', 'R', 'S', 'U', 'A'])
    })

    it('should return first 20 characters for level 10', () => {
      const chars = getCharactersForLevel(10)
      expect(chars).toHaveLength(20)
      expect(chars[0]).toBe('K')
      expect(chars[19]).toBe(',')
    })

    it('should return all 40 characters for level 20', () => {
      const chars = getCharactersForLevel(20)
      expect(chars).toHaveLength(40)
      expect(chars[0]).toBe('K')
      expect(chars[39]).toBe('X')
    })

    it('should throw error for invalid level 0', () => {
      expect(() => getCharactersForLevel(0)).toThrow('Invalid level: 0')
    })

    it('should throw error for invalid level 21', () => {
      expect(() => getCharactersForLevel(21)).toThrow('Invalid level: 21')
    })

    it('should throw error for negative level', () => {
      expect(() => getCharactersForLevel(-5)).toThrow('Invalid level')
    })
  })

  describe('getNewCharactersForLevel', () => {
    it('should return K M for level 1', () => {
      expect(getNewCharactersForLevel(1)).toEqual(['K', 'M'])
    })

    it('should return R S for level 2', () => {
      expect(getNewCharactersForLevel(2)).toEqual(['R', 'S'])
    })

    it('should return U A for level 3', () => {
      expect(getNewCharactersForLevel(3)).toEqual(['U', 'A'])
    })

    it('should return P T for level 4', () => {
      expect(getNewCharactersForLevel(4)).toEqual(['P', 'T'])
    })

    it('should return V G for level 11', () => {
      expect(getNewCharactersForLevel(11)).toEqual(['V', 'G'])
    })

    it('should return 6 X for level 20', () => {
      expect(getNewCharactersForLevel(20)).toEqual(['6', 'X'])
    })

    it('should always return exactly 2 characters', () => {
      for (let level = 1; level <= 20; level++) {
        expect(getNewCharactersForLevel(level)).toHaveLength(2)
      }
    })

    it('should throw error for invalid level 0', () => {
      expect(() => getNewCharactersForLevel(0)).toThrow('Invalid level: 0')
    })

    it('should throw error for invalid level 21', () => {
      expect(() => getNewCharactersForLevel(21)).toThrow('Invalid level: 21')
    })
  })

  describe('getLevelDescription', () => {
    it('should return correct description for level 1', () => {
      expect(getLevelDescription(1)).toBe('Level 1: K M')
    })

    it('should return correct description for level 2', () => {
      expect(getLevelDescription(2)).toBe('Level 2: K M R S')
    })

    it('should return correct description for level 3', () => {
      expect(getLevelDescription(3)).toBe('Level 3: K M R S U A')
    })

    it('should throw error for invalid level', () => {
      expect(() => getLevelDescription(0)).toThrow('Invalid level')
    })
  })

  describe('getNewCharactersDescription', () => {
    it('should return correct description for level 1', () => {
      expect(getNewCharactersDescription(1)).toBe('Level 1 (+K +M)')
    })

    it('should return correct description for level 2', () => {
      expect(getNewCharactersDescription(2)).toBe('Level 2 (+R +S)')
    })

    it('should return correct description for level 3', () => {
      expect(getNewCharactersDescription(3)).toBe('Level 3 (+U +A)')
    })

    it('should throw error for invalid level', () => {
      expect(() => getNewCharactersDescription(0)).toThrow('Invalid level')
    })
  })

  describe('Character accumulation', () => {
    it('should accumulate characters across levels', () => {
      // Level 1 has 2 chars
      expect(getCharactersForLevel(1)).toHaveLength(2)

      // Level 2 includes level 1 chars + 2 new
      const level2 = getCharactersForLevel(2)
      expect(level2).toHaveLength(4)
      expect(level2.slice(0, 2)).toEqual(['K', 'M'])

      // Level 3 includes level 1 & 2 chars + 2 new
      const level3 = getCharactersForLevel(3)
      expect(level3).toHaveLength(6)
      expect(level3.slice(0, 4)).toEqual(['K', 'M', 'R', 'S'])
    })

    it('should have no overlapping characters between new characters of different levels', () => {
      const allNewChars = new Set<string>()
      for (let level = 1; level <= 20; level++) {
        const newChars = getNewCharactersForLevel(level)
        for (const char of newChars) {
          expect(allNewChars.has(char)).toBe(false)
          allNewChars.add(char)
        }
      }
      expect(allNewChars.size).toBe(40)
    })
  })
})
