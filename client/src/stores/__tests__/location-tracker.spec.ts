import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from 'vue'

import type {
  LocationChangeListener,
  LocationTracker
} from '@/lib/location-tracker'
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
    let listeners: LocationChangeListener[]
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
      listeners = []
      locationTracker = {
        addLocationChangeListener(listener: LocationChangeListener) {
          listeners.push(listener)
        },
        removeLocationChangeListener(listener: LocationChangeListener) {
          listeners.splice(listeners.indexOf(listener), 1)
        },
        async getCurrentLocation() {
          return CURRENT_LOCATION
        },
        async startTracking() {},
        async stopTracking() {}
      }
      vi.spyOn(locationTracker, 'addLocationChangeListener')
      vi.spyOn(locationTracker, 'removeLocationChangeListener')
      vi.spyOn(locationTracker, 'getCurrentLocation')
      vi.spyOn(locationTracker, 'startTracking')
      vi.spyOn(locationTracker, 'stopTracking')
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

    describe('startTracking', () => {
      let store: ReturnType<typeof useLocationTracker>

      beforeEach(() => {
        store = useLocationTracker()
        store.startTracking()
      })

      it('should call LocationTracker.startTracking', () => {
        expect(locationTracker.startTracking).toHaveBeenCalled()
      })

      it('should call LocationTracker.addLocationChangeListener', () => {
        expect(locationTracker.addLocationChangeListener).toHaveBeenCalled()
      })

      describe('updating location with [40.4416° N, 80.0079° W]', async () => {
        const NEW_LOCATION = {
          // Point State Park, Pittsburgh, PA
          coords: {
            longitude: -80.0079,
            latitude: 40.4416
          },
          timestamp: Date.now()
        }

        beforeEach(() => {
          listeners.forEach((listener) => listener(NEW_LOCATION))
        })

        it('should have currentLocation at [40.4416° N, 80.0079° W]', () => {
          expect(store.currentLocation).toEqual(NEW_LOCATION)
        })
      })

      describe('stopTracking', () => {
        beforeEach(() => {
          store.stopTracking()
        })

        it('should call LocationTracker.stopTracking', () => {
          expect(locationTracker.stopTracking).toHaveBeenCalled()
        })

        it('should call LocationTracker.removeLocationChangeListener', () => {
          expect(locationTracker.removeLocationChangeListener).toHaveBeenCalled()
        })
      })
    })
  })
})
