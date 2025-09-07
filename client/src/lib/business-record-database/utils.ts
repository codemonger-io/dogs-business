import type { Feature, FeatureCollection } from 'geojson'

import { isMinimalGeolocationCoordinates } from '../../types/geolocation'
import type { BusinessRecord, GenericBusinessRecord } from './interfaces'
import type { BusinessType } from './types'
import { BUSINESS_TYPES } from './types'

/** Returns if a given value is a {@link BusinessType}. */
export function isBusinessType(value: unknown): value is BusinessType {
  return BUSINESS_TYPES.indexOf(value as BusinessType) !== -1
}

/** Returns if a given value is a {@link BusinessRecord}. */
export function isBusinessRecord(value: unknown):
  value is GenericBusinessRecord
{
  if (typeof value !== 'object' || value == null) {
    return false
  }
  const maybeRecord = value as Partial<GenericBusinessRecord>
  if (maybeRecord.recordId === undefined) {
    return false
  }
  if (maybeRecord.dogId === undefined) {
    return false
  }
  if (!isBusinessType(maybeRecord.businessType)) {
    return false
  }
  if (!isMinimalGeolocationCoordinates(maybeRecord.location)) {
    return false
  }
  if (typeof maybeRecord.timestamp !== 'number') {
    return false
  }
  return true
}

/**
 * Returns if a given business record may be one carried out by a dog friend of
 * a guest account.
 */
export function isGuestBusinessRecord(
  record: GenericBusinessRecord
): record is BusinessRecord<number, number> {
  if (typeof record.recordId !== 'number') {
    return false
  }
  if (typeof record.dogId !== 'number') {
    return false
  }
  return true
}

/**
 * Converts given business records into a GeoJSON FeatureCollection.
 *
 * @typeParam RecordId
 *
 *   Type representing the ID of a business record.
 *
 * @typeParam DogId
 *
 *   Type representing the ID of a dog who carried out the business.
 */
export function convertBusinessRecordsToGeoJSON<
  RecordId extends number | string,
  DogId extends number | string
>(
  businessRecords: BusinessRecord<RecordId, DogId>[]
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
 * @remarks
 *
 * `recordId` of the given business record is used as `id` of the returned
 * feature.
 *
 * `timestamp` is represented as the number of seconds elapsed since
 * 00:00:00 on January 1, 1970 UTC.
 *
 * @typeParam RecordId
 *
 *   Type representing the ID of a business record.
 *
 * @typeParam DogId
 *
 *   Type representing the ID of a dog who carried out the business.
 */
export function convertBusinessRecordToFeature<
  RecordId extends number | string,
  DogId extends number | string
>(
  businessRecord: BusinessRecord<RecordId, DogId>
): Feature {
  const {
    businessType,
    dogId,
    recordId,
    location,
    timestamp
  } = businessRecord
  const { latitude, longitude } = location
  return {
    type: 'Feature',
    id: recordId,
    geometry: {
      type: 'Point',
      coordinates: [longitude, latitude]
    },
    properties: {
      recordId,
      dogId,
      businessType,
      timestamp,
    }
  }
}
