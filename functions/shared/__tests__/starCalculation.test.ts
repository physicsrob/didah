import { describe, it, expect } from 'vitest'
import { calculateStars } from '../starCalculation'

describe('calculateStars', () => {
  describe('3 stars (≥95%)', () => {
    it('returns 3 stars for 100% accuracy', () => {
      expect(calculateStars(100)).toBe(3)
    })

    it('returns 3 stars for 95% accuracy (boundary)', () => {
      expect(calculateStars(95)).toBe(3)
    })

    it('returns 3 stars for 98% accuracy', () => {
      expect(calculateStars(98)).toBe(3)
    })
  })

  describe('2 stars (≥90%)', () => {
    it('returns 2 stars for 94.99% accuracy (just below 3 star threshold)', () => {
      expect(calculateStars(94.99)).toBe(2)
    })

    it('returns 2 stars for 90% accuracy (boundary)', () => {
      expect(calculateStars(90)).toBe(2)
    })

    it('returns 2 stars for 92% accuracy', () => {
      expect(calculateStars(92)).toBe(2)
    })
  })

  describe('1 star (≥85%)', () => {
    it('returns 1 star for 89.99% accuracy (just below 2 star threshold)', () => {
      expect(calculateStars(89.99)).toBe(1)
    })

    it('returns 1 star for 85% accuracy (boundary)', () => {
      expect(calculateStars(85)).toBe(1)
    })

    it('returns 1 star for 87% accuracy', () => {
      expect(calculateStars(87)).toBe(1)
    })
  })

  describe('0 stars (<85%)', () => {
    it('returns 0 stars for 84.99% accuracy (just below 1 star threshold)', () => {
      expect(calculateStars(84.99)).toBe(0)
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
})
