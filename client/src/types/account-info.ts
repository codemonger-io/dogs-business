import type {
  CognitoTokens,
  PublicKeyInfo
} from '@codemonger-io/passquito-client-js'
import {
  isCognitoTokens,
  isPublicKeyInfo
} from '@codemonger-io/passquito-client-js'

/**
 * Account information.
 *
 * @beta
 */
export type AccountInfo = NoAccountInfo | GuestAccountInfo | OnlineAccountInfo

/**
 * Account information when no account exists.
 *
 * @beta
 */
export interface NoAccountInfo {
  /** Type: always 'no-account'. */
  type: 'no-account'
}

/**
 * Account information on a guest account.
 *
 * @beta
 */
export interface GuestAccountInfo {
  /** Type: always 'guest'. */
  type: 'guest'

  /** ID of the active dog. */
  activeDogId?: number
}

/**
 * User information associated with an online account.
 *
 * @beta
 */
export interface UserInfo {
}

/**
 * Account information on an online account.
 *
 * @beta
 */
export interface OnlineAccountInfo {
  /** Type: always 'online'. */
  type: 'online'

  /** Public key info of the online account. */
  publicKeyInfo: PublicKeyInfo

  /** Cognito tokens of the online account. */
  tokens: CognitoTokens

  /** User information. */
  userInfo: UserInfo

  /** Active dog ID. */
  activeDogId?: string
}

/**
 * Returns if a given value is an {@link AccountInfo}.
 *
 * @beta
 */
export function isAccountInfo(value: unknown): value is AccountInfo {
  if (value == null || typeof value !== 'object') {
    return false
  }
  const maybeAccountInfo = value as AccountInfo
  if (typeof maybeAccountInfo.type !== 'string') {
    return false
  }
  switch (maybeAccountInfo.type) {
    case 'no-account':
      return true // no futher checks are needed
    case 'guest':
      return isTrueGuestAccountInfo(maybeAccountInfo)
    case 'online':
      return isTrueOnlineAccountInfo(maybeAccountInfo)
    default: {
      const _: never = maybeAccountInfo // ensures exhaustive type checking
      return false
    }
  }
}

// returns if a given value is truely a `GuestAccountInfo`.
// this function is intended to be used when only `type` is known to be "guest".
function isTrueGuestAccountInfo(accountInfo: GuestAccountInfo): boolean {
  if (
    accountInfo.activeDogId != null &&
    typeof accountInfo.activeDogId !== 'number'
  ) {
    return false
  }
  return true
}

// returns if a given value is truely an `OnlineAccountInfo`.
// this function is intended to be used when only `type` is known to be "online".
function isTrueOnlineAccountInfo(accountInfo: OnlineAccountInfo): boolean {
  if (!isPublicKeyInfo(accountInfo.publicKeyInfo)) {
    return false
  }
  if (!isCognitoTokens(accountInfo.tokens)) {
    return false
  }
  if (!isUserInfo(accountInfo.userInfo)) {
    return false
  }
  if (
    accountInfo.activeDogId != null &&
    typeof accountInfo.activeDogId !== 'string'
  ) {
    return false
  }
  return true
}

/**
 * Returns if a given value is a `UserInfo`.
 *
 * @beta
 */
export function isUserInfo(value: unknown): value is UserInfo {
  if (value == null || typeof value !== 'object') {
    return false
  }
  return true // there is no field for now
}
