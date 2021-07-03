/**
 * Root Vuex store.
 *
 * Vuex is activated by importing this module.
 *
 * @module store
 */

import Vuex from 'vuex'

import createUserStore from './user'

/**
 * Creates a root store that is bound to a given database.
 *
 * @function createStore
 *
 * @static
 *
 * @param {Database} db
 *
 *   Database to be bound to a store.
 *
 * @return {object}
 *
 *   The root Vuex store bound to `db`.
 */
export function createStore (db) {
  const user = createUserStore(db)
  return Vuex.createStore({
    modules: {
      user: {
        ...user,
        namespaced: true,
      },
    },
  })
}

export default createStore
