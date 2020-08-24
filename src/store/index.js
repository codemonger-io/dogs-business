/**
 * Vuex store.
 *
 * Vuex is activated by importing this module.
 *
 * @module store
 */

import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

import user from './user'

export const store = new Vuex.Store({
  modules: {
    user: {
      ...user,
      namespaced: true
    }
  }
})

export default store
