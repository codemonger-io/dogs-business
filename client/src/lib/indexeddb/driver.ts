import { Connection } from './connection'
import {
  DB_NAME,
  DB_VERSION,
  initializeCurrentVersion
} from './current-version'

/**
 * Manages the connection to the IndexedDB database for Dog's Business.
 *
 * @remarks
 *
 * No IndexedDB access occurs until {@link open} is called.
 */
export class IndexedDBDriver {
  // Instance of the IndexedDB database connection.
  private connection?: Connection = undefined

  // Connection request.
  // `undefined` if no request has been made, or if the request has completed.
  private connectionRequest?: IDBOpenDBRequest = undefined

  // Subscriptions to the connection request.
  private subscriptions: ConnectionSubscription[] = []

  /**
   * Opens the connection to the IndexedDB database.
   *
   * @remarks
   *
   * Creates the database if it does not exist.
   *
   * Upgrades the database if the stored version is older than the current
   * version.
   *
   * Subsequent calls to this method will resolve to the same
   * {@link Connection} instance.
   *
   * @throws Error
   *
   *   If IndexedDB is not supported.
   */
  open(): Promise<Connection> {
    if (this.connection != null) {
      return Promise.resolve(this.connection)
    }
    if (this.connectionRequest == null) {
      try {
        this._request()
      } catch (err) {
        return Promise.reject(err)
      }
    }
    return new Promise((resolve, reject) => {
      this.subscriptions.push({ resolve, reject })
    })
  }

  // Requests IndexedDB database connection.
  _request(): void {
    if (typeof window.indexedDB === 'undefined') {
      throw new Error('IndexedDB is not supported')
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)
    request.onsuccess = (event) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('IndexedDBDriver', 'request.onsuccess', event)
      }
      this.connection = new Connection(request.result)
      this._resolveRequest()
      this.connectionRequest = undefined
    }
    request.onerror = (event) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('IndexedDBDriver', 'request.onerror', event)
      }
      this._rejectRequest(request.error)
    }
    request.onupgradeneeded = (event) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('IndexedDBDriver', 'request.onupgradeneeded', event)
      }
      const { oldVersion, newVersion } = event
      if (oldVersion < 1) {
        // initializes the stores
        initializeCurrentVersion(request.result)
      } else {
        // cannot be newer than the current version
        throw new Error(
          `latest database version is ${DB_VERSION} but got ${newVersion}`
        )
      }
    }
    request.onblocked = (event) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('IndexedDBDriver', 'request.onblocked', event)
      }
    }
  }

  // Resolves the request.
  // Resolves all subscriptions.
  _resolveRequest(): void {
    const connection = this.connection
    if (connection == null) {
      this._rejectRequest(new Error('connection must have been established'))
      return
    }
    this.subscriptions.forEach(({ resolve }) => resolve(connection))
    this.connectionRequest = undefined
    this.subscriptions = []
  }

  // Rejects the request.
  // Rejects all subscriptions.
  _rejectRequest(cause: unknown): void {
    this.subscriptions.forEach(({ reject }) => reject(cause))
    this.connectionRequest = undefined
    this.subscriptions = []
  }
}

// Subscription to the connection request.
interface ConnectionSubscription {
  resolve(connection: Connection): void
  reject(cause: unknown): void
}
