/**
 * Defines a dog type.
 *
 * @module db/types/dog
 */

// just defines an interface.
/**
 * Dog type.
 *
 * This class just exemplifies an instance of a dog.
 *
 * @class Dog
 */
class Dog {
  /**
   * ID of this dog.
   *
   * `undefined` if this dog is not yet persisted in a database.
   *
   * @member {number} dogId
   *
   * @memberof module:db/types/dog.Dog
   */
  /**
   * Name of this dog.
   *
   * An empty string if the name of this dog is not given.
   *
   * @member {string} name
   *
   * @memberof module:db/types/dog.Dog
   */
  /**
   * Sex of this dog.
   *
   * May take one of the following values,
   * - 'female'
   * - 'male'
   * - 'n/a'
   *
   * @member {string} sex
   *
   * @memberof module:db/types/dog.Dog
   */
  /**
   * Date of birth of this dog.
   *
   * The format is `YYYY-MM-DD` where
   * - `YYYY` is a four-digit year ('0000'-'9999')
   * - `MM` is a two-digit month ('01'-'12')
   * - `DD` is a two-digit date ('01'-'31')
   *
   * `undefined` if the date of birth of this dog is not given.
   *
   * @member {string} dateOfBirth
   *
   * @memberof module:db/types/dog.Dog
   */
}

/**
 * Returns an objective form of a given dog.
 *
 * @function getObjectiveFormOfDog
 *
 * @static
 *
 * @param {module:db/types/dog.Dog} dog
 *
 *   Dog whose objective form is to be obtained.
 *
 * @return {string}
 *
 *   Objective form appropriate for `dog`.
 *   - `dog.name` if it is not empty.
 *   - 'your dog' if `dog.name` is empty.
 */
export function getObjectiveFormOfDog ({ name }) {
  return name || 'your dog'
}
