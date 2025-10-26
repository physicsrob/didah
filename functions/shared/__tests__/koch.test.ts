import { describe, it, expect } from 'vitest'
import {
  KOCH_SEQUENCE,
  TOTAL_LESSONS,
  CHARACTERS_PER_LESSON,
  isValidLesson,
  getCharactersForLesson,
  getNewCharactersForLesson,
  getLessonDescription,
  getNewCharactersDescription
} from '../koch'

describe('Koch Module', () => {
  describe('Constants', () => {
    it('should have 40 characters in the Koch sequence', () => {
      expect(KOCH_SEQUENCE).toHaveLength(40)
    })

    it('should have 20 total lessons', () => {
      expect(TOTAL_LESSONS).toBe(20)
    })

    it('should have 2 characters per lesson', () => {
      expect(CHARACTERS_PER_LESSON).toBe(2)
    })

    it('should start with K M', () => {
      expect(KOCH_SEQUENCE[0]).toBe('K')
      expect(KOCH_SEQUENCE[1]).toBe('M')
    })

    it('should end with X', () => {
      expect(KOCH_SEQUENCE[39]).toBe('X')
    })
  })

  describe('isValidLesson', () => {
    it('should return true for lesson 1', () => {
      expect(isValidLesson(1)).toBe(true)
    })

    it('should return true for lesson 20', () => {
      expect(isValidLesson(20)).toBe(true)
    })

    it('should return true for lesson 10', () => {
      expect(isValidLesson(10)).toBe(true)
    })

    it('should return false for lesson 0', () => {
      expect(isValidLesson(0)).toBe(false)
    })

    it('should return false for lesson 21', () => {
      expect(isValidLesson(21)).toBe(false)
    })

    it('should return false for negative lessons', () => {
      expect(isValidLesson(-1)).toBe(false)
    })

    it('should return false for non-integer lessons', () => {
      expect(isValidLesson(5.5)).toBe(false)
    })
  })

  describe('getCharactersForLesson', () => {
    it('should return K M for lesson 1', () => {
      expect(getCharactersForLesson(1)).toEqual(['K', 'M'])
    })

    it('should return K M R S for lesson 2', () => {
      expect(getCharactersForLesson(2)).toEqual(['K', 'M', 'R', 'S'])
    })

    it('should return first 6 characters for lesson 3', () => {
      expect(getCharactersForLesson(3)).toEqual(['K', 'M', 'R', 'S', 'U', 'A'])
    })

    it('should return first 20 characters for lesson 10', () => {
      const chars = getCharactersForLesson(10)
      expect(chars).toHaveLength(20)
      expect(chars[0]).toBe('K')
      expect(chars[19]).toBe(',')
    })

    it('should return all 40 characters for lesson 20', () => {
      const chars = getCharactersForLesson(20)
      expect(chars).toHaveLength(40)
      expect(chars[0]).toBe('K')
      expect(chars[39]).toBe('X')
    })

    it('should throw error for invalid lesson 0', () => {
      expect(() => getCharactersForLesson(0)).toThrow('Invalid lesson: 0')
    })

    it('should throw error for invalid lesson 21', () => {
      expect(() => getCharactersForLesson(21)).toThrow('Invalid lesson: 21')
    })

    it('should throw error for negative lesson', () => {
      expect(() => getCharactersForLesson(-5)).toThrow('Invalid lesson')
    })
  })

  describe('getNewCharactersForLesson', () => {
    it('should return K M for lesson 1', () => {
      expect(getNewCharactersForLesson(1)).toEqual(['K', 'M'])
    })

    it('should return R S for lesson 2', () => {
      expect(getNewCharactersForLesson(2)).toEqual(['R', 'S'])
    })

    it('should return U A for lesson 3', () => {
      expect(getNewCharactersForLesson(3)).toEqual(['U', 'A'])
    })

    it('should return P T for lesson 4', () => {
      expect(getNewCharactersForLesson(4)).toEqual(['P', 'T'])
    })

    it('should return V G for lesson 11', () => {
      expect(getNewCharactersForLesson(11)).toEqual(['V', 'G'])
    })

    it('should return 6 X for lesson 20', () => {
      expect(getNewCharactersForLesson(20)).toEqual(['6', 'X'])
    })

    it('should always return exactly 2 characters', () => {
      for (let lesson = 1; lesson <= 20; lesson++) {
        expect(getNewCharactersForLesson(lesson)).toHaveLength(2)
      }
    })

    it('should throw error for invalid lesson 0', () => {
      expect(() => getNewCharactersForLesson(0)).toThrow('Invalid lesson: 0')
    })

    it('should throw error for invalid lesson 21', () => {
      expect(() => getNewCharactersForLesson(21)).toThrow('Invalid lesson: 21')
    })
  })

  describe('getLessonDescription', () => {
    it('should return correct description for lesson 1', () => {
      expect(getLessonDescription(1)).toBe('Lesson 1: K M')
    })

    it('should return correct description for lesson 2', () => {
      expect(getLessonDescription(2)).toBe('Lesson 2: K M R S')
    })

    it('should return correct description for lesson 3', () => {
      expect(getLessonDescription(3)).toBe('Lesson 3: K M R S U A')
    })

    it('should throw error for invalid lesson', () => {
      expect(() => getLessonDescription(0)).toThrow('Invalid lesson')
    })
  })

  describe('getNewCharactersDescription', () => {
    it('should return correct description for lesson 1', () => {
      expect(getNewCharactersDescription(1)).toBe('Lesson 1 (+K +M)')
    })

    it('should return correct description for lesson 2', () => {
      expect(getNewCharactersDescription(2)).toBe('Lesson 2 (+R +S)')
    })

    it('should return correct description for lesson 3', () => {
      expect(getNewCharactersDescription(3)).toBe('Lesson 3 (+U +A)')
    })

    it('should throw error for invalid lesson', () => {
      expect(() => getNewCharactersDescription(0)).toThrow('Invalid lesson')
    })
  })

  describe('Character accumulation', () => {
    it('should accumulate characters across lessons', () => {
      // Lesson 1 has 2 chars
      expect(getCharactersForLesson(1)).toHaveLength(2)

      // Lesson 2 includes lesson 1 chars + 2 new
      const lesson2 = getCharactersForLesson(2)
      expect(lesson2).toHaveLength(4)
      expect(lesson2.slice(0, 2)).toEqual(['K', 'M'])

      // Lesson 3 includes lesson 1 & 2 chars + 2 new
      const lesson3 = getCharactersForLesson(3)
      expect(lesson3).toHaveLength(6)
      expect(lesson3.slice(0, 4)).toEqual(['K', 'M', 'R', 'S'])
    })

    it('should have no overlapping characters between new characters of different lessons', () => {
      const allNewChars = new Set<string>()
      for (let lesson = 1; lesson <= 20; lesson++) {
        const newChars = getNewCharactersForLesson(lesson)
        for (const char of newChars) {
          expect(allNewChars.has(char)).toBe(false)
          allNewChars.add(char)
        }
      }
      expect(allNewChars.size).toBe(40)
    })
  })
})
