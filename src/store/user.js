/**
 * Vuex store for user information.
 *
 * @module store/user
 */

/**
 * Vuex State for user information.
 *
 * Has the following fields,
 * - `dog`: {`object`}
 *   Information about user's dog.
 *   Has the following fields,
 *     - `name`: {`string`} name of the dog.
 *     - `sex`: {`string`}
 *       sex of the dog.
 *       'female', 'male' or 'n/a'.
 *     - `dateOfBirth`: {`Date`}
 *       Date of birth of the dog.
 *       `null` if no date of birth is specified.
 *
 * @member {object} state
 */
export const state = {
  dog: {
    name: '',
    sex: 'n/a',
    dateOfBirth: null
  }
}

/**
 * Vuex Getters for user information.
 *
 * @namespace getters
 */
export const getters = {
  /**
   * Possessive form of the dog.
   *
   * @function possessiveFormOfDog
   *
   * @memberof module:store/user.getters
   *
   * @param {object} state
   *
   *   Vuex State.
   *
   * @return {string}
   *
   *   Possessive form of the dog.
   *   Precedence: `name`+'s > `sex`(her/his).
   */
  possessiveFormOfDog (state) {
    const {
      name,
      sex
    } = state.dog
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

/**
 * Vuex Mutations for user information.
 *
 * @namespace mutations
 */
export const mutations = {
  /**
   * Updates the information about user's dog.
   *
   * @function updateDogInformation
   *
   * @memberof module:store/user.mutations
   *
   * @param {object} state
   *
   *   Vuex State to be updated.
   *   The field `dog` is updated.
   *
   * @param {object} newDog
   *
   *   New information about user's dog.
   *   Must have the following fields,
   *   - `name`: {`string`} name of the dog.
   *   - `sex`: {`string`}
   *     sex of the dog.
   *     'female', 'male' or 'n/a'.
   *   - `dateOfBirth`: {`Date`}
   *     Date of birth of the dog.
   *     `null` if no date of birth is specified.
   */
  updateDogInformation ({ dog }, newDog) {
    dog.name = newDog.name
    dog.sex = newDog.sex
    dog.dateOfBirth = newDog.dateOfBirth
  }
}

export default {
  state,
  getters,
  mutations
}
