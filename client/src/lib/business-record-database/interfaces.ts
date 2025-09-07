import type {
  GuestAccountInfo,
  OnlineAccountInfo
} from '../../types/account-info'
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

  /**
   * Returns the business record database for an online account.
   */
  getOnlineBusinessRecordDatabase(
    onlineAccount: OnlineAccountInfo,
  ): Promise<OnlineBusinessRecordDatabase>
}

/**
 * Interface of business record databases.
 *
 * @typeParam RecordId
 *
 *   Type representing record IDs.
 *
 * @typeParam DogId
 *
 *   Type representing dog IDs.
 */
export interface BusinessRecordDatabase<
  RecordId extends number | string,
  DogId extends number | string = RecordId
> {
  /** Creates a new business record in the database. */
  createBusinessRecord(
    record: BusinessRecordParamsOfDog<DogId>
  ): Promise<BusinessRecord<RecordId, DogId>>

  /**
   * Loads business records of a given dog from the database.
   *
   * @remarks
   *
   * Business records must be sorted in descending order of the timestamps.
   */
  loadBusinessRecords(
    dogId: DogId
  ): Promise<BusinessRecord<RecordId, DogId>[]>
}

/** Interface of business record databases for guest accounts. */
export interface GuestBusinessRecordDatabase extends BusinessRecordDatabase<number> {}

/** Interface of business record databases for online accounts. */
export interface OnlineBusinessRecordDatabase extends BusinessRecordDatabase<string> {}

/** Interface of business records stored in databases. */
export interface BusinessRecord<
  RecordId extends number | string,
  DogId extends number | string
>
  extends BusinessRecordParamsOfDog<DogId>
{
  /** ID to identify the record in the database. */
  readonly recordId: RecordId
}

/** Generic business record. */
export type GenericBusinessRecord =
  BusinessRecord<number | string, number | string>
