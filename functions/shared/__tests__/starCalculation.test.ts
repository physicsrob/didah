import { describe, it, expect } from 'vitest'
import { calculateStars } from '../starCalculation'

describe('calculateStars', () => {
  describe('3 stars (0 mistakes)', () => {
    it('returns 3 stars for 100% accuracy (0 mistakes)', () => {
      expect(calculateStars(100)).toBe(3)
    })
  })

  describe('2 stars (1 mistake)', () => {
    it('returns 2 stars for 96.67% accuracy (1 mistake)', () => {
      expect(calculateStars(96.67)).toBe(2)
    })

    it('returns 2 stars for 97% accuracy (boundary)', () => {
      expect(calculateStars(97)).toBe(2)
    })
  })

  describe('1 star (2-3 mistakes)', () => {
    it('returns 1 star for 93.33% accuracy (2 mistakes)', () => {
      expect(calculateStars(93.33)).toBe(1)
    })

    it('returns 1 star for 90% accuracy (3 mistakes - boundary)', () => {
      expect(calculateStars(90)).toBe(1)
    })
  })

  describe('0 stars (4+ mistakes)', () => {
    it('returns 0 stars for 86.67% accuracy (4 mistakes - just below 1 star threshold)', () => {
      expect(calculateStars(86.67)).toBe(0)
    })

    it('returns 0 stars for 50% accuracy', () => {
      expect(calculateStars(50)).toBe(0)
    })

    it('returns 0 stars for 0% accuracy', () => {
      expect(calculateStars(0)).toBe(0)
    })

    it('returns 0 stars for 75% accuracy', () => {
      expect(calculateStars(75)).toBe(0)
    })
  })

  describe('boundary conditions', () => {
    it('returns 3 stars only for exactly 100% accuracy', () => {
      expect(calculateStars(100)).toBe(3)
      expect(calculateStars(99)).toBe(2)
    })

    it('returns 2 stars for 1 mistake (96.67%)', () => {
      expect(calculateStars(96.67)).toBe(2)
      expect(calculateStars(93.33)).toBe(1)
    })

    it('returns 1 star for 3 mistakes (90%)', () => {
      expect(calculateStars(90)).toBe(1)
      expect(calculateStars(86.67)).toBe(0)
    })
  })
})
