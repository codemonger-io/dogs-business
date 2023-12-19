import { defineStore } from 'pinia'
import { type App, type InjectionKey, inject, ref } from 'vue'

import type { LocationTracker } from '../lib/location-tracker'
import type { MinimalGeolocationPosition } from '../types/geolocation'

/** Injection key for the instance of {@link LocationTracker}. */
export const LOCATION_TRACKER_INJECTION_KEY =
  Symbol() as InjectionKey<LocationTracker>

/**
 * Pinia store for the location tracker.
 *
 * @remarks
 *
 * The instance of {@link LocationTracker} is supposed to be provided by the
 * host Vue application.
 *
 * @throws Error
 *
 *   If no {@link LocationTracker} is provided.
 */
export const useLocationTracker = defineStore('location-tracker', () => {
  const locationTracker = inject(LOCATION_TRACKER_INJECTION_KEY)
  if (locationTracker == null) {
    throw new Error('no location tracker is provided')
  }

  const lastError = ref<any>()

  const currentLocation = ref<MinimalGeolocationPosition>()

  const locationChanged = (location: MinimalGeolocationPosition) => {
    currentLocation.value = location
  }

  locationTracker.getCurrentLocation()
    .then(locationChanged)
    .catch((err: any) => {
      console.error('failed to get current location', err)
      lastError.value = err
    })

  const startTracking = async () => {
    locationTracker.addLocationChangeListener(locationChanged)
    try {
      await locationTracker.startTracking()
    } catch (err) {
      locationTracker.removeLocationChangeListener(locationChanged)
      throw err
    }
  }

  const stopTracking = async () => {
    locationTracker.removeLocationChangeListener(locationChanged)
    await locationTracker.stopTracking()
  }

  return { currentLocation, startTracking, stopTracking }
})

/**
 * Provides the location tracker.
 *
 * @remarks
 *
 * Returns a Vue plugin that you can use in a Vue app you want to provide with
 * a location tracker.
 *
 * ```
 * import { createApp } from 'vue'
 * const app = createApp()
 * app.use(locationTrackerProvider({
 *   // location tracker implementation
 * }))
 * ```
 */
export function locationTrackerProvider(locationTracker: LocationTracker) {
  return (app: App) => {
    app.provide(LOCATION_TRACKER_INJECTION_KEY, locationTracker)
  }
}
