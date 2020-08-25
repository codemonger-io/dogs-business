/**
 * Name of the database.
 *
 * @member {string} DATABASE_NAME
 *
 * @memberof module:indexed-db
 */
export const DATABASE_NAME = 'DogsBusinessDb'

/**
 * Version of the database.
 *
 * @member {number} DATABASE_VERSION
 *
 * @memberof module:indexed-db
 */
export const DATABASE_VERSION = 1

/**
 * Name of the dog store.
 *
 * @member {string} DOG_STORE_NAME
 *
 * @memberof module:indexed-db
 */
export const DOG_STORE_NAME = 'dog'

/**
 * Database backed by IndexedDB.
 *
 * @class Database
 *
 * @memberof module:indexed-db
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
    // adds a default dog
    const request = store.add({
      name: '',
      sex: 'n/a',
      dateOfBirth: null
    })
    request.onsuccess = event => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('IDBObjectStore.add', 'success', event)
      }
    }
    request.onerror = event => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('IDBObjectStore.add', 'error', event)
      }
    }
  }

  async loadDogInformation () {
    if (process.env.NODE_ENV !== 'production') {
      console.log('loading dog information')
    }
    return this.#promisedDb
      .then(db => {
        return new Promise((resolve, reject) => {
          if (process.env.NODE_ENV !== 'production') {
            console.log('requesting the dog #1')
          }
          const transaction = db.transaction(DOG_STORE_NAME, 'readonly')
          const store = transaction.objectStore(DOG_STORE_NAME)
          const request = store.get(1)
          request.onsuccess = event => {
            if (process.env.NODE_ENV !== 'production') {
              console.log('loadDogInformation', 'success', event)
            }
            const dog = event.target.result
            resolve(dog)
          }
          request.onerror = event => {
            if (process.env.NODE_ENV !== 'production') {
              console.log('loadDogInformation', 'error', event)
            }
            reject(new Error('no dog is associated with #1'))
          }
        })
      })
  }
}

export default Database
