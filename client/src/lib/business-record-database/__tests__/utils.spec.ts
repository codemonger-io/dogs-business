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
      recordId: 1,
      dogId: 2,
      businessType: 'pee',
      location: {
        latitude: 35.6812,
        longitude: 139.7671
      },
      timestamp: 1527001200
    }
    const businessRecord2 = {
      recordId: 'record',
      dogId: 'dog',
      businessType: 'poo',
      location: {
        latitude: 40.4416,
        longitude: -80.0079
      },
      timestamp: 1706564580
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

    it('should be false for { dogId: 2, businessType: "pee", location: { latitude: 0.0, longitude: 0.0, timestamp: 0 }, timestamp: 0 } missing recordId', () => {
      expect(isBusinessRecord({
        dogId: 2,
        businessType: 'pee',
        location: {
          latitude: 0.0,
          longitude: 0.0
        },
        timestamp: 0
      })).toBe(false)
    })

    it('should be false for { recordId: 1, businessType: "pee", location: { latitude: 0.0, longitude: 0.0 }, timestamp: 0 } missing dogId', () => {
      expect(isBusinessRecord({
        recordId: 1,
        businessType: 'pee',
        location: {
          latitude: 0.0,
          longitude: 0.0
        },
        timestamp: 0
      })).toBe(false)
    })

    it('should be false for { recordId: 1, dogId: 2, location: { latitude: 0.0, longitude: 0.0 }, timestamp: 0 } missing businessType', () => {
      expect(isBusinessRecord({
        recordId: 1,
        dogId: 2,
        location: {
          latitude: 0.0,
          longitude: 0.0
        },
        timestamp: 0
      })).toBe(false)
    })

    it('should be false for { recordId: 1, dogId: 2, businessType: "bark", location: { latitude: 0.0, longitude: 0.0 }, timestamp: 0 } with invalid businessType', () => {
      expect(isBusinessRecord({
        recordId: 1,
        dogId: 2,
        businessType: 'bark',
        location: {
          latitude: 0.0,
          longitude: 0.0
        },
        timestamp: 0
      })).toBe(false)
    })

    it('should be false for { recordId: 1, dogId: 2, businessType: "pee", timestamp: 0 } missing location',  () => {
      expect(isBusinessRecord({
        recordId: 1,
        dogId: 2,
        businessType: 'pee',
        timestamp: 0
      })).toBe(false)
    })

    it('should be false for { recordId: 1, dogId: 2, businessType: "pee", location: "139.7671,35.6812", timestamp: 0 } with non-object location', () => {
      expect(isBusinessRecord({
        recordId: 1,
        dogId: 2,
        businessType: 'pee',
        location: '139.7671,35.6812',
        timestamp: 0
      })).toBe(false)
    })

    it('should be false for { recordId: 1, dogId: 2, businessType: "pee", location: { latitude: "0.0", longitude: "0.0" }, timestamp: 0 } with non-number latitude and longitude', () => {
      expect(isBusinessRecord({
        recordId: 1,
        dogId: 2,
        businessType: 'pee',
        location: {
          latitude: '0.0',
          longitude: '0.0'
        },
        timestamp: 0
      })).toBe(false)
    })

    it('should be false for { recordId: 1, dogId: 2, businessType: "pee", location: { latitude: 0, longitude: 0 } } missing timestamp', () => {
      expect(isBusinessRecord({
        recordId: 1,
        dogId: 2,
        businessType: 'pee',
        location: {
          latitude: 0,
          longitude: 0
        }
      })).toBe(false)
    })

    it('should be false for { recordId: 1, dogId: 2, businessType: "pee", location: { latitude: 0, longitude: 0 }, timestamp: Date(2018,05,23) } with non-number timestamp', () => {
      expect(isBusinessRecord({
        recordId: 1,
        dogId: 2,
        businessType: 'pee',
        location: {
          latitude: 0,
          longitude: 0
        },
        timestamp: new Date(2018, 5, 23)
      })).toBe(false)
    })

    it('should be false for { recordId: 1, dogId: 2, businessType: "pee", location: { latitude: 0, longitude: 0 }, timestamp: null } with null timestamp', () => {
      expect(isBusinessRecord({
        recordId: 1,
        dogId: 2,
        businessType: 'pee',
        location: {
          latitude: 0,
          longitude: 0
        },
        timestamp: null
      })).toBe(false)
    })
  })

  describe('isGuestBusinessRecord', () => {
    const businessRecord: GenericBusinessRecord = {
      recordId: 1,
      dogId: 2,
      businessType: 'pee',
      location: {
        latitude: 35.6812,
        longitude: 139.7671
      },
      timestamp: 1527001200
    }

    it(`should be true for ${JSON.stringify(businessRecord)}`, () => {
      expect(isGuestBusinessRecord(businessRecord)).toBe(true)
    })

    it('should be false for { recordId: "record", dogId: 2, businessType: "pee", location: { latitude: 0.0, longitude: 0.0 }, timestamp: 0 } with non-number recordId', () => {
      expect(isGuestBusinessRecord({
        recordId: 'record',
        dogId: 2,
        businessType: 'pee',
        location: {
          latitude: 0.0,
          longitude: 0.0
        },
        timestamp: 0
      })).toBe(false)
    })

    it('should be false for { recordId: 1, dogId: "dog", businessType: "pee", location: { latitude: 0.0, longitude: 0.0 }, timestamp: 0 } with non-number dogId', () => {
      expect(isGuestBusinessRecord({
        recordId: 1,
        dogId: 'dog',
        businessType: 'pee',
        location: {
          latitude: 0.0,
          longitude: 0.0
        },
        timestamp: 0
      })).toBe(false)
    })
  })

  describe('convertBusinessRecordToFeature', () => {
    it('should convert a business record into a GeoJSON Feature (number keys)', () => {
      expect(convertBusinessRecordToFeature({
        recordId: 1,
        dogId: 2,
        businessType: 'pee',
        location: {
          latitude: 35.6812,
          longitude: 139.7671
        },
        timestamp: 1527001200
      })).toEqual({
        type: 'Feature',
        id: 1,
        geometry: {
          type: 'Point',
          coordinates: [139.7671, 35.6812]
        },
        properties: {
          recordId: 1,
          dogId: 2,
          businessType: 'pee',
          timestamp: 1527001200
        }
      })
    })

    it('should convert a business record into a GeoJSON Feature (string keys)', () => {
      expect(convertBusinessRecordToFeature({
        recordId: 'record',
        dogId: 'dog',
        businessType: 'poo',
        location: {
          latitude: 40.4416,
          longitude: -80.0079
        },
        timestamp: 1706564580
      })).toEqual({
        type: 'Feature',
        id: 'record',
        geometry: {
          type: 'Point',
          coordinates: [-80.0079, 40.4416]
        },
        properties: {
          recordId: 'record',
          dogId: 'dog',
          businessType: 'poo',
          timestamp: 1706564580
        }
      })
    })
  })

  describe('convertBusinessRecordsToGeoJSON', () => {
    it('should convert business records into a GeoJSON FeatureCollection', () => {
      expect(convertBusinessRecordsToGeoJSON([
        {
          recordId: 1,
          dogId: 2,
          businessType: 'pee',
          location: {
            latitude: 35.6812,
            longitude: 139.7671
          },
          timestamp: 1527001200
        },
        {
          recordId: 2,
          dogId: 2,
          businessType: 'poo',
          location: {
            latitude: 40.4416,
            longitude: -80.0079
          },
          timestamp: 1606230000
        },
        {
          recordId: 100,
          dogId: 2,
          businessType: 'poo',
          location: {
            latitude: -34.6037,
            longitude: -58.3816
          },
          timestamp: 1706564580
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
              recordId: 1,
              dogId: 2,
              businessType: 'pee',
              timestamp: 1527001200
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
              recordId: 2,
              dogId: 2,
              businessType: 'poo',
              timestamp: 1606230000
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
              recordId: 100,
              dogId: 2,
              businessType: 'poo',
              timestamp: 1706564580
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
