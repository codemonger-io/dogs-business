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

  /** Mapbox access token for the guest. */
  mapboxAccessToken: string

  /** Key of the active dog. */
  activeDogKey?: number
}

/**
 * Credentials for an online account.
 *
 * @beta
 */
export interface OnlineAccountCredentials {
  /** Public key info of the online account. */
  publicKeyInfo: PublicKeyInfo

  /**
   * Cognito tokens of the online account.
   *
   * @remarks
   *
   * Maybe `undefined` if the user is not authenticated yet.
   */
  tokens?: CognitoTokens
}

/**
 * User information associated with an online account.
 *
 * @beta
 */
export interface UserInfo {
  /** Mapbox access token for the user. */
  mapboxAccessToken: string
}

/**
 * Account information on an online account.
 *
 * @beta
 */
export interface OnlineAccountInfo extends OnlineAccountCredentials {
  /** Type: always 'online'. */
  type: 'online'

  /** User information. */
  userInfo?: UserInfo
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
  if (typeof accountInfo.mapboxAccessToken !== 'string') {
    return false
  }
  if (
    accountInfo.activeDogKey != null &&
    typeof accountInfo.activeDogKey !== 'number'
  ) {
    return false
  }
  return true
}

// returns if a given value is truely an `OnlineAccountInfo`.
// this function is intended to be used when only `type` is known to be "online".
function isTrueOnlineAccountInfo(accountInfo: OnlineAccountInfo): boolean {
  if (!isTrueOnlineAccountCredentials(accountInfo)) {
    return false
  }
  if (accountInfo.userInfo != null && !isTrueUserInfo(accountInfo.userInfo)) {
    return false
  }
  return true
}

// returns if a given value is truely an `AuthenticationProperties`.
// this function is intended to be used when only `type` is known to be "online".
function isTrueOnlineAccountCredentials(credentials: OnlineAccountCredentials): boolean {
  if (!isPublicKeyInfo(credentials.publicKeyInfo)) {
    return false
  }
  if (credentials.tokens != null && !isCognitoTokens(credentials.tokens)) {
    return false
  }
  return true
}

// returns if a given value is truely a `UserInfo`.
// this function is intended to be used when the value is known to be a non-null
// object.
function isTrueUserInfo(userInfo: UserInfo): boolean {
  return typeof userInfo.mapboxAccessToken === 'string'
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
  return isTrueUserInfo(value as UserInfo)
}

/**
 * Returns if given two possible `UserInfo` are the same.
 *
 * @beta
 */
export function isSameUserInfo(userInfo1?: UserInfo, userInfo2?: UserInfo): boolean {
  return userInfo1 != null &&
    userInfo2 != null &&
    userInfo1.mapboxAccessToken === userInfo2.mapboxAccessToken
}
