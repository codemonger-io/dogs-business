import { defineStore } from 'pinia'
import { inject, ref, watch, watchEffect } from 'vue'
import type {
  CognitoTokens,
  PublicKeyInfo
} from '@codemonger-io/passquito-client-js'
import { useSessionStorage } from '@vueuse/core'

import { makeValidatingSerializer } from '../lib/storage-serializer'
import { RESOURCE_API_INJECTION_KEY } from '../providers/resource-api'
import type { AccountInfo } from '../types/account-info'
import { isUserInfo } from '../types/account-info'
import { isAuthenticatorState } from '../types/authenticator-state'
import { isCognitoTokensExpiring } from '../utils/passquito'
import { useCredentialsApi } from './credentials-api'

/**
 * User interface provider for authentication.
 *
 * @remarks
 *
 * While authentication needs user interaction, the store does not know how to
 * do it.
 * UI components responsible for user authentication should implement this
 * interface and attach it to the store using `attachAuthenticatorUi`.
 *
 * @beta
 */
export interface AuthenticatorUi {
  /**
   * Asks the user to sign in.
   *
   * @remarks
   *
   * `AuthenticatorUi` is supposed to offer the user a sign-in form.
   *
   * @param publicKeyInfo -
   *
   *   Public key info of the user to sign in.
   */
  askSignIn(publicKeyInfo: PublicKeyInfo): void | Promise<void>
}

/**
 * Error caused by the store for the authenticator state.
 *
 * @remarks
 *
 * All the variants have the `type` field.
 *
 * @beta
 */
export type UseAuthenticatorStateError = CorruptedAccountInfoError | AnyError

/**
 * Error caused by a corrupted account info.
 *
 * @beta
 */
export interface CorruptedAccountInfoError {
  type: 'corrupted-account-info'

  /** Cause of the error. */
  cause: string
}

/**
 * Any error caught by the store.
 *
 * @beta
 */
export interface AnyError {
  type: 'any-error'

  /** Caught error. */
  cause: unknown
}

// Request waiting for Cognito tokens refreshing.
type RefreshCognitoTokensRequest = {
  resolve: (tokens: CognitoTokens) => void
  reject: (reason?: any) => void
}

// Updated credentials.
type UpdatedCredentials = {
  // public key info of the online account
  publicKeyInfo: PublicKeyInfo

  // optional Cognito tokens of the online account
  tokens?: CognitoTokens
}

/**
 * Uses the authenticator state maintained throughout the application.
 *
 * @remaks
 *
 * It calls `useCredentialsApi` to access the Credentials API.
 *
 * @beta
 */
export const useAuthenticatorState = defineStore('authenticator-state', () => {
  // Credentials API
  const credentialsApi = useCredentialsApi()

  // Dog's Business Resource API
  const resourceApi = inject(RESOURCE_API_INJECTION_KEY)
  if (resourceApi == null) {
    throw new Error('Resource API must be provided')
  }

  // authenticator UI provides a way to ask the user to sign in.
  const _authenticatorUi = ref<AuthenticatorUi>()

  // the state.
  // NOTE: update `state` in an immutable manner; i.e., do not partially update it
  const state = useSessionStorage(
    'dogs-business.authenticator-state',
    { type: 'loading' }, // loading by default
    {
      writeDefaults: false,
      deep: false, // partial updates are not saved
      serializer: makeValidatingSerializer(isAuthenticatorState)
    }
  )

  // remembers the last error.
  const lastError = ref<UseAuthenticatorStateError>()

  // syncs the state with given account info.
  //
  // if the state and the account info disagree, the state shall precede.
  const syncStateWithAccountInfo = (accountInfo: AccountInfo) => {
    switch (accountInfo.type) {
      case 'no-account':
        switch (state.value.type) {
          case 'loading':
            state.value = { type: 'welcoming' }
            break
          case 'welcoming':
            break // does nothing
          case 'guest':
          case 'authenticated':
          case 'refreshing-tokens':
            // due to a corrupted account info?
            // fall back to the welcoming state
            console.warn(`useAuthenticatorState.syncStateWithAccountInfo@${state.value.type}`, 'account info may have been corrupted')
            lastError.value = {
              type: 'corrupted-account-info',
              cause: 'account info was lost'
            }
            state.value = { type: 'welcoming' }
            break
          case 'authenticating':
            // this may happen just after the user signed in,
            // because signing-in involves reloading the page and the initial
            // account info may be "no-account"
            // the initialization of the account info may also delay
            break
          default: {
            const unreachable: never = state.value
            throw new RangeError(`unknown authenticator state: ${unreachable}`)
          }
        }
        break
      case 'guest':
        switch (state.value.type) {
          case 'loading':
          case 'welcoming':
            state.value = { type: 'guest' }
            break
          case 'guest':
            break // does nothing
          case 'authenticating':
          case 'authenticated':
          case 'refreshing-tokens':
            // online account should not be directly switched to a guest
            // falls back to the welcoming state
            console.error(`useAuthenticatorState.syncStateWithAccountInfo@${state.value.type}`, 'cannot switch to guest account from online account')
            lastError.value = {
              type: 'corrupted-account-info',
              cause: 'switching from online account to guest account'
            }
            state.value = { type: 'welcoming' }
            break
          default: {
            const unreachable: never = state.value
            throw new RangeError(`unknown authenticator state: ${unreachable}`)
          }
        }
        break
      case 'online':
        switch (state.value.type) {
          case 'loading':
          case 'welcoming':
            // if the Cognito tokens are available → fetches the user information
            // otherwise → authenticating state
            if (accountInfo.tokens != null) {
              _fetchOnlineAccountUserInfo(
                accountInfo.publicKeyInfo,
                accountInfo.tokens
              )
            } else {
              state.value = {
                type: 'authenticating',
                publicKeyInfo: accountInfo.publicKeyInfo
              }
            }
            break
          case 'authenticating':
            // this will happen during re-authentication
            // because the page will be reloaded
            break
          case 'refreshing-tokens':
            // this might happen if the user reloads the page while tokens
            // are being refreshed
            // the subsequent refreshing shall be done anyway
            break
          case 'authenticated':
            // refreshes the tokens and fetches the user info again
            // if the tokens have been expired
            // TODO: what if the public key is different?
            if (isCognitoTokensExpiring(state.value.tokens)) {
              if (process.env.NODE_ENV !== 'production') {
                console.log('useAuthenticatorState.syncStateWithAccountInfo', 'tokens have been expired')
              }
              state.value = {
                type: 'refreshing-tokens',
                publicKeyInfo: state.value.publicKeyInfo,
                tokens: state.value.tokens
              }
            }
            break
          case 'guest':
            // guest should not be directly switched to an online account
            console.error(`useAuthenticatorState.syncStateWithAccountInfo@${state.value.type}`, 'cannot switch to online account from guest')
            lastError.value = {
              type: 'corrupted-account-info',
              cause: 'switching from guest account to online account'
            }
            state.value = { type: 'welcoming' }
            break
          default: {
            const unreachable: never = state.value
            throw new RangeError(`unknown authenticator state: ${unreachable}`)
          }
        }
        break
      default: {
        const unreachable: never = accountInfo
        throw new RangeError(`unknown account type: ${unreachable}`)
      }
    }
  }

  // fetches the user information of the online account.
  //
  // this function updates the state to "authenticated" on success,
  const _fetchOnlineAccountUserInfo = async (
    publicKeyInfo: PublicKeyInfo,
    tokens: CognitoTokens
  ) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('useAuthenticatorState._fetchOnlineAccountUserInfo', 'fetching user info', publicKeyInfo, tokens)
    }
    if (isCognitoTokensExpiring(tokens)) {
      // transitions to the refreshing-tokens state to refresh the tokens first
      state.value = {
        type: 'refreshing-tokens',
        publicKeyInfo,
        tokens
      }
      return
    }
    // updates the user information of the online account
    try {
      const res = await resourceApi.getCurrentUserInfo(tokens.idToken)
      if (res.ok) {
        const userInfo = await res.parse()
        if (process.env.NODE_ENV !== 'production') {
          console.log('useAuthenticatorState._fetchOnlineAccountUserInfo', 'fetched user information', userInfo)
        }
        state.value = {
          type: 'authenticated',
          publicKeyInfo,
          tokens,
          userInfo
        }
      } else {
        // re-authenticates if the error is Unauthorized (401)
        if (res.status === 401) {
          if (process.env.NODE_ENV !== 'production') {
            console.log('useAuthenticatorState._fetchOnlineAccountUserInfo', 'access denied. re-authenticating')
          }
          state.value = {
            type: 'authenticating',
            publicKeyInfo
          }
        } else {
          throw new Error(`failed to fetch user information: ${res.status} ${await res.text()}`)
        }
      }
    } catch (err) {
      console.error('useAuthenticatorState._fetchOnlineAccountUserInfo', err)
      lastError.value = {
        type: 'any-error',
        cause: err
      }
      // TODO: should transition into the "welcoming" state?
    }
  }

  // requests waiting for Cognito tokens refreshing.
  const _refreshCognitoTokensRequests = ref<RefreshCognitoTokensRequest[]>([]);

  // refreshes the Cognito tokens.
  //
  // multiple calls to this function during the `refreshing-tokens` state
  // won't run multiple processes but wait for the current refreshing to be done
  const refreshCognitoTokens = async (): Promise<CognitoTokens> => {
    const currentState = state.value
    switch (currentState.type) {
      case 'refreshing-tokens':
        // waits until the current refreshing is done
        return new Promise((resolve, reject) => {
          _refreshCognitoTokensRequests.value.push({ resolve, reject })
        })
      case 'authenticated':
        // transitions to the refreshing-tokens state
        // and waits until the refreshing is done
        return new Promise((resolve, reject) => {
          _refreshCognitoTokensRequests.value.push({ resolve, reject })
          state.value = {
            type: 'refreshing-tokens',
            publicKeyInfo: currentState.publicKeyInfo,
            tokens: currentState.tokens
          }
        })
      case 'loading':
      case 'welcoming':
      case 'guest':
      case 'authenticating':
        // Cognito tokens should not be available in these states
        console.error(`useAuthenticatorState.refreshCognitoTokens@${currentState.type}`, 'no Cognito tokens to refresh')
        throw new Error('no Cognito tokens to refresh')
      default: {
        const unreachable: never = currentState
        throw new RangeError(`unknown authenticator state: ${unreachable}`)
      }
    }
  }

  // actually refreshes the Cognito tokens.
  //
  // calling this function during other than the `refreshing-tokens` state
  // throws an error.
  const _refreshCognitoTokens = async () => {
    if (state.value.type !== 'refreshing-tokens') {
      throw new Error(`_refreshCognitoTokens was called in a wrong state: ${state.value.type}`)
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log('useAuthenticatorState._refreshCognitoTokens', 'refreshing Cognito tokens')
    }
    const { publicKeyInfo, tokens } = state.value
    try {
      const newTokens = await credentialsApi.refreshTokens(tokens.refreshToken)
      if (newTokens == null) {
        throw new Error('failed to refresh Cognito tokens')
      }
      if (process.env.NODE_ENV !== 'production') {
        console.log('useAuthenticatorState._refreshCognitoTokens', 'refreshed Cognito tokens', tokens)
      }
      _refreshCognitoTokensRequests.value.forEach(async (request) => request.resolve(newTokens))
      _fetchOnlineAccountUserInfo(publicKeyInfo, newTokens)
    } catch (err) {
      // rejects requests waiting for the refreshing
      _refreshCognitoTokensRequests.value.forEach(async (request) => request.reject(err))
      // transitions back to the authenticating state anyway
      // TODO: deal with errors other than Unauthorized (401)
      console.error('useAuthenticatorState._refreshCognitoTokens', 'failed to refresh Cognito tokens', err)
      lastError.value = {
        type: 'any-error',
        cause: err
      }
      state.value = {
        type: 'authenticating',
        publicKeyInfo,
      }
    } finally {
      _refreshCognitoTokensRequests.value = []
    }
    return
  }

  // just logs state changes for debugging.
  watch(
    state,
    (state, oldState) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('useAuthenticatorState', 'state changed', `${oldState?.type} → ${state.type}`)
      }
    },
    { immediate: true }
  )

  // changes of the state may trigger authenticator events.
  watchEffect(() => {
    switch (state.value.type) {
      case 'loading':
      case 'welcoming':
      case 'guest':
        // does nothing
        break
      case 'authenticating': {
        // asks the user to sign in if the authenticator UI is attached
        if (_authenticatorUi.value != null) {
          if (process.env.NODE_ENV !== 'production') {
            console.log('useAuthenticatorState', 'asking sign-in with public key info', state.value.publicKeyInfo)
          }
          _authenticatorUi.value.askSignIn(state.value.publicKeyInfo)
        } else {
          if (process.env.NODE_ENV !== 'production') {
            console.log('useAuthenticatorState', 'no authenticator UI is attached yet')
          }
        }
        break
      }
      case 'authenticated':
        // does nothing
        break
      case 'refreshing-tokens':
        // refreshes the Cognito tokens
        if (process.env.NODE_ENV !== 'production') {
          console.log('useAuthenticatorState', 'refreshing Cognito tokens')
        }
        _refreshCognitoTokens()
        break
      default: {
        const unreachable: never = state.value
        throw new RangeError(`unknown authenticator state: ${unreachable}`)
      }
    }
  })

  // updates credentials for an online account.
  //
  // this action is allowed only in the following states:
  // - loading
  // - welcoming
  // - authenticating
  //
  // throws an `Error` in other states.
  const updateCredentials = async (credentials: UpdatedCredentials) => {
    switch (state.value.type) {
      case 'loading':
      case 'welcoming':
        // if Cognito tokens are available → fetches the user information
        // otherwise → authenticating state
        if (credentials.tokens != null) {
          _fetchOnlineAccountUserInfo(credentials.publicKeyInfo, credentials.tokens)
        } else {
          state.value = {
            type: 'authenticating',
            publicKeyInfo: credentials.publicKeyInfo
          }
        }
        break
      case 'guest':
        console.error(`useAuthenticatorState.updateCredentials@${state.value.type}`, 'no credentials are expected')
        throw new Error('guest should not update credentials')
      case 'authenticating':
        if (credentials.tokens != null) {
          _fetchOnlineAccountUserInfo(credentials.publicKeyInfo, credentials.tokens)
        } else {
          // TODO: maybe switching to discoverable authentication
          console.warn(`useAuthenticatorState.updateCredentials@${state.value.type}`, 'Cognito tokens are expected')
        }
        break
      case 'authenticated':
        console.error(`useAuthenticatorState.updateCredentials@${state.value.type}`, 'credentials should not be updated')
        throw new Error('should not update credentials in the authenticated state')
      case 'refreshing-tokens':
        // credentials should not be updated in this state
        console.error(`useAuthenticatorState.updateCredentials@${state.value.type}`, 'credentials should not be updated')
        throw new Error('should not update credentials in the refreshing-tokens state')
      default: {
        const unreachable: never = state.value
        throw new RangeError(`unknown authenticator state: ${unreachable}`)
      }
    }
  }

  // attaches a given `AuthenticatorUi`.
  //
  // the provider of the `AuthenticatorUi` should call the returned function
  // to detach the `AuthenticatorUi` when it is unmounted.
  const attachAuthenticatorUi = (authenticatorUi: AuthenticatorUi) => {
    if (_authenticatorUi.value != null) {
      throw new Error('only one authenticator UI can be attached at a time')
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log('useAuthenticatorState', 'attaching authenticator UI')
    }
    _authenticatorUi.value = authenticatorUi
    // function to detach the authenticator UI
    // `detached` is a flag to prevent multiple detachments
    let detached = false
    return () => {
      if (detached) {
        console.warn('useAuthenticatorState', 'autheticator UI is already detached')
        return
      }
      if (process.env.NODE_ENV !== 'production') {
        console.log('useAuthenticatorState', 'detaching authenticator UI')
      }
      _authenticatorUi.value = undefined
      detached = true
    }
  }

  // triggers re-authentication
  //
  // calling this function during other than the "authenticated" state throws an error.
  const triggerReAuthentication = () => {
    if (state.value.type !== 'authenticated') {
      throw new Error(`re-authentication must be triggered in the authenticated state: ${state.value.type}`)
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log('useAuthenticatorState.triggerReAuthenticating', 'triggering re-authentication')
    }
    state.value = {
      type: 'authenticating',
      publicKeyInfo: state.value.publicKeyInfo
    }
  }

  return {
    attachAuthenticatorUi,
    lastError,
    refreshCognitoTokens,
    state,
    syncStateWithAccountInfo,
    triggerReAuthentication,
    updateCredentials,
    _authenticatorUi,
    _refreshCognitoTokensRequests
  }
})
