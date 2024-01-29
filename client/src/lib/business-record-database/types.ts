import type { MinimalGeolocationCoordinates } from '../../types/geolocation'

/** Possible business types. */
export const BUSINESS_TYPES = ['pee', 'poo'] as const

/** Business type. */
export type BusinessType = typeof BUSINESS_TYPES[number]

/** Parameters for a business record. */
export interface BusinessRecordParams {
  /** Business type. */
  businessType: BusinessType

  /** Location where the business was carried out. */
  location: MinimalGeolocationCoordinates

  /** Timestamp when the business was carried out. */
  timestamp: Date
}

/**
 * Parameters for a business record of a specific dog.
 *
 * @typeParam DogKey
 *
 *   Type representing dog keys.
 */
export interface BusinessRecordParamsOfDog<DogKey>
  extends BusinessRecordParams
{
  /** Key of the dog who carried out the business. */
  dogKey: DogKey
}
