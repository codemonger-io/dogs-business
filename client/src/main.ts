import './assets/main.scss'

import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import { createPinia } from 'pinia'

import Buefy from '@ntohq/buefy-next'

import App from './App.vue'
import mapboxConfig from './configs/mapbox-config'
import type { AccountInfo, GuestAccountInfo } from './lib/account-manager'
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
app.use(locationTrackerProvider({
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
  }
}))

app.mount('#app')
