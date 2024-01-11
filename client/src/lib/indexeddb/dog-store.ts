import type { Dog, DogParams, GuestDogDatabase } from '../dog-database'
import { isDog, isGuestDog } from '../dog-database'

import { DOG_STORE_NAME } from './current-version'

/** IndexedDB store for dogs. */
export class DogStore implements GuestDogDatabase {
  constructor(private db: IDBDatabase) {}

  /** Creates a new dog. */
  createDog(params: DogParams): Promise<Dog<number>> {
    return new Promise((resolve, reject) => {
      try {
        let storedDog: Dog<number> | undefined
        const transaction = this.db.transaction(DOG_STORE_NAME, 'readwrite')
        transaction.oncomplete = (event) => {
          if (process.env.NODE_ENV !== 'production') {
            console.log('DogStore', 'createDog', 'transaction.oncomplete', event)
          }
          if (storedDog != null) {
            resolve(storedDog)
          } else {
            reject(new Error('dog must have been created'))
          }
        }
        transaction.onerror = (event) => {
          console.error('DogStore', 'createDog', 'transaction.onerror', event)
          reject(transaction.error)
        }
        transaction.onabort = (event) => {
          console.warn('DogStore', 'createDog', 'transaction.onabort', event)
          reject(new Error('createDog transaction aborted'))
        }
        const store = transaction.objectStore(DOG_STORE_NAME)
        const addRequest = store.add(params)
        addRequest.onsuccess = (event) => {
          if (process.env.NODE_ENV !== 'production') {
            console.log('DogStore', 'createDog', 'addRequest.onsuccess', event)
          }
          const { result } = addRequest
          const key = typeof result === 'number'
            ? result
            : typeof result === 'string' ? parseInt(result) : NaN
          if (isNaN(key)) {
            throw new Error(`dog key must be a number but got ${result}`)
          }
          storedDog = {
            ...params,
            key
          }
        }
        // does nothing onerror and onabort since transaction handles them
        transaction.commit()
      } catch (err) {
        // IndexedDB API may throw an exception
        console.error('DogStore', 'createDog', err)
        reject(err)
      }
    })
  }

  /** Returns the dog with a given key. */
  getDog(key: number): Promise<Dog<number> | undefined> {
    return new Promise((resolve, reject) => {
      try {
        // uses an array to make sure there is no problem with data retrieval
        let storedDog: Dog<number>[] | undefined
        const transaction = this.db.transaction(DOG_STORE_NAME, 'readonly')
        transaction.oncomplete = (event) => {
          if (process.env.NODE_ENV !== 'production') {
            console.log('DogStore', 'getDog', 'transaction.oncomplete', event)
          }
          if (storedDog != null) {
            resolve(storedDog[0])
          } else {
            reject(new Error('dog must have been requested'))
          }
        }
        transaction.onerror = (event) => {
          console.error('DogStore', 'getDog', 'transaction.onerror', event)
          reject(transaction.error)
        }
        transaction.onabort = (event) => {
          console.warn('DogStore', 'getDog', 'transaction.onabort', event)
          reject(new Error('getDog transaction aborted'))
        }
        const store = transaction.objectStore(DOG_STORE_NAME)
        const getRequest = store.get(key)
        getRequest.onsuccess = (event) => {
          if (process.env.NODE_ENV !== 'production') {
            console.log('DogStore', 'getDog', 'getRequest.onsuccess', event)
          }
          const { result } = getRequest
          if (isDog(result) && isGuestDog(result)) {
            storedDog = [result]
          } else if (typeof result === 'undefined') {
            storedDog = []
          } else {
            throw new Error(`malformed dog: ${result}`)
          }
        }
        // does nothing onerror and onabort since transaction handles them
      } catch (err) {
        // IndexedDB API may throw an exception
        console.error('DogStore', 'getDog', err)
        reject(err)
      }
    })
  }
}
