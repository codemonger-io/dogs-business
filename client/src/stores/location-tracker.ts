import { defineStore } from 'pinia'
import { type App, type InjectionKey, inject, ref } from 'vue'

import type { LocationTracker } from '../lib/location-tracker'
import type { MinimalGeolocationPosition } from '../types/geolocation'

/** Injection key for the instance of {@link LocationTracker}. */
export const LOCATION_TRACKER_INJECTION_KEY =
  Symbol() as InjectionKey<LocationTracker>

/** State of the location tracker. */
export type LocationTrackerState =
  | 'untracking'
  | 'starting_tracking'
  | 'tracking'
  | 'permission_denied'
  | 'unavailable'

const TRACKING_STATES = ['starting_tracking', 'tracking']

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

  const state = ref<LocationTrackerState>('untracking')
  const currentLocation = ref<MinimalGeolocationPosition>()

  // TODO: I think the following code is not HMR-ready. Listeners will leak
  //       every time HMR occurs.
  locationTracker.addListener((event) => {
    switch (event.type) {
      case 'location_change':
        state.value = 'tracking'
        currentLocation.value = event.location
        break
      case 'tracking_stopped':
        state.value = 'untracking'
        currentLocation.value = undefined
        break
      case 'permission_denied':
        state.value = 'permission_denied'
        currentLocation.value = undefined
        break
      case 'unavailable':
        state.value = 'unavailable'
        currentLocation.value = undefined
        break
      default: {
        // exhaustive cases must not lead here
        const unreachable: never = event
        console.warn(`unknown location tracker event: ${event}`)
      }
    }
  })

  const startTracking = () => {
    if (TRACKING_STATES.includes(state.value)) {
      return
    }
    try {
      state.value = 'starting_tracking'
      locationTracker.startTracking()
    } catch (err) {
      state.value = 'unavailable'
      throw err
    }
  }

  const stopTracking = () => {
    if (!TRACKING_STATES.includes(state.value)) {
      return
    }
    locationTracker.stopTracking()
    state.value = 'untracking'
    currentLocation.value = undefined
  }

  return { currentLocation, startTracking, state, stopTracking }
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
