import './assets/main.scss'

import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import { createPinia } from 'pinia'

import Buefy from '@ntohq/buefy-next'

import App from './App.vue'
import mapboxConfig from './configs/mapbox-config'
import type { AccountInfo, GuestAccountInfo } from './lib/account-manager'
import { AccountManagerImpl } from './lib/account-manager'
import type { Dog } from './lib/dog-database'
import { IndexedDBDriver } from './lib/indexeddb'
import type {
  LocationTrackerEvent,
  LocationTrackerEventListener
} from './lib/location-tracker'
import {
  accountManagerProvider,
  businessRecordDatabaseManagerProvider,
  dogDatabaseManagerProvider
} from './stores/account-manager'
import { locationTrackerProvider } from './stores/location-tracker'
import router from './router'
import messages from './i18n'

const i18n = createI18n({
  legacy: false, // prefers the composition API
  locale: 'ja',
  fallbackLocale: 'en',
  messages,
})

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(i18n)
// @ts-ignore
app.use(Buefy)

const indexedDBDriver = new IndexedDBDriver()

app.use(accountManagerProvider(new AccountManagerImpl()))
app.use(dogDatabaseManagerProvider({
  async getGuestDogDatabase() {
    const connection = await indexedDBDriver.open()
    return connection.getDogStore()
  }
}))
app.use(businessRecordDatabaseManagerProvider({
  async getGuestBusinessRecordDatabase() {
    const connection = await indexedDBDriver.open()
    return connection.getBusinessRecordStore()
  }
}))

const locationListeners: LocationTrackerEventListener[] = []
function notifyLocationListeners(event: LocationTrackerEvent) {
  locationListeners.forEach((l) => l(event))
}
let locationWatchId: number | undefined = undefined
app.use(locationTrackerProvider({
  addListener(listener: LocationTrackerEventListener) {
    locationListeners.push(listener)
    return () => {
      const index = locationListeners.indexOf(listener)
      if (index !== -1) {
        locationListeners.splice(index, 1)
      }
    }
  },
  startTracking() {
    if (locationWatchId != null) {
      console.warn('already tracking location')
      return
    }
    if (typeof navigator.geolocation === 'undefined') {
      throw new Error('navigator.geolocation is unavailable')
    }
    locationWatchId = navigator.geolocation.watchPosition(
      (location) => {
        notifyLocationListeners({ type: 'location_change', location })
      },
      (err) => {
        console.error('location tracking error:', err)
        switch (err.code) {
          case 1: // PERMISSION_DENIED
            notifyLocationListeners({ type: 'permission_denied' })
            break
          case 2: // POSITION_UNAVAILABLE
            notifyLocationListeners({ type: 'unavailable' })
            break
          case 3: // TIMEOUT
            console.warn('location tracking timeout')
            break
          default:
            console.warn(`unknown location tracking error: ${err.code}`)
        }
      },
      {
        maximumAge: 3000,
        timeout: 3000,
        enableHighAccuracy: true
      }
    )
  },
  stopTracking() {
    if (locationWatchId == null) {
      console.warn('not tracking location')
      return
    }
    if (typeof navigator.geolocation === 'undefined') {
      throw new Error('navigator.geolocation is unavailable')
    }
    navigator.geolocation.clearWatch(locationWatchId)
    locationWatchId = undefined
    notifyLocationListeners({ type: 'tracking_stopped' })
  }
}))

app.mount('#app')
