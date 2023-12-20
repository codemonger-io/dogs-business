import type { MinimalGeolocationPosition } from '../../types/geolocation'

/**
 * Interface of location trackers.
 *
 * @remarks
 *
 * First, add a listener for {@link LocationTrackerEvent}s, and then call
 * {@link startTracking}.
 *
 * ```ts
 * locationTracker.addListener((event) => {
 *   // ... handle events
 * })
 * locationTracker.startTracking()
 * ```
 */
export interface LocationTracker {
  /**
   * Adds a listener of events from the location tracker.
   *
   * @returns
   *
   *   Function to remove the listener.
   */
  addListener(listener: LocationTrackerEventListener): () => void

  /**
   * Starts tracking the location.
   *
   * @throws Error
   *
   *   The browser does not support the Geolocation API.
   */
  startTracking(): void

  /**
   * Stops tracking the location.
   *
   * @throws Error
   *
   *   The browser does not support the Geolocation API.
   */
  stopTracking(): void
}

/** Event from {@link LocationTracker}. */
export type LocationTrackerEvent =
  | LocationChangeEvent
  | TrackingStoppedEvent
  | PermissionDeniedEvent
  | UnavailableEvent

/** Event notified when the location has changed. */
export type LocationChangeEvent = {
  type: 'location_change',
  location: MinimalGeolocationPosition
}

/** Event notified when the tracking has stopped. */
export type TrackingStoppedEvent = {
  type: 'tracking_stopped'
}

/**
 * Event notified when the location tracking was not allowed.
 *
 * @remarks
 *
 * Corresponds to `GeolocationPositionError.code = 1`.
 */
export type PermissionDeniedEvent = {
  type: 'permission_denied'
}

/**
 * Event notified when the location tracking is not available.
 *
 * @remarks
 *
 * Corresponds to `GeolocationPositionError.code = 2`.
 */
export type UnavailableEvent = {
  type: 'unavailable'
}

/** Listener of location changes. */
export type LocationTrackerEventListener = (event: LocationTrackerEvent) => void
