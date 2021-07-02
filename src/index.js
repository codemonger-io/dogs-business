/**
 * Entry point.
 */

import { createApp } from 'vue'
import Buefy from 'buefy'

import '@mdi/font/css/materialdesignicons.min.css'
import 'maplibre-gl/dist/maplibre-gl.css'
import '@scss'

import {
  openDatabase
} from '@db'
import createStore from '@store'

import App from '@components/app'

// loads the IndexedDB
const db = openDatabase()
// binds the database to the store and asynchronously loads data
const store = createStore(db)
store.dispatch('user/loadData')
  .catch(err => {
    console.error('failed to load data', err)
  })

const app = createApp(App)

app.use(Buefy)
app.use(store)

app.mount('#app')
