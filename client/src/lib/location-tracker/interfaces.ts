import type { MinimalGeolocationPosition } from '../../types/geolocation'

/** Interface of location trackers. */
export interface LocationTracker {
  /** Adds a listener of location changes. */
  addLocationChangeListener(listener: LocationChangeListener): void

  /** Removes a listener of location changes. */
  removeLocationChangeListener(listener: LocationChangeListener): void

  /** Obtains the current location. */
  getCurrentLocation(): Promise<MinimalGeolocationPosition>

  /** Starts tracking the location. */
  startTracking(): Promise<void>

  /** Stops tracking the location. */
  stopTracking(): Promise<void>
}

/** Listener of location changes. */
export type LocationChangeListener =
  (location: MinimalGeolocationPosition) => void
