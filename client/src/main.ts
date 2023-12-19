import './assets/main.scss'

import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import { createPinia } from 'pinia'

import Buefy from '@ntohq/buefy-next'

import App from './App.vue'
import mapboxConfig from './configs/mapbox-config'
import type { AccountInfo, GuestAccountInfo } from './lib/account-manager'
import type { LocationChangeListener } from './lib/location-tracker'
import { accountManagerProvider } from './stores/account-manager'
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

let accountInfo: AccountInfo = { type: 'no-account' }
app.use(accountManagerProvider({
  async getAccountInfo() {
    return accountInfo
  },
  async createGuestAccount() {
    const guest: GuestAccountInfo = {
      type: 'guest',
      mapboxAccessToken: mapboxConfig.guestAccessToken
    }
    accountInfo = guest
    return guest
  }
}))

const locationListeners: LocationChangeListener[] = []
let locationWatchId: number | undefined = undefined
app.use(locationTrackerProvider({
  addLocationChangeListener(listener: LocationChangeListener) {
    locationListeners.push(listener)
  },
  removeLocationChangeListener(listener: LocationChangeListener) {
    const index = locationListeners.indexOf(listener)
    if (index !== -1) {
      locationListeners.splice(index, 1)
    }
  },
  async getCurrentLocation() {
    if (typeof navigator.geolocation === 'undefined') {
      throw new Error('navigator.geolocation is unavailable')
    }
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        maximumAge: 3000,
        timeout: 3000,
        enableHighAccuracy: true
      })
    })
  },
  async startTracking() {
    if (locationWatchId != null) {
      console.warn('already tracking location')
      return
    }
    if (typeof navigator.geolocation === 'undefined') {
      throw new Error('navigator.geolocation is unavailable')
    }
    locationWatchId = navigator.geolocation.watchPosition(
      (location) => {
        for (const listener of locationListeners) {
          listener(location)
        }
      },
      (err) => {
        console.error('location tracking error:', err)
      },
      {
        maximumAge: 3000,
        timeout: 3000,
        enableHighAccuracy: true
      }
    )
  },
  async stopTracking() {
    if (locationWatchId == null) {
      console.warn('not tracking location')
      return
    }
    if (typeof navigator.geolocation === 'undefined') {
      throw new Error('navigator.geolocation is unavailable')
    }
    navigator.geolocation.clearWatch(locationWatchId)
    locationWatchId = undefined
  }
}))

app.mount('#app')
