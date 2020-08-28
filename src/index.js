/**
 * Entry point.
 */

import Vue from 'vue'
import Buefy from 'buefy'

Vue.use(Buefy)

import '@mdi/font/css/materialdesignicons.min.css'
import 'mapbox-gl/dist/mapbox-gl.css'
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

new Vue({
  render: h => h(App),
  store
}).$mount('#app')
