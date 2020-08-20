/**
 * Entry point.
 */

import Vue from 'vue'

import 'bulma/css/bulma.min.css'
import 'mapbox-gl/dist/mapbox-gl.css'

import App from '@components/app'

new Vue({
  render: h => h(App)
}).$mount('#app')
