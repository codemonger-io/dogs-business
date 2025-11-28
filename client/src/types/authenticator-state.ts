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
 * @remarks
 *
 * Represents a state of the state machine defined in the "authenticator-state"
 * Pinia store.
 *
 * ### loading
 *
 * The initial state of the authenticator.
 * This state continues until the "account-manager" Pinia store becomes ready.
 *
 * ### welcoming
 *
 * The state where no account is created.
 * In this state, the user will be asked to
 * - create a new online account,
 * - create a guest account, or
 * - sign in to an existing online account
 *
 * If the user chooses to create a new online account, a ceremony for passkey
 * registration will be conducted.
 * And after successful passkey registration, the state will transition to
 * "authenticating".
 *
 * If the user chooses to create a guest account, a guest account will be
 * created.
 * And after successful guest account creation, the state will transition to
 * "guest".
 *
 * If the user chooses to sign in to an existing online account, the state will
 * transition to "authenticating".
 *
 * ### guest
 *
 * The state where a guest account is acitve.
 * In this state, the user can enjoy the app as a guest user.
 *
 * ### authenticating
 *
 * The state where an online account is being authenticated.
 * In this state, the user will be asked to sign in with a passkey.
 * After a successful sign-in, the state will transition to "authenticated".
 *
 * ### authenticated
 *
 * The state where an online account has been authenticated.
 * In this state, the user can enjoy the app with the full features.
 * When the Cognito tokens are about to expire, the state will transition to
 * "refreshing-tokens".
 *
 * ### refreshing-tokens
 *
 * The state where the Cognito tokens are being refreshed.
 * In this state, the user should not be interrupted.
 * After successful token refreshing, the state will transition back to
 * "authenticated".
 *
 * If the refresh token is no longer valid, the state will transition to
 * "authenticating".
 *
 * @beta
 */
export type AuthenticatorState =
  | LoadingAuthenticatorState
  | WelcomingAuthenticatorState
  | GuestAuthenticatorState
  | AuthenticatingAuthenticatorState
  | AuthenticatedAuthenticatorState
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

  /** Public key info of the online account. */
  publicKeyInfo: PublicKeyInfo

  /** Cognito tokens of the online account. */
  tokens: CognitoTokens

  /** User information on the online account. */
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
    case 'refreshing-tokens':
      return isTrueRefreshingTokensState(maybeAuthenticatorState)
    default: {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
