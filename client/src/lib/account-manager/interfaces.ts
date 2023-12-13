import type { AccountInfo, GuestAccountInfo } from './types'

/** Interface of account managers. */
export interface AccountManager {
  /** Returns the current account info. */
  getAccountInfo(): Promise<AccountInfo>

  /**
   * Creates a new guest account.
   *
   * @returns
   *
   *   Account info of the created guest account.
   */
  createGuestAccount(): Promise<GuestAccountInfo>
}
