/**
 * Name of the database.
 *
 * @member {string} DATABASE_NAME
 *
 * @memberof module:db
 */
export const DATABASE_NAME = 'DogsBusinessDb'

/**
 * Version of the database.
 *
 * @member {number} DATABASE_VERSION
 *
 * @memberof module:db
 */
export const DATABASE_VERSION = 1

/**
 * Name of the dog store.
 *
 * @member {string} DOG_STORE_NAME
 *
 * @memberof module:db
 */
export const DOG_STORE_NAME = 'dog'

/**
 * Database backed by IndexedDB.
 *
 * @class Database
 *
 * @memberof module:db
 *
 * @throws Error
 *
 *   If the browser does not support IndexedDB.
 */
export class Database {
  // Promise of a database instance.
  #promisedDb

  constructor () {
    // starts loading database
    if (process.env.NODE_ENV !== 'production') {
      console.log(`opening the IndexedDB: ${DATABASE_NAME} v${DATABASE_VERSION}`)
    }
    if (!('indexedDB' in window)) {
      throw new Error('IndexedDB is not supported on your browser')
    }
    this.#promisedDb = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
      request.onsuccess = event => {
        if (process.env.NODE_ENV !== 'production') {
          console.log('IDBOpenRequest', 'success', event)
        }
        const db = event.target.result
        resolve(db)
      }
      request.onerror = event => {
        if (process.env.NODE_ENV !== 'production') {
          console.log('IDBOpenRequest', 'error', event)
        }
        reject(new Error(`failed to open IndexedDB: ${DATABASE_NAME}`))
      }
      request.onblocked = event => {
        if (process.env.NODE_ENV !== 'production') {
          console.log('IDBOpenRequest', 'blocked', event)
        }
        reject(new Error(`IndexedDB is blocked: ${DATABASE_NAME}`))
      }
      request.onupgradeneeded = event => {
        if (process.env.NODE_ENV !== 'production') {
          console.log('IDBOpenRequest', 'upgradeneeded', event)
        }
        const {
          oldVersion
        } = event
        if (oldVersion < 1) {
          // populates a brand new store
          const db = event.target.result
          Database.#populateStores(db)
        } else {
          console.warn(`unsupported database conversion: ${oldVersion} → ${DATABASE_VERSION}`)
        }
      }
    })
  }

  static #populateStores (db) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('populating stores')
    }
    const store = db.createObjectStore(DOG_STORE_NAME, {
      keyPath: 'dogId',
      autoIncrement: true
    })
  }

  /**
   * Loads dogs from the database.
   *
   * @function loadDogs
   *
   * @instance
   *
   * @memberof module:db.Database
   *
   * @return {Promise< array<object> >}
   *
   *   Resolves to an array of dogs when dogs are loaded from the datbase.
   *   Each element has the following fields,
   *   - `dogId`: {`number`} ID of the dog.
   *   - `name`: {`string`} Name of the dog.
   *   - `sex`: {`string`} Sex of the dog. 'female', 'male' or 'n/a'.
   *   - `dateOfBirth`: {`Date`}:
   *     Date of birth of the dog. `null` if it is not given.
   */
  async loadDogs () {
    if (process.env.NODE_ENV !== 'production') {
      console.log('loading dogs from the database')
    }
    return this.#promisedDb
      .then(db => {
        return new Promise((resolve, reject) => {
          if (process.env.NODE_ENV !== 'production') {
            console.log('starting transaction: request dogs')
          }
          const transaction = db.transaction(DOG_STORE_NAME, 'readonly')
          const store = transaction.objectStore(DOG_STORE_NAME)
          const request = store.getAll()
          request.onsuccess = event => {
            if (process.env.NODE_ENV !== 'production') {
              console.log('loadDogs', 'success', event)
            }
            const dogs = event.target.result
            resolve(dogs)
          }
          request.onerror = event => {
            console.error('loadDogs', 'error', event)
            reject(new Error('failed to load dogs from the database'))
          }
        })
      })
  }

  /**
   * Puts a given dog into the database.
   *
   * @function putDog
   *
   * @instance
   *
   * @memberof module:db.Database
   *
   * @param {object} newDog
   *
   *   Information of the dog to be put.
   *   Must have the following fields,
   *   - `name`: {`string`} name of the dog.
   *   - `sex`: {`string`} sex of the dog. 'female', 'male' or 'n/a'.
   *   - `dateOfBirth`: {`Date`}
   *     Date of birth of the dog.
   *     May be `null` if no date of birth is given.
   *
   * @return {Promise<object>}
   *
   *   Resolves to a dog when a dog is put to the database.
   *   A result has the following field in addition to those of `newDog`,
   *   - `dogId`: {`number`} ID of the dog.
   */
  async putDog (newDog) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('putting dog to the database', newDog)
    }
    return this.#promisedDb
      .then(db => {
        if (process.env.NODE_ENV !== 'production') {
          console.log('starting transaction: put dog')
        }
        return new Promise((resolve, reject) => {
          const transaction = db.transaction(DOG_STORE_NAME, 'readwrite')
          const store = transaction.objectStore(DOG_STORE_NAME)
          const request = store.put(newDog)
          request.onsuccess = event => {
            if (process.env.NODE_ENV !== 'production') {
              console.log('putDog', 'success', event)
            }
            const key = event.target.result
            // TODO: should I retrieve the object from the database?
            resolve({
              ...newDog,
              dogId: key
            })
          }
          request.onerror = event => {
            console.error('putDog', 'error', event)
            reject(new Error('failed to put a new dog to the database'))
          }
        })
      })
  }
}

export default Database
