import type {
  BusinessRecord,
  BusinessRecordParamsOfDog,
  GuestBusinessRecordDatabase
} from '../business-record-database'

import { BUSINESS_RECORD_STORE_NAME } from './current-version'

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
          const key = typeof result === 'number'
            ? result
            : typeof result === 'string' ? parseInt(result) : NaN
          if (isNaN(key)) {
            throw new Error(
              `business record key must be a number but got ${result}`
            )
          }
          storedRecord = {
            ...params,
            key
          }
        }
        // does nothing onerror and onabort since transaction handles them
      } catch (err) {
        // IndexedDB APIs may throw an exception
        console.error('BusinessRecordStore', 'createBusinessRecord', err)
        reject(err)
      }
    })
  }
}
