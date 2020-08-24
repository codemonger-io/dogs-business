/**
 * Entry point.
 */

import Vue from 'vue'
import Buefy from 'buefy'

Vue.use(Buefy)

import '@mdi/font/css/materialdesignicons.min.css'
import 'mapbox-gl/dist/mapbox-gl.css'
import '@scss'

import App from '@components/app'

new Vue({
  render: h => h(App)
}).$mount('#app')
