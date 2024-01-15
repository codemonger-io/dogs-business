import { describe, expect, it } from 'vitest'

import { isMinimalGeolocationCoordinates } from '@/types/geolocation'

describe('types.geolocation', () => {
  describe('isMinimalGeolocationCoordinates', () => {
    it('should be true for { latitude: 35.6812, longitude: 139.7671}', () => {
      expect(isMinimalGeolocationCoordinates({
        latitude: 35.6812,
        longitude: 139.7671
      })).toBe(true)
    })

    it('should be false for null', () => {
      expect(isMinimalGeolocationCoordinates(null)).toBe(false)
    })

    it('should be false for "35.6812,139.7671"', () => {
      expect(isMinimalGeolocationCoordinates('35.6812,139.7671')).toBe(false)
    })

    it('should be false for { latitude: 0.0 } missing longitude', () => {
      expect(isMinimalGeolocationCoordinates({ latitude: 0.0 })).toBe(false)
    })

    it('should be false for { longitude: 0.0 } missing latitude', () => {
      expect(isMinimalGeolocationCoordinates({ longitude: 0.0 })).toBe(false)
    })

    it('should be false for { latitude: "0.0", longitude: 0.0 } with non-number latitude', () => {
      expect(isMinimalGeolocationCoordinates({
        latitude: '0.0',
        longitude: 0.0
      })).toBe(false)
    })

    it('should be false for { latitude: 0.0, longitude: "0.0" } with non-number longitude', () => {
      expect(isMinimalGeolocationCoordinates({
        latitude: 0.0,
        longitude: '0.0'
      })).toBe(false)
    })
  })
})
