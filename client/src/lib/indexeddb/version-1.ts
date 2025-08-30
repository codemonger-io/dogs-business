/** Name of the IndexedDB store for dogs. */
export const DOG_STORE_NAME = 'dogs'

/** Name of the IndexedDB store for business records. */
export const BUSINESS_RECORD_STORE_NAME = 'business-records'

/** Name of the index for `dogId` in the business record store. */
export const BUSINESS_RECORD_DOG_ID_INDEX = 'dogId'

/**
 * Initializes the version 1 database.
 *
 * @remarks
 *
 * You have to call this function during the `onupgradeneeded` event.
 *
 * @throws Error
 *
 *   If access to IndexedDB fails.
 */
export function initialize(db: IDBDatabase) {
  initializeDogStore(db)
  initializeBusinessRecordStore(db)
}

/**
 * Initializes the IndexedDB store for dogs.
 *
 * @returns
 *
 *   The initialized IndexedDB store for dogs.
 *   Newer versions may do additional configuration on the store.
 *
 * @throws Error
 *
 *   If access to IndexedDB fails.
 */
export function initializeDogStore(db: IDBDatabase): IDBObjectStore {
  const store = db.createObjectStore(DOG_STORE_NAME, {
    keyPath: 'dogId',
    autoIncrement: true
  })
  return store
}

/**
 * Initializes the IndexedDB store for business records.
 *
 * @returns
 *
 *   The initialized IndexedDB store for business records.
 *   Newer versions may do additional configuration on the store.
 *
 * @throws Error
 *
 *   If access to IndexedDB fails.
 */
export function initializeBusinessRecordStore(db: IDBDatabase): IDBObjectStore {
  const store = db.createObjectStore(BUSINESS_RECORD_STORE_NAME, {
    keyPath: 'recordId',
    autoIncrement: true
  })
  store.createIndex(BUSINESS_RECORD_DOG_ID_INDEX, 'dogId')
  return store
}
