import { describe, expect, it } from 'vitest'

import {
  type GenericBusinessRecord,
  convertBusinessRecordToFeature,
  convertBusinessRecordsToGeoJSON,
  isBusinessRecord,
  isBusinessType,
  isGuestBusinessRecord
} from '@/lib/business-record-database'

describe('business-record-database.utils', () => {
  describe('isBusinessType', () => {
    it('should be true for "pee"', () => {
      expect(isBusinessType('pee')).toBe(true)
    })

    it('should be true for "poo"', () => {
      expect(isBusinessType('poo')).toBe(true)
    })

    it('should be false for undefined', () => {
      expect(isBusinessType(undefined)).toBe(false)
    })

    it('should be false for 123', () => {
      expect(isBusinessType(123)).toBe(false)
    })

    it('should be false for "bark"', () => {
      expect(isBusinessType('bark')).toBe(false)
    })
  })

  describe('isBusinessRecord', () => {
    const businessRecord1 = {
      key: 1,
      dogKey: 2,
      businessType: 'pee',
      location: {
        latitude: 35.6812,
        longitude: 139.7671
      },
      timestamp: new Date(2018, 5, 23)
    }
    const businessRecord2 = {
      key: 'record',
      dogKey: 'dog',
      businessType: 'poo',
      location: {
        latitude: 40.4416,
        longitude: -80.0079
      },
      timestamp: new Date(2024, 1, 30, 6, 43, 0)
    }

    it(`should be true for ${JSON.stringify(businessRecord1)}`, () => {
      expect(isBusinessRecord(businessRecord1)).toBe(true)
    })

    it(`should be true for ${JSON.stringify(businessRecord2)}`, () => {
      expect(isBusinessRecord(businessRecord2)).toBe(true)
    })

    it('should be false for "record"', () => {
      expect(isBusinessRecord('record')).toBe(false)
    })

    it('should be false for null', () => {
      expect(isBusinessRecord(null)).toBe(false)
    })

    it('should be false for { dogKey: 2, businessType: "pee", location: { latitude: 0.0, longitude: 0.0 } } missing key', () => {
      expect(isBusinessRecord({
        dogKey: 2,
        businessType: 'pee',
        location: {
          latitude: 0.0,
          longitude: 0.0
        },
        timestamp: new Date(2018, 5, 23)
      })).toBe(false)
    })

    it('should be false for { key: 1, businessType: "pee", location: { latitude: 0.0, longitude: 0.0 } } missing dogKey', () => {
      expect(isBusinessRecord({
        key: 1,
        businessType: 'pee',
        location: {
          latitude: 0.0,
          longitude: 0.0
        },
        timestamp: new Date(2018, 5, 23)
      })).toBe(false)
    })

    it('should be false for { key: 1, dogKey: 2, location: { latitude: 0.0, longitude: 0.0 } } missing businessType', () => {
      expect(isBusinessRecord({
        key: 1,
        dogKey: 2,
        location: {
          latitude: 0.0,
          longitude: 0.0
        },
        timestamp: new Date(2018, 5, 23)
      })).toBe(false)
    })

    it('should be false for { key: 1, dogKey: 2, businessType: "bark", location: { latitude: 0.0, longitude: 0.0 } } with invalid businessType', () => {
      expect(isBusinessRecord({
        key: 1,
        dogKey: 2,
        businessType: 'bark',
        location: {
          latitude: 0.0,
          longitude: 0.0
        },
        timestamp: new Date(2018, 5, 23)
      })).toBe(false)
    })

    it('should be false for { key: 1, dogKey: 2, businessType: "pee" } missing location',  () => {
      expect(isBusinessRecord({
        key: 1,
        dogKey: 2,
        businessType: 'pee',
        timestamp: new Date(2018, 5, 23)
      })).toBe(false)
    })

    it('should be false for { key: 1, dogKey: 2, businessType: "pee", location: "139.7671,35.6812" } with non-object location', () => {
      expect(isBusinessRecord({
        key: 1,
        dogKey: 2,
        businessType: 'pee',
        location: '139.7671,35.6812',
        timestamp: new Date(2018, 5, 23)
      })).toBe(false)
    })

    it('should be false for { key: 1, dogKey: 2, businessType: "pee", location: { latitude: "0.0", longitude: "0.0" } } with non-number latitude and longitude', () => {
      expect(isBusinessRecord({
        key: 1,
        dogKey: 2,
        businessType: 'pee',
        location: {
          latitude: '0.0',
          longitude: '0.0'
        },
        timestamp: new Date(2018, 5, 23)
      })).toBe(false)
    })

    it('should be false for { key: 1, dogKey: 2, businessType: "pee", location: { latitude: 0, longitude: 0 } } missing timestamp', () => {
      expect(isBusinessRecord({
        key: 1,
        dogKey: 2,
        businessType: 'pee',
        location: {
          latitude: 0,
          longitude: 0
        }
      })).toBe(false)
    })

    it('should be false for { key: 1, dogKey: 2, businessType: "pee", location: { latitude: 0, longitude: 0 }, timestamp: "2018-05-23" } with non-object timestamp', () => {
      expect(isBusinessRecord({
        key: 1,
        dogKey: 2,
        businessType: 'pee',
        location: {
          latitude: 0,
          longitude: 0
        },
        timestamp: '2018-05-23'
      })).toBe(false)
    })

    it('should be false for { key: 1, dogKey: 2, businessType: "pee", location: { latitude: 0, longitude: 0 }, timestamp: null } with null timestamp', () => {
      expect(isBusinessRecord({
        key: 1,
        dogKey: 2,
        businessType: 'pee',
        location: {
          latitude: 0,
          longitude: 0
        },
        timestamp: null
      })).toBe(false)
    })

    it('should be false for { key: 1, dogKey: 2, businessType: "pee", location: { latitude: 0, longitude: 0 }, timestamp: { year: 2020, month: 4, day: 23 } } with non-Date timestamp object', () => {
      expect(isBusinessRecord({
        key: 1,
        dogKey: 2,
        businessType: 'pee',
        location: {
          latitude: 35.6812,
          longitude: 139.7671
        },
        timestamp: {
          year: 2020,
          month: 4,
          day: 23
        }
      })).toBe(false)
    })
  })

  describe('isGuestBusinessRecord', () => {
    const businessRecord: GenericBusinessRecord = {
      key: 1,
      dogKey: 2,
      businessType: 'pee',
      location: {
        latitude: 35.6812,
        longitude: 139.7671
      },
      timestamp: new Date(2018, 5, 23)
    }

    it(`should be true for ${JSON.stringify(businessRecord)}`, () => {
      expect(isGuestBusinessRecord(businessRecord)).toBe(true)
    })

    it('should be false for { key: "record", dogKey: 2, businessType: "pee", location: { latitude: 0.0, longitude: 0.0 }, timestamp: 2018/05/23 } with non-number key', () => {
      expect(isGuestBusinessRecord({
        key: 'record',
        dogKey: 2,
        businessType: 'pee',
        location: {
          latitude: 0.0,
          longitude: 0.0
        },
        timestamp: new Date(2018, 5, 23)
      })).toBe(false)
    })

    it('should be false for { key: 1, dogKey: "dog", businessType: "pee", location: { latitude: 0.0, longitude: 0.0 }, timestamp: 2018/05/23 } with non-number dogKey', () => {
      expect(isGuestBusinessRecord({
        key: 1,
        dogKey: 'dog',
        businessType: 'pee',
        location: {
          latitude: 0.0,
          longitude: 0.0
        },
        timestamp: new Date(2018, 5, 23)
      })).toBe(false)
    })
  })

  describe('convertBusinessRecordToFeature', () => {
    it('should convert a business record into a GeoJSON Feature (number keys)', () => {
      expect(convertBusinessRecordToFeature({
        key: 1,
        dogKey: 2,
        businessType: 'pee',
        location: {
          latitude: 35.6812,
          longitude: 139.7671
        },
        timestamp: new Date(2018, 5, 23)
      })).toEqual({
        type: 'Feature',
        id: 1,
        geometry: {
          type: 'Point',
          coordinates: [139.7671, 35.6812]
        },
        properties: {
          recordKey: 1,
          dogKey: 2,
          businessType: 'pee',
          timestamp: new Date(2018, 5, 23).getTime()
        }
      })
    })

    it('should convert a business record into a GeoJSON Feature (string keys)', () => {
      expect(convertBusinessRecordToFeature({
        key: 'record',
        dogKey: 'dog',
        businessType: 'poo',
        location: {
          latitude: 40.4416,
          longitude: -80.0079
        },
        timestamp: new Date(2024, 1, 30, 6, 43, 0)
      })).toEqual({
        type: 'Feature',
        id: 'record',
        geometry: {
          type: 'Point',
          coordinates: [-80.0079, 40.4416]
        },
        properties: {
          recordKey: 'record',
          dogKey: 'dog',
          businessType: 'poo',
          timestamp: new Date(2024, 1, 30, 6, 43, 0).getTime()
        }
      })
    })
  })

  describe('convertBusinessRecordsToGeoJSON', () => {
    it('should convert business records into a GeoJSON FeatureCollection', () => {
      expect(convertBusinessRecordsToGeoJSON([
        {
          key: 1,
          dogKey: 2,
          businessType: 'pee',
          location: {
            latitude: 35.6812,
            longitude: 139.7671
          },
          timestamp: new Date(2018, 5, 23)
        },
        {
          key: 2,
          dogKey: 2,
          businessType: 'poo',
          location: {
            latitude: 40.4416,
            longitude: -80.0079
          },
          timestamp: new Date(2020, 11, 25)
        },
        {
          key: 100,
          dogKey: 2,
          businessType: 'poo',
          location: {
            latitude: -34.6037,
            longitude: -58.3816
          },
          timestamp: new Date(2024, 1, 30, 6, 43, 0)
        }
      ])).toEqual({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            id: 1,
            geometry: {
              type: 'Point',
              coordinates: [139.7671, 35.6812]
            },
            properties: {
              recordKey: 1,
              dogKey: 2,
              businessType: 'pee',
              timestamp: new Date(2018, 5, 23).getTime()
            }
          },
          {
            type: 'Feature',
            id: 2,
            geometry: {
              type: 'Point',
              coordinates: [-80.0079, 40.4416]
            },
            properties: {
              recordKey: 2,
              dogKey: 2,
              businessType: 'poo',
              timestamp: new Date(2020, 11, 25).getTime()
            }
          },
          {
            type: 'Feature',
            id: 100,
            geometry: {
              type: 'Point',
              coordinates: [-58.3816, -34.6037]
            },
            properties: {
              recordKey: 100,
              dogKey: 2,
              businessType: 'poo',
              timestamp: new Date(2024, 1, 30, 6, 43, 0).getTime()
            }
          }
        ]
      })
    })

    it('should produce empty FeatureCollection if no business records are provided', () => {
      expect(convertBusinessRecordsToGeoJSON([])).toEqual({
        type: 'FeatureCollection',
        features: []
      })
    })
  })
})
