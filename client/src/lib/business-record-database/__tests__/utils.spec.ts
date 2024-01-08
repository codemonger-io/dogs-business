import { describe, expect, it } from 'vitest'

import {
  convertBusinessRecordToFeature,
  convertBusinessRecordsToGeoJSON
} from '@/lib/business-record-database'

describe('business-record-database.utils', () => {
  describe('convertBusinessRecordToFeature', () => {
    it('should convert a business record into a GeoJSON Feature (number keys)', () => {
      expect(convertBusinessRecordToFeature({
        key: 1,
        dogKey: 2,
        businessType: 'pee',
        location: {
          latitude: 35.6812,
          longitude: 139.7671
        }
      })).toEqual({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [139.7671, 35.6812]
        },
        properties: {
          recordKey: 1,
          dogKey: 2,
          businessType: 'pee'
        }
      })
    })

    it('should convert a business record into a GeoJSON Feature (string keys)', () => {
      expect(convertBusinessRecordToFeature({
        key: 'Point State Park',
        dogKey: 'pittbull',
        businessType: 'poo',
        location: {
          latitude: 40.4416,
          longitude: -80.0079
        }
      })).toEqual({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [-80.0079, 40.4416]
        },
        properties: {
          recordKey: 'Point State Park',
          dogKey: 'pittbull',
          businessType: 'poo'
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
          }
        },
        {
          key: 2,
          dogKey: 2,
          businessType: 'poo',
          location: {
            latitude: 40.4416,
            longitude: -80.0079
          }
        },
        {
          key: 100,
          dogKey: 2,
          businessType: 'poo',
          location: {
            latitude: -34.6037,
            longitude: -58.3816
          }
        }
      ])).toEqual({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [139.7671, 35.6812]
            },
            properties: {
              recordKey: 1,
              dogKey: 2,
              businessType: 'pee'
            }
          },
          {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [-80.0079, 40.4416]
            },
            properties: {
              recordKey: 2,
              dogKey: 2,
              businessType: 'poo'
            }
          },
          {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [-58.3816, -34.6037]
            },
            properties: {
              recordKey: 100,
              dogKey: 2,
              businessType: 'poo'
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
