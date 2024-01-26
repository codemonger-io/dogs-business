import { describe, expect, it } from 'vitest'

import { hexToRGB } from '@/utils/colors'

describe('utils.colors', () => {
  describe('hexToRGB', () => {
    it('should return (0, 0, 0) for "#000000"', () => {
      expect(hexToRGB('#000000')).toEqual({ red: 0, green: 0, blue: 0 })
    })

    it('should return (1, 1, 1) for "#FFFFFF"', () => {
      expect(hexToRGB('#FFFFFF')).toEqual({ red: 1, green: 1, blue: 1 })
    })

    it('should return (0.216, 0.769, 0.624) for "#37C49F"', () => {
      const { red, green, blue } = hexToRGB('#37C49F')
      expect(red).toBeCloseTo(0.216, 3)
      expect(green).toBeCloseTo(0.769, 3)
      expect(blue).toBeCloseTo(0.624, 3)
    })

    it('should return (0.216, 0.769, 0.624) for "#37c49f"', () => {
      const { red, green, blue } = hexToRGB('#37c49f')
      expect(red).toBeCloseTo(0.216, 3)
      expect(green).toBeCloseTo(0.769, 3)
      expect(blue).toBeCloseTo(0.624, 3)
    })

    it('should throw an error for "123456"', () => {
      expect(() => hexToRGB('123456')).toThrow(RangeError)
    })

    it('should throw an error for "#12345"', () => {
      expect(() => hexToRGB('#12345')).toThrow(RangeError)
    })

    it('should throw an error for "#1234567"', () => {
      expect(() => hexToRGB('#1234567')).toThrow(RangeError)
    })

    it('should throw an error for "#COLOUR"', () => {
      expect(() => hexToRGB('#COLOUR')).toThrow(RangeError)
    })
  })
})
