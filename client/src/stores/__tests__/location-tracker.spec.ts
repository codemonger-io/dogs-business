import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from 'vue'

import type {
  LocationTracker,
  LocationTrackerEvent,
  LocationTrackerEventListener
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
    let listeners: LocationTrackerEventListener[]
    let store: ReturnType<typeof useLocationTracker>

    function notify(event: LocationTrackerEvent) {
      listeners.forEach((l) => l(event))
    }

    beforeEach(() => {
      const app = createApp({})
      listeners = []
      locationTracker = {
        addListener(listener: LocationTrackerEventListener) {
          listeners.push(listener)
          return () => {
            listeners.splice(listeners.indexOf(listener), 1)
          }
        },
        startTracking() {},
        stopTracking() {}
      }
      vi.spyOn(locationTracker, 'addListener')
      vi.spyOn(locationTracker, 'startTracking')
      vi.spyOn(locationTracker, 'stopTracking')
      const pinia = createPinia()
      app.use(pinia)
      app.use(locationTrackerProvider(locationTracker))
      setActivePinia(pinia)
      store = useLocationTracker()
    })

    it('should call LocationTracker.addListener', () => {
      expect(locationTracker.addListener).toHaveBeenCalled()
    })

    it('should be in "untracking" state', () => {
      expect(store.state).toBe('untracking')
    })

    it('should have currentLocation undefined', () => {
      expect(store.currentLocation).toBeUndefined()
    })

    describe('startTracking', () => {
      beforeEach(() => {
        store.startTracking()
      })

      it('should call LocationTracker.startTracking', () => {
        expect(locationTracker.startTracking).toHaveBeenCalled()
      })

      it('should be in "starting_tracking" state', () => {
        expect(store.state).toBe('starting_tracking')
      })

      it('should have currentLocation undefined', () => {
        expect(store.currentLocation).toBeUndefined()
      })

      describe('updating location with [35.6812° N, 139.7671° E]', async () => {
        const LOCATION_1 = {
          // Tokyo station
          coords: {
            longitude: 139.7671,
            latitude: 35.6812
          },
          timestamp: Date.now()
        }

        beforeEach(() => {
          notify({
            type: 'location_change',
            location: LOCATION_1
          })
        })

        it('should be in "tracking" state', () => {
          expect(store.state).toBe('tracking')
        })

        it('should have currentLocation at [35.6812° N, 139.7671° E]', () => {
          expect(store.currentLocation).toEqual(LOCATION_1)
        })

        describe('updating location with [40.4416° N, 80.0079° W]', async () => {
          const LOCATION_2 = {
            // Point State Park, Pittsburgh, PA
            coords: {
              longitude: -80.0079,
              latitude: 40.4416
            },
            timestamp: Date.now()
          }

          beforeEach(() => {
            notify({
              type: 'location_change',
              location: LOCATION_2
            })
          })

          it('should have currentLocation at [40.4416° N, 80.0079° W]', () => {
            expect(store.currentLocation).toEqual(LOCATION_2)
          })
        })

        describe('stopTracking', () => {
          beforeEach(() => {
            store.stopTracking()
          })

          it('should call LocationTracker.stopTracking', () => {
            expect(locationTracker.stopTracking).toHaveBeenCalled()
          })

          it('should be in "untracking" state', () => {
            expect(store.state).toBe('untracking')
          })

          it('should have currentLocation undefined', () => {
            expect(store.currentLocation).toBeUndefined()
          })
        })

        describe('startTracking', () => {
          beforeEach(() => {
            vi.mocked(locationTracker.startTracking).mockClear()
            store.startTracking()
          })

          it('should not call LocationTracker.startTracking', () => {
            expect(locationTracker.startTracking).not.toHaveBeenCalled()
          })

          it('should be in "tracking" state', () => {
            expect(store.state).toBe('tracking')
          })
        })

        describe('notifying with "tracking_stopped"', () => {
          beforeEach(() => {
            notify({ type: 'tracking_stopped' })
          })

          it('should be in "untracking" state', () => {
            expect(store.state).toBe('untracking')
          })

          it('should have currentLocation undefined', () => {
            expect(store.currentLocation).toBeUndefined()
          })
        })

        describe('failing with "permission_denied"', () => {
          beforeEach(() => {
            notify({ type: 'permission_denied' })
          })

          it('should be in "permission_denied" state', () => {
            expect(store.state).toBe('permission_denied')
          })

          it('should have currentLocation undefined', () => {
            expect(store.currentLocation).toBeUndefined()
          })
        })

        describe('failing with "unavailable"', () => {
          beforeEach(() => {
            notify({ type: 'unavailable' })
          })

          it('should be in "unavailable" state', () => {
            expect(store.state).toBe('unavailable')
          })

          it('should have currentLocation undefined', () => {
            expect(store.currentLocation).toBeUndefined()
          })
        })
      })

      describe('stopTracking', () => {
        beforeEach(() => {
          store.stopTracking()
        })

        it('should call LocationTracker.stopTracking', () => {
          expect(locationTracker.stopTracking).toHaveBeenCalled()
        })

        it('should be in "untracking" state', () => {
          expect(store.state).toBe('untracking')
        })
      })

      describe('startTracking', () => {
        beforeEach(() => {
          vi.mocked(locationTracker.startTracking).mockClear()
          store.startTracking()
        })

        it('should not call LocationTracker.startTracking', () => {
          expect(locationTracker.startTracking).not.toHaveBeenCalled()
        })

        it('should be in "starting_tracking" state', () => {
          expect(store.state).toBe('starting_tracking')
        })
      })

      describe('notifying with "tracking_stopped"', () => {
        beforeEach(() => {
          notify({ type: 'tracking_stopped' })
        })

        it('should be in "untracking" state', () => {
          expect(store.state).toBe('untracking')
        })

        it('should have currentLocation undefined', () => {
          expect(store.currentLocation).toBeUndefined()
        })
      })

      describe('failing with "permission_denied"', () => {
        beforeEach(() => {
          notify({ type: 'permission_denied' })
        })

        it('should be in "permission_denied" state', () => {
          expect(store.state).toBe('permission_denied')
        })

        it('should have currentLocation undefined', () => {
          expect(store.currentLocation).toBeUndefined()
        })

        describe('stopTracking', () => {
          beforeEach(() => {
            store.stopTracking()
          })

          it('should not call LocationTracker.stopTracking', () => {
            expect(locationTracker.stopTracking).not.toHaveBeenCalled()
          })

          it('should not reset error state; i.e., be in "permission_denied" state', () => {
            expect(store.state).toBe('permission_denied')
          })
        })

        describe('startTracking', () => {
          beforeEach(() => {
            store.startTracking()
          })

          it('should reset error state; i.e., be in "starting_tracking" state', () => {
            expect(store.state).toBe('starting_tracking')
          })
        })
      })

      describe('failing with "unavailable"', () => {
        beforeEach(() => {
          notify({ type: 'unavailable' })
        })

        it('should be in "unavailable" state', () => {
          expect(store.state).toBe('unavailable')
        })

        it('should have currentLocation undefined', () => {
          expect(store.currentLocation).toBeUndefined()
        })

        describe('stopTracking', () => {
          beforeEach(() => {
            store.stopTracking()
          })

          it('should not call LocationTracker.stopTracking', () => {
            expect(locationTracker.stopTracking).not.toHaveBeenCalled()
          })

          it('should not reset error state; i.e., be in "unavailable" state', () => {
            expect(store.state).toBe('unavailable')
          })
        })

        describe('startTracking', () => {
          beforeEach(() => {
            store.startTracking()
          })

          it('should reset error state; i.e., be in "starting_tracking" state', () => {
            expect(store.state).toBe('starting_tracking')
          })
        })
      })
    })

    describe('stopTracking', () => {
      beforeEach(() => {
        store.stopTracking()
      })

      it('should not call LocationTracker.stopTracking', () => {
        expect(locationTracker.stopTracking).not.toHaveBeenCalled()
      })

      it('should be in "untracking" state', () => {
        expect(store.state).toBe('untracking')
      })
    })
  })
})
