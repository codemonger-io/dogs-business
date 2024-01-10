import type { AccountInfo, GuestAccountInfo } from './types'

/** Interface of account managers. */
export interface AccountManager {
  /**
   * Loads the stored account info.
   *
   * @remarks
   *
   * Account info is supposed to be stored in `localStorage`.
   */
  loadAccountInfo(): Promise<AccountInfo>

  /**
   * Saves a given account info in the store.
   *
   * @remarks
   *
   * Account info is supposed to be stored in `localStorage`.
   *
   * If `accountInfo.type` is `"no-account"`, the stored account info will be
   * cleared.
   */
  saveAccountInfo(accountInfo: AccountInfo): Promise<void>

  /**
   * Creates a new guest account.
   *
   * @returns
   *
   *   Account info of the created guest account.
   */
  createGuestAccount(): Promise<GuestAccountInfo>
}
