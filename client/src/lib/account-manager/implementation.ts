import mapboxConfig from '../../configs/mapbox-config'
import { isLocalStorageSupported } from '../../utils/local-storage'

import type { AccountManager } from './interfaces'
import type { AccountInfo, GuestAccountInfo } from './types'
import { isGuestAccountInfo } from './utils'

/** Local storage key to store the account information. */
export const ACCOUNT_INFO_KEY = 'dogs-business.account'

/**
 * Implementation of {@link AccountManager}.
 *
 * @remarks
 *
 * Stores the account information in browser's local storage.
 */
export class AccountManagerImpl implements AccountManager {
  constructor() {
    if (!isLocalStorageSupported()) {
      throw new Error('localStorage is not supported on your browser')
    }
  }

  /** Loads the account info from the local storage. */
  async loadAccountInfo(): Promise<AccountInfo> {
    if (process.env.NODE_ENV !== 'production') {
      console.log('AccountManagerImpl', 'loadAccountInfo')
    }
    const accountInfoJson = window.localStorage.getItem(ACCOUNT_INFO_KEY)
    if (accountInfoJson == null) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(
          'AccountManagerImpl',
          'loadAccountInfo',
          'no account loaded',
        )
      }
      return { type: 'no-account' }
    }
    try {
      const accountInfo = JSON.parse(accountInfoJson)
      if (isGuestAccountInfo(accountInfo)) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(
            'AccountManagerImpl',
            'loadAccountInfo',
            'guest account loaded',
            accountInfo
          )
        }
        return accountInfo
      }
      console.error(
        'stored account info might be contaminated',
        accountInfoJson
      )
    } catch (err) {
      console.error('stored account info might be contaminated', err)
    }
    // resets the account info if it is invalid
    return { type: 'no-account' }
  }

  /** Saves the account info in the local storage. */
  async saveAccountInfo(accountInfo: AccountInfo): Promise<void> {
    if (process.env.NODE_ENV !== 'production') {
      console.log('AccountManagerImpl', 'saveAccountInfo', accountInfo)
    }
    if (accountInfo.type === 'no-account') {
      window.localStorage.removeItem(ACCOUNT_INFO_KEY)
    } else {
      window.localStorage.setItem(ACCOUNT_INFO_KEY, JSON.stringify(accountInfo))
      if (process.env.NODE_ENV !== 'production') {
        console.log(
          'AccountManagerImpl',
          'saveAccountInfo',
          'saved value',
          window.localStorage.getItem(ACCOUNT_INFO_KEY)
        )
      }
    }
  }

  /** Creates a new guest account. */
  async createGuestAccount(): Promise<GuestAccountInfo> {
    if (process.env.NODE_ENV !== 'production') {
      console.log('AccountManagerImpl', 'createGuestAccount')
    }
    return {
      type: 'guest',
      mapboxAccessToken: mapboxConfig.guestAccessToken
    }
  }
}
