import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from 'vue'

import type { LocationTracker } from '@/lib/location-tracker'
import {
  locationTrackerProvider,
  useLocationTracker
} from '@/stores/location-tracker'

describe('useLocationTracker', () => {
  describe('without location tracker provided', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
    })

    it('should throw Error', () => {
      expect(() => useLocationTracker()).toThrow(Error)
    })
  })

  describe('with locationTrackerProvider', () => {
    let locationTracker: LocationTracker
    const CURRENT_LOCATION = {
      // Tokyo station
      coords: {
        longitude: 139.7671,
        latitude: 35.6812
      },
      timestamp: Date.now()
    }

    beforeEach(() => {
      const app = createApp({})
      locationTracker = {
        async getCurrentLocation() {
          return CURRENT_LOCATION
        }
      }
      vi.spyOn(locationTracker, 'getCurrentLocation')
      const pinia = createPinia()
      app.use(pinia)
      app.use(locationTrackerProvider(locationTracker))
      setActivePinia(pinia)
    })

    it('should call LocationTracker.getCurrentLocation', () => {
      useLocationTracker()
      expect(locationTracker.getCurrentLocation).toHaveBeenCalled()
    })

    it('should have currentLocation at [35.6812° N, 139.7671° E]', async () => {
      const store = useLocationTracker()
      // awaits `getCurrentLocation` to make sure `currentLocation` is updated
      await locationTracker.getCurrentLocation()
      expect(store.currentLocation).toEqual(CURRENT_LOCATION)
    })
  })
})
