import type { GuestAccountInfo } from '../account-manager'
import type { BusinessRecordParamsOfDog } from './types'

/** Interface of business record database managers. */
export interface BusinessRecordDatabaseManager {
  /**
   * Returns the business record database for a guest.
   *
   * @remarks
   *
   * The guest business record database is supposed to be an IndexedDB store.
   * Creates a new IndexedDB store if no store exists for the guest.
   *
   * @throws Error
   *
   *   If the guest business record database cannot be created, or opened.
   */
  getGuestBusinessRecordDatabase(
    guestInfo: GuestAccountInfo
  ): Promise<GuestBusinessRecordDatabase>
}

/**
 * Interface of business record databases.
 *
 * @typeParam RecordKey
 *
 *   Type representing record keys.
 *
 * @typeParam DogKey
 *
 *   Type representing dog keys.
 */
export interface BusinessRecordDatabase<
  RecordKey extends number | string,
  DogKey extends number | string = RecordKey
> {
  /** Creates a new business record in the database. */
  createBusinessRecord(
    record: BusinessRecordParamsOfDog<DogKey>
  ): Promise<BusinessRecord<RecordKey, DogKey>>

  /**
   * Loads business records of a given dog from the database.
   *
   * @remarks
   *
   * Business records must be sorted in descending order of the timestamps.
   */
  loadBusinessRecords(
    dogKey: DogKey
  ): Promise<BusinessRecord<RecordKey, DogKey>[]>
}

/** Interface of business record databases for guest accounts. */
export interface GuestBusinessRecordDatabase extends BusinessRecordDatabase<number> {}

/** Interface of business records stored in databases. */
export interface BusinessRecord<
  RecordKey extends number | string,
  DogKey extends number | string
>
  extends BusinessRecordParamsOfDog<DogKey>
{
  /** Key to identify the record in the database. */
  readonly key: RecordKey
}

/** Generic business record. */
export type GenericBusinessRecord =
  BusinessRecord<number | string, number | string>
