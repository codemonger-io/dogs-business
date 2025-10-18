import type {
  CognitoTokens,
  PublicKeyInfo
} from '@codemonger-io/passquito-client-js'
import {
  isCognitoTokens,
  isPublicKeyInfo
} from '@codemonger-io/passquito-client-js'

import type { UserInfo } from '../types/account-info'
import { isUserInfo } from '../types/account-info'

/**
 * State of authenticator.
 *
 * @beta
 */
export type AuthenticatorState =
  | LoadingAuthenticatorState
  | WelcomingAuthenticatorState
  | GuestAuthenticatorState
  | AuthenticatingAuthenticatorState
  | AuthenticatedAuthenticatorState
  | AuthorizedAuthenticatorState
  | RefreshingTokensState

/**
 * Authenticator state is being loaded.
 *
 * @beta
 */
export interface LoadingAuthenticatorState {
  type: 'loading'
}

/**
 * Authenticator is welcoming the user.
 *
 * @beta
 */
export interface WelcomingAuthenticatorState {
  type: 'welcoming'
}

/**
 * Guest account is active.
 *
 * @beta
 */
export interface GuestAuthenticatorState {
  type: 'guest'
}

/**
 * Online account is being authenticated.
 *
 * @beta
 */
export interface AuthenticatingAuthenticatorState {
  type: 'authenticating'

  /** Public key info of the online account being authenticated. */
  publicKeyInfo: PublicKeyInfo
}

/**
 * Online account has been authenticated.
 *
 * @beta
 */
export interface AuthenticatedAuthenticatorState {
  type: 'authenticated'

  /** Public key info of the authenticated user. */
  publicKeyInfo: PublicKeyInfo

  /** Cognito tokens of the authenticated user. */
  tokens: CognitoTokens
}

/**
 * User has been authorized to access the application.
 *
 * @beta
 */
export interface AuthorizedAuthenticatorState {
  type: 'authorized'

  /** Public key info of the authorized user. */
  publicKeyInfo: PublicKeyInfo

  /** Cognito tokens of the authorized user. */
  tokens: CognitoTokens

  /** Information on the authorized user. */
  userInfo: UserInfo
}

/**
 * Refreshing the Cognito tokens.
 *
 * @beta
 */
export interface RefreshingTokensState {
  type: 'refreshing-tokens'

  /** Public key info of the authorized user. */
  publicKeyInfo: PublicKeyInfo

  /** Cognito tokens of the authorized user. */
  tokens: CognitoTokens
}

/**
 * Returns if a given value is an instance of `AuthenticatorState`.
 *
 * @remarks
 *
 * If this function returns `true`, you can safely assume the specific
 * `AuthenticatorState` variant from the `type` property.
 *
 * @beta
 */
export function isAuthenticatorState(value: unknown): value is AuthenticatorState {
  if (value == null || typeof value !== 'object') {
    return false
  }
  const maybeAuthenticatorState = value as AuthenticatorState
  if (typeof maybeAuthenticatorState.type !== 'string') {
    return false
  }
  switch (maybeAuthenticatorState.type) {
    case 'loading':
      return true // no further checks are needed
    case 'welcoming':
      return true // no further checks are needed
    case 'guest':
      return true // no futher checks are needed
    case 'authenticating':
      return isTrueAuthenticatingAuthenticatorState(maybeAuthenticatorState)
    case 'authenticated':
      return isTrueAuthenticatedAuthenticatorState(maybeAuthenticatorState)
    case 'authorized':
      return isTrueAuthorizedAuthenticatorState(maybeAuthenticatorState)
    case 'refreshing-tokens':
      return isTrueRefreshingTokensState(maybeAuthenticatorState)
    default: {
      const _: never = maybeAuthenticatorState // ensures exhaustive type checking
      return false
    }
  }
}

// returns if a given value is truely `AuthenticatingAuthenticatorState`.
// this function is intended to be used when only `type` is known to be
// "authenticating".
function isTrueAuthenticatingAuthenticatorState(
  state: AuthenticatingAuthenticatorState
): boolean {
  return isPublicKeyInfo(state.publicKeyInfo)
}

// returns if a given value is truely `AuthenticatedAuthenticatorState`.
// this function is intended to be used when only `type` is known to be
// "authenticated".
function isTrueAuthenticatedAuthenticatorState(
  state: AuthenticatedAuthenticatorState
): boolean {
  return isPublicKeyInfo(state.publicKeyInfo) && isCognitoTokens(state.tokens)
}

// returns if a given value is truely `AuthorizedAuthenticatorState`.
// this function is intended to be used when only `type` is known to be
// "authorized".
function isTrueAuthorizedAuthenticatorState(
  state: AuthorizedAuthenticatorState
): boolean {
  return isPublicKeyInfo(state.publicKeyInfo) &&
    isCognitoTokens(state.tokens) &&
    isUserInfo(state.userInfo)
}

// returns if a given value is truely `RefreshingTokensState`.
// this function is intended to be used when only `type` is known to be
// "refreshing-tokens".
function isTrueRefreshingTokensState(
  state: RefreshingTokensState
): boolean {
  return isPublicKeyInfo(state.publicKeyInfo) && isCognitoTokens(state.tokens)
}

/**
 * Returns if given two `CognitoTokens`s are equivalent.
 *
 * @remarks
 *
 * Does not take into account `activatedAt` and `expiresIn`.
 *
 * @beta
 */
export function isEquivalentCognitoTokens(
  tokens1: CognitoTokens,
  tokens2: CognitoTokens
): boolean {
  return tokens1.accessToken === tokens2.accessToken &&
    tokens1.idToken === tokens2.idToken &&
    tokens1.refreshToken === tokens2.refreshToken
}
