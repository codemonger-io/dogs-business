import { DogStore } from './dog-store'
import { BusinessRecordStore } from './business-record-store'

/** Connection to the IndexedDB database. */
export class Connection {
  // IndexedDB store for dogs.
  private dogStore: DogStore

  // IndexedDB store for business records.
  private businessRecordStore: BusinessRecordStore

  constructor(private db: IDBDatabase) {
    this.dogStore = new DogStore(db)
    this.businessRecordStore = new BusinessRecordStore(db)
    // closes the database when the version is changed
    db.onversionchange = (event) => {
      console.warn('Connection', 'IDBDatabase.onversionchange', event)
      db.close()
    }
    db.onclose = (event) => {
      // just for logging
      if (process.env.NODE_ENV !== 'production') {
        console.log('Connection', 'IDBDatabase.onclose', event)
      }
    }
  }

  /** Returns the IndexedDB store for dogs. */
  getDogStore(): DogStore {
    return this.dogStore
  }

  /** Returns the IndexedDB store for business records. */
  getBusinessRecordStore(): BusinessRecordStore {
    return this.businessRecordStore
  }
}
