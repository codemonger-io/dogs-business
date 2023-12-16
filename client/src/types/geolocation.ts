/**
 * Minimal geolocation position.
 *
 * @remarks
 *
 * {@link GeolocationPosition} but `coords` replaced with
 * {@link MinimalGeolocationCoordinates}.
 */
export type MinimalGeolocationPosition = Omit<GeolocationPosition, 'coords'> & {
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
