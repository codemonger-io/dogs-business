import type { GuestAccountInfo } from '../account-manager'
import type { DogParams } from './types'

/** Interface of dog database managers. */
export interface DogDatabaseManager {
  /**
   * Returns the dog database for the guest account.
   *
   * @remarks
   *
   * The dog database is supposed to be backed by IndexedDB.
   * Creates a new IndexedDB store if no store exists for the guest account.
   *
   * @throws Error
   *
   *   If the dog database cannot be created, or opened.
   */
  getGuestDogDatabase(guestInfo: GuestAccountInfo): Promise<GuestDogDatabase>
}

/**
 * Interface of dog databases.
 *
 * @typeParam Key
 *
 *   Type of keys to identify dogs in the database.
 */
export interface DogDatabase<Key> {
  /**
   * Creates a new dog in the database.
   *
   * @remarks
   *
   * The owner of the database will become the guardian of the created dog.
   *
   * @throws Error
   *
   *   If any error happens.
   */
  createDog(params: DogParams): Promise<Dog<Key>>

  /**
   * Returns the dog with a given key.
   *
   * @returns
   *
   *   Dog identified by `key`.
   *   `undefined` if no dog is associated with `key`.
   *
   * @throws Error
   *
   *   If any error happens.
   */
  getDog(key: Key): Promise<Dog<Key> | undefined>
}

/** Interface of dog databases for guest accounts. */
export interface GuestDogDatabase extends DogDatabase<number> {}

/** Interface of dogs in the database. */
export interface Dog<Key> extends DogParams {
  /** Key to identify the dog in the database. */
  readonly key: Key
}
