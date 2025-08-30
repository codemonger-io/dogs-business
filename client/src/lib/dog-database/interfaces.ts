import type { GuestAccountInfo, OnlineAccountInfo } from '../../types/account-info'
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

  /**
   * Returns the dog database for the online account.
   *
   * @remarks
   *
   * The dog database is supposed to be backed by the Dog's Business Resource
   * API.
   *
   * @throws Error
   */
  getOnlineDogDatabase(accountInfo: OnlineAccountInfo): Promise<OnlineDogDatabase>
}

/**
 * Interface of dog databases.
 *
 * @typeParam DogId
 *
 *   Type of IDs to identify dogs in the database.
 */
export interface DogDatabase<DogId extends number | string> {
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
  createDog(params: DogParams): Promise<Dog<DogId>>

  /**
   * Returns the dog with a given ID.
   *
   * @returns
   *
   *   Dog identified by `dogId`.
   *   `undefined` if no dog is associated with `dogId`.
   *
   * @throws Error
   *
   *   If any error happens.
   */
  getDog(dogId: DogId): Promise<Dog<DogId> | undefined>
}

/** Interface of dog databases for guest accounts. */
export interface GuestDogDatabase extends DogDatabase<number> {}

/** Interface of dog databases for online accounts. */
export interface OnlineDogDatabase extends DogDatabase<string> {}

/** Interface of dogs in the database. */
export interface Dog<DogId extends number | string> extends DogParams {
  /** ID to identify the dog in the database. */
  readonly dogId: DogId
}

/** Generic dog. */
export type GenericDog = Dog<number | string>
