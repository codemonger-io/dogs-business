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
   * - `dateOfBirth`: {`string`}
   *   Date of birth of the dog.
   *   Format is `YYYY-MM-DD`.
   *   `undefined` if no date of birth is specified.
   *
   * @member {array<object>} dogs
   *
   * @memberof module:store/user.state
   */
  dogs: [],
  /**
   * Business records.
   *
   * Each element has the following fields,
   * - `recordId`: {`number`} ID of the business record.
   * - `dogId`: {`number`} ID of the dog that had the business.
   * - `type`: {`string`} type of the business. 'pee' or 'poo'.
   * - `location`: {`object`}
   *   location where the business happened.
   *   Has the following fields,
   *     - `longitude`: {`number`} longitude of the location.
   *     - `latitude`: {`number`} latitude of the location.
   * - `date`: {`string`} date when the business happened.
   *
   * @member {array<object>} businessRecords
   *
   * @memberof module:store/user.state
   */
  businessRecords: []
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
   *   - `dateOfBirth`: {`string`}
   *     Date of birth of the dog.
   *     Its format is `YYYY-MM-DD`.
   *     `undefined` if no date of birth is given.
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
   *   - `dateOfBirth`: {`string`}
   *     Date of birth of the dog.
   *     Its format is `YYYY-MM-DD`.
   *     May be `undefined` if no date of birth is given.
   */
  _appendDog ({ dogs }, newDog) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('appending a dog', dogs, newDog)
    }
    dogs.push(newDog)
  },
  /**
   * Replaces business records.
   *
   * @function _replaceBusinessRecords
   *
   * @memberof module:store/user.mutations
   *
   * @param {object} state
   *
   *   Vuex State to be updated.
   *   The field `businessRecords` is updated.
   *
   * @param {array<object>} newRecords
   *
   *   New business records.
   *   Each element must have the following fields,
   *   - `recordId`: {`number`} ID of the business record.
   *   - `dogId`: {`number`} ID of the dog that had the business.
   *   - `type`: {`string`} type of the business.
   *   - `location`: {`object`}
   *     Location where the business happened.
   *     Must have the following fields,
   *       - `longitude`: {`number`} longitude of the location.
   *       - `latitude`: {`number`} latitude of the location.
   *   - `date`: {`string`} date when the business happened.
   */
  _replaceBusinessRecords (state, newRecords) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('replacing business records', newRecords)
    }
    state.businessRecords = newRecords
  },
  /**
   * Appends a given business record.
   *
   * @function _appendBusinessRecord
   *
   * @memberof module:store/user.mutations
   *
   * @param {object} state
   *
   *   Vuex State to be updated.
   *   The field `businessRecords` is updated.
   *
   * @param {object} newRecord
   *
   *   New business record to be appended.
   *   Must have the following fields,
   *   - `recordId`: {`number`} ID of the business record.
   *   - `dogId`: {`number`} ID of the dog that had the business.
   *   - `type`: {`string`} type of the business.
   *   - `location`: {`object`}
   *     Location where the business happened.
   *     Must have the following fields,
   *       - `longitude`: {`number`} longitude of the location.
   *       - `latitude`: {`number`} latitude of the location.
   *   - `date`: {`string`} date when the business happened.
   */
  _appendBusinessRecord ({ businessRecords }, newRecord) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('appending a business record', businessRecords, newRecord)
    }
    businessRecords.push(newRecord)
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
      return Promise.all([
        db.loadDogs()
          .then(dogs => commit('_replaceDogs', dogs)),
        db.loadBusinessRecords()
          .then(records => commit('_replaceBusinessRecords', records))
      ])
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
     *   - `dateOfBirth`: {`string`}
     *     Date of birth of the dog.
     *     Format is `YYYY-MM-DD`.
     *     May be `undefined` if no date of birth is given.
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
    },
    /**
     * Appends a given business record to the database.
     *
     * This function invokes
     * [Database.putBusinessRecord]{@linkcode module:db.Database#putBusinessRecord}
     * of the bound database.
     *
     * @function appendBusinessRecord
     *
     * @memberof module:store/user.actions
     *
     * @param {object} context
     *
     *   Vuex context.
     *
     * @param {object} newRecord
     *
     *   Business record to be appended to the database.
     *   Must have the following fields,
     *   - `recordId`: {`number`} ID of the business record.
     *   - `dogId`: {`number`} ID of the dog that had the business.
     *   - `type`: {`string`} type of the business.
     *   - `location`: {`object`}
     *     Location where the business happened.
     *     Must have the following field,
     *       - `longitude`: {`number`} longitude of the location.
     *       - `latitude`: {`number`} latitude of the location.
     *   - `date`: {`string`} date when the business happened.
     *
     * @return {Promise}
     *
     *   Resolved when appending the business record to the database finishes.
     */
    appendBusinessRecord ({ commit }, newRecord) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('appending a business record', newRecord)
      }
      return db.putBusinessRecord(newRecord)
        .then(newRecord => {
          commit('_appendBusinessRecord', newRecord)
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
