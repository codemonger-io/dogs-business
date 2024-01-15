import type { Feature, FeatureCollection } from 'geojson'

import { isMinimalGeolocationCoordinates } from '../../types/geolocation'
import type { BusinessRecord } from './interfaces'
import type { BusinessType } from './types'
import { BUSINESS_TYPES } from './types'

/** Returns if a given value is a {@link BusinessType}. */
export function isBusinessType(value: unknown): value is BusinessType {
  return BUSINESS_TYPES.indexOf(value as BusinessType) !== -1
}

/** Returns if a given value is a {@link BusinessRecord}. */
export function isBusinessRecord(value: unknown):
  value is BusinessRecord<unknown, unknown>
{
  if (typeof value !== 'object' || value == null) {
    return false
  }
  const maybeRecord = value as Partial<BusinessRecord<unknown, unknown>>
  if (maybeRecord.key === undefined) {
    return false
  }
  if (maybeRecord.dogKey === undefined) {
    return false
  }
  if (!isBusinessType(maybeRecord.businessType)) {
    return false
  }
  if (!isMinimalGeolocationCoordinates(maybeRecord.location)) {
    return false
  }
  return true
}

/**
 * Returns if a given business record may be one carried out by a dog friend of
 * a guest account.
 */
export function isGuestBusinessRecord(
  record: BusinessRecord<unknown, unknown>
): record is BusinessRecord<number, number> {
  if (typeof record.key !== 'number') {
    return false
  }
  if (typeof record.dogKey !== 'number') {
    return false
  }
  return true
}

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
