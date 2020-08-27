/**
 * Vuex store for user information.
 *
 * @module store/user
 */

/**
 * Vuex State for user information.
 *
 * @namespace state
 */
export const state = {
  /**
   * Whether data is loaded.
   *
   * @member {boolean} isLoaded
   *
   * @memberof module:store/user.state
   */
  isLoaded: false,
  /**
   * Information of dogs.
   *
   * Each element has the following fields,
   * - `dogId`: {`number`} ID of the dog.
   * - `name`: {`string`} name of the dog.
   * - `sex`: {`string`}
   *   sex of the dog.
   *   'female', 'male' or 'n/a'.
   * - `dateOfBirth`: {`Date`}
   *   Date of birth of the dog.
   *   `null` if no date of birth is specified.
   *
   * @member {array<object>} dogs
   *
   * @memberof module:store/user.state
   */
  dogs: []
}

/**
 * Finds a dog associated with a given ID.
 *
 * @function findDogById
 *
 * @param {object} state
 *
 *   Vuex State where a dog is to be found.
 *
 * @param {number} dogId
 *
 *   ID of the dog to be found.
 *
 * @return {object}
 *
 *   Dog associated with `dogId`.
 *   `null` if no dog is associated with `dogId`.
 */
function findDogById ({ dogs }, dogId) {
  return dogs.find(d => d.dogId === dogId) || null
}

/**
 * Vuex Getters for user information.
 *
 * @namespace getters
 */
export const getters = {
  /**
   * Obtains the number of dogs.
   *
   * @function dogCount
   *
   * @instance
   *
   * @memberof module:store/user.getters
   *
   * @param {object} state
   *
   *   Vuex State.
   *
   * @return {number}
   *
   *   Number of dogs.
   *   May be invalid if data has not been loaded yet.
   */
  dogCount ({ dogs }) {
    return dogs.length
  },
  /**
   * Obtains the dog information associated with a given ID.
   *
   * @function dogOfId
   *
   * @memberof module:store/user.getters
   *
   * @param {number} dogId
   *
   *   ID of the dog whose information is to be obtained.
   *   See {@linkcode module:store/user.state.dogs} for more details.
   *
   * @return {object}
   *
   *   Dog information associated with `dogId`.
   *   `null` if no dog information is associated with `dogId`.
   */
  dogOfId: state => findDogById.bind(null, state),
  /**
   * Possessive form of the dog.
   *
   * @function possessiveFormOfDog
   *
   * @memberof module:store/user.getters
   *
   * @param {number} dogId
   *
   :   ID of the dog whose possessive form is to be obtained.
   *
   * @return {string}
   *
   *   Possessive form of the dog.
   *   Precedence: `name`+'s > `sex`(her/his).
   */
  possessiveFormOfDog (state) {
    return dogId => {
      const {
        name,
        sex
      } = (findDogById(state, dogId) || {})
      if (name) {
        return name + "'s"
      } else if (sex === 'female') {
        return 'her'
      } else if (sex === 'male') {
        return 'his'
      } else {
        return 'her/his'
      }
    }
  }
}

/**
 * Vuex Mutations for user information.
 *
 * Mutations are basically for internal use.
 * Use Actions instead.
 *
 * @namespace mutations
 */
export const mutations = {
  /**
   * Sets whether data is loaded.
   *
   * @function _setLoaded
   *
   * @memberof module:store/user.mutations
   *
   * @param {object} state
   *
   *   Vuex State to be updated.
   *   The field `isLoaded` is updated.
   *
   * @param {boolean} isLoaded
   *
   *   Whether data is loaded.
   */
  _setLoaded (state, isLoaded) {
    state.isLoaded = isLoaded
  },
  /**
   * Replaces the information of dogs.
   *
   * @function _replaceDogs
   *
   * @memberof module:store/user.mutations
   *
   * @param {object} state
   *
   *   Vuex State to be updated.
   *   The field `dogs` is replaced.
   *
   * @param {array<object>} newDogs
   *
   *   New information of dogs.
   *   Each element must have the following fields,
   *   - `dogId`: {`number`} ID of the dog.
   *   - `name`: {`string`} name of the dog.
   *   - `sex`: {`string`} sex of the dog. 'female', 'male' or 'n/a'.
   *   - `dateOfBirth`: {`Date`}
   *     Date of birth of the dog.
   *     `null` if no date of birth is given.
   */
  _replaceDogs (state, newDogs) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('_replaceDogs', newDogs)
    }
    state.dogs = newDogs
  },
  /**
   * Appends the information of a dog.
   *
   * @function _appendDog
   *
   * @memberof module:store/user.mutations
   *
   * @param {object} state
   *
   *   Vuex State to be updated.
   *   The field `dogs` is updated.
   *
   * @param {object} newDog
   *
   *   New information of a dog.
   *   Must have the following fields,
   *   - `dogId`: {`number`} ID of the dog.
   *   - `name`: {`string`} name of the dog.
   *   - `sex`: {`string`} sex of the dog. 'female', 'male' or 'n/a'.
   *   - `dateOfBirth`: {`Date`}
   *     Date of birth of the dog.
   *     May be `null` if no date of birth is given.
   */
  _appendDog ({ dogs }, newDog) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('appending a dog', dogs, newDog)
    }
    dogs.push(newDog)
  }
}

/**
 * Creates Vuex Actions for user information.
 *
 * @function createActions
 *
 * @memberof module:store/user
 *
 * @param {Database} db
 *
 *   Database to be bound to Vuex Actions.
 *
 * @return {module:store/user.actions}
 *
 *   Vuex Actions for user information, that is bound to `db`.
 */
function createActions (db) {
  /**
   * Vuex Actions for user information.
   *
   * Bound to a database.
   *
   * @namespace actions
   *
   * @memberof module:store/user
   */
  return {
    /**
     * Loads data from the database.
     *
     * This function invokes
     * [Database.loadDogs]{@linkcode module:db.Database#loadDogs}
     * of the bound database.
     *
     * @function loadData
     *
     * @memberof module:store/user.actions
     *
     * @param {object} context
     *
     *   Vuex context.
     *
     * @return {Promise}
     *
     *   Resolved when the data is loaded from the database.
     */
    loadData ({ commit }) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('loading data')
      }
      commit('_setLoaded', false)
      return db.loadDogs()
        .then(dogs => commit('_replaceDogs', dogs))
        .finally(() => commit('_setLoaded', true))
    },
    /**
     * Appends a given dog to the database.
     *
     * This function invokes
     * [Database.putDog]{@linkcode module:db.Database#putDog}
     * of the bound database.
     *
     * @function appendDog
     *
     * @memberof module:store/user.actions
     *
     * @param {object} context
     *
     *   Vuex context.
     *
     * @param {object} newDog
     *
     *   Information of a dog to be appended to the database.
     *   Must have the following fields,
     *   - `name`: {`string`} name of the dog.
     *   - `sex`: {`string`} sex of the dog. 'female', 'male' or 'n/a'.
     *   - `dateOfBirth`: {`Date`}
     *     Date of birth of the dog.
     *     May be `null` if no date of birth is given.
     *
     * @return {Promise}
     *
     *   Resolved when appending the dog to the database finishes.
     */
    appendDog ({ commit }, newDog) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('appending a dog', newDog)
      }
      return db.putDog(newDog)
        .then(newDog => {
          commit('_appendDog', newDog)
        })
    }
  }
}

/**
 * Creates a user store that is bound to a given database.
 *
 * @function createStore
 *
 * @memberof module:store/user
 *
 * @param {Database} db
 *
 *   Database to be bound to a store.
 *
 * @return {object}
 *
 *   The user Vuex store bound to `db`.
 */
export function createStore (db) {
  const actions = createActions(db)
  return {
    state,
    getters,
    mutations,
    actions
  }
}

export default createStore
