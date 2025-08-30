import type {
  BusinessRecord,
  BusinessRecordParamsOfDog,
  GuestBusinessRecordDatabase
} from '../business-record-database'
import {
  isBusinessRecord,
  isGuestBusinessRecord
} from '../business-record-database'

import {
  BUSINESS_RECORD_DOG_ID_INDEX,
  BUSINESS_RECORD_STORE_NAME
} from './current-version'

/** IndexedDB store for business records. */
export class BusinessRecordStore implements GuestBusinessRecordDatabase {
  constructor(private db: IDBDatabase) {}

  /** Creates a new business record. */
  createBusinessRecord(params: BusinessRecordParamsOfDog<number>):
    Promise<BusinessRecord<number, number>>
  {
    return new Promise((resolve, reject) => {
      try {
        let storedRecord: BusinessRecord<number, number> | undefined
        const transaction =
          this.db.transaction(BUSINESS_RECORD_STORE_NAME, 'readwrite')
        transaction.oncomplete = (event) => {
          if (process.env.NODE_ENV !== 'production') {
            console.log(
              'BusinessRecordStore',
              'createBusinessRecord',
              'transaction.oncomplete',
              event
            )
          }
          if (storedRecord != null) {
            resolve(storedRecord)
          } else {
            reject(new Error('business record must have been created'))
          }
        }
        transaction.onerror = (event) => {
          console.error(
            'BusinessRecordStore',
            'createBusinessRecord',
            'transaction.onerror',
            event
          )
          reject(transaction.error)
        }
        transaction.onabort = (event) => {
          console.warn(
            'BusinessRecordStore',
            'createBusinessRecord',
            'transaction.onabort',
            event
          )
          reject(new Error('createBusinessRecord transaction aborted'))
        }
        const store = transaction.objectStore(BUSINESS_RECORD_STORE_NAME)
        const addRequest = store.add(params)
        addRequest.onsuccess = (event) => {
          if (process.env.NODE_ENV !== 'production') {
            console.log(
              'BusinessRecordStore',
              'createBusinessRecord',
              'addRequest.onsuccess',
              event
            )
          }
          const { result } = addRequest
          const recordId = typeof result === 'number'
            ? result
            : typeof result === 'string' ? parseInt(result) : NaN
          if (isNaN(recordId)) {
            throw new Error(
              `business record ID must be a number but got ${result}`
            )
          }
          storedRecord = {
            ...params,
            recordId
          }
        }
        // does nothing onerror and onabort since transaction handles them
        transaction.commit()
      } catch (err) {
        // IndexedDB APIs may throw an exception
        console.error('BusinessRecordStore', 'createBusinessRecord', err)
        reject(err)
      }
    })
  }

  /** Loads business records of a given dog. */
  loadBusinessRecords(dogId: number):
    Promise<BusinessRecord<number, number>[]>
  {
    return new Promise((resolve, reject) => {
      try {
        let storedRecords: BusinessRecord<number, number>[] | undefined
        const transaction =
          this.db.transaction(BUSINESS_RECORD_STORE_NAME, 'readonly')
        transaction.oncomplete = (event) => {
          if (process.env.NODE_ENV !== 'production') {
            console.log(
              'BusinessRecordStore',
              'loadBusinessRecords',
              'transaction.oncomplete',
              event
            )
          }
          if (storedRecords != null) {
            resolve(storedRecords)
          } else {
            reject(new Error('business records must have been loaded'))
          }
        }
        transaction.onerror = (event) => {
          if (process.env.NODE_ENV !== 'production') {
            console.error(
              'BusinessRecordStore',
              'loadBusinessRecords',
              'transaction.onerror',
              event
            )
          }
          const { error } = transaction
          reject(error)
        }
        transaction.onabort = (event) => {
          if (process.env.NODE_ENV !== 'production') {
            console.warn(
              'BusinessRecordStore',
              'loadBusinessRecords',
              'transaction.onabort',
              event
            )
          }
          reject(new Error('loadBusinessRecords transaction aborted'))
        }
        const store = transaction.objectStore(BUSINESS_RECORD_STORE_NAME)
        const index = store.index(BUSINESS_RECORD_DOG_ID_INDEX)
        const getAllRequest = index.getAll(dogId)
        getAllRequest.onsuccess = (event) => {
          if (process.env.NODE_ENV !== 'production') {
            console.log(
              'BusinessRecordStore',
              'loadBusinessRecords',
              'getAllRequest.onsuccess',
              event
            )
          }
          const { result } = getAllRequest
          if (!Array.isArray(result)) {
            throw new Error(
              `business records must be an array but got ${typeof result}`
            )
          }
          if (!result.every((record) =>
            isBusinessRecord(record) && isGuestBusinessRecord(record)))
          {
            throw new Error(
              'stored business records must conform to guest business records'
            )
          }
          storedRecords = result
          // business records must be sorted in desending order of timestamp
          storedRecords.sort(
            (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
          )
        }
        // does nothing onerror and onabort since transaction handles them
        transaction.commit()
      } catch (err) {
        // IndexedDB APIs may throw an exception
        console.error('BusinessRecordStore', 'loadBusinessRecords', err)
      }
    })
  }
}
