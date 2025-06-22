/**
 * Minimal geolocation position.
 *
 * @remarks
 *
 * {@link GeolocationPosition} but `coords` replaced with
 * {@link MinimalGeolocationCoordinates} and omits `toJSON`.
 */
export type MinimalGeolocationPosition = Pick<GeolocationPosition, 'timestamp'> & {
  /** Minimal geolocation coordinates. */
  coords: MinimalGeolocationCoordinates
}

/**
 * Minimal geolocation coordinates.
 *
 * @remarks
 *
 * {@link GeolocationCoordinates} but all the properties other than `latitude`
 * and `longitude` are optional.
 */
export type MinimalGeolocationCoordinates =
  Partial<Omit<GeolocationCoordinates, 'latitude' | 'longitude'>> &
  Pick<GeolocationCoordinates, 'latitude' | 'longitude'>

/** Returns if a given value is a {@link MinimalGeolocationCoordinates}. */
export function isMinimalGeolocationCoordinates(value: unknown):
  value is MinimalGeolocationCoordinates
{
  if (typeof value !== 'object' || value == null) {
    return false
  }
  const maybeCoords = value as Partial<MinimalGeolocationCoordinates>
  if (typeof maybeCoords.latitude !== 'number') {
    return false
  }
  if (typeof maybeCoords.longitude !== 'number') {
    return false
  }
  return true
}
