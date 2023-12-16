import type { MinimalGeolocationPosition } from '../../types/geolocation'

/** Interface of location trackers. */
export interface LocationTracker {
  /** Obtains the current location. */
  getCurrentLocation(): Promise<MinimalGeolocationPosition>
}
