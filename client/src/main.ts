import './assets/main.scss'

import { createApp } from 'vue'
import { createI18n } from 'vue-i18n'
import { createPinia } from 'pinia'

import Buefy from '@ntohq/buefy-next'

import App from './App.vue'
import type { AccountInfo, GuestAccountInfo } from './lib/account-manager'
import { accountManagerProvider } from './stores/account-manager'
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
    const guest: GuestAccountInfo = { type: 'guest' }
    accountInfo = guest
    return guest
  }
}))

app.mount('#app')
