import type { Feature, FeatureCollection } from 'geojson'

import type { BusinessRecord } from './interfaces'

/**
 * Converts given business records into a GeoJSON FeatureCollection.
 *
 * @typeParam RecordKey
 *
 *   Type representing the key of a business record.
 *
 * @typeParam DogKey
 *
 *   Type representing the key of a dog who carried out the business.
 */
export function convertBusinessRecordsToGeoJSON<RecordKey, DogKey>(
  businessRecords: BusinessRecord<RecordKey, DogKey>[]
): FeatureCollection {
  const features: Feature[] =
    businessRecords.map(convertBusinessRecordToFeature)
  return {
    type: 'FeatureCollection',
    features
  }
}

/**
 * Converts a given business record into a GeoJSON Feature.
 *
 * @typeParam RecordKey
 *
 *   Type representing the key of a business record.
 *
 * @typeParam DogKey
 *
 *   Type representing the key of a dog who carried out the business.
 */
export function convertBusinessRecordToFeature<RecordKey, DogKey>(
  businessRecord: BusinessRecord<RecordKey, DogKey>
): Feature {
  const { businessType, dogKey, key: recordKey, location } = businessRecord
  const { latitude, longitude } = location
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [longitude, latitude]
    },
    properties: {
      recordKey,
      dogKey,
      businessType
    }
  }
}
