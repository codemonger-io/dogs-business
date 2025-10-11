import { defineStore } from 'pinia'
import { ref, watch, watchEffect } from 'vue'
import type {
  CognitoTokens,
  PublicKeyInfo
} from '@codemonger-io/passquito-client-js'
import { useSessionStorage } from '@vueuse/core'

import { makeValidatingSerializer } from '../lib/storage-serializer'
import type { AccountInfo, OnlineAccountCredentials } from '../types/account-info'
import { isUserInfo } from '../types/account-info'
import {
  isAuthenticatorState,
  isEquivalentCognitoTokens
} from '../types/authenticator-state'
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
  const lastError = ref<any>()

  // syncs the state with given account info.
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
            // TODO: due to a corrupted account info?
            console.warn(`useAuthenticatorState.syncStateWithAccountInfo@${state.value.type}`, 'account info may have been corrupted')
            state.value = { type: 'welcoming' }
            break
          case 'authenticating':
          case 'authenticated':
          case 'authorized':
            // this may happen after the user signed up,
            // because the subsequent sign-in involves reloading the page
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
          case 'authorized':
            // online account should not be directly switched to a guest
            // TODO: handle as an error
            console.error(`useAuthenticatorState.syncStateWithAccountInfo@${state.value.type}`, 'cannot switch to guest account from online account')
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
            // if the Cognito tokens are available → authenticated state
            // otherwise → authenticating state
            if (accountInfo.tokens != null) {
              state.value = {
                type: 'authenticated',
                publicKeyInfo: accountInfo.publicKeyInfo,
                tokens: accountInfo.tokens
              }
            } else {
              state.value = {
                type: 'authenticating',
                publicKeyInfo: accountInfo.publicKeyInfo
              }
            }
            break
          case 'authenticating':
          case 'authenticated':
            break // authentication or authorization shall go on
          case 'authorized':
            // refreshes the tokens and fetches the user info again,
            // if the tokens have been expired
            if (isCognitoTokensExpired(state.value.tokens)) {
              if (process.env.NODE_ENV !== 'production') {
                console.log('useAuthenticatorState.syncStateWithAccountInfo', 'tokens have been expired')
              }
              state.value = {
                type: 'authenticated',
                publicKeyInfo: state.value.publicKeyInfo,
                tokens: state.value.tokens
              }
            }
            break
          case 'guest':
            // guest should not be directly switched to an online account
            // TODO: handle as an error
            console.error(`useAuthenticatorState.syncStateWithAccountInfo@${state.value.type}`, 'cannot switch to online account from guest')
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
  const _fetchOnlineAccountUserInfo = async (
    publicKeyInfo: PublicKeyInfo,
    tokens: CognitoTokens
  ) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('useAuthenticatorState._fetchOnlineAccountUserInfo', 'fetching user info', publicKeyInfo, tokens)
    }
    if (isCognitoTokensExpired(tokens)) {
      // refreshes the tokens first
      // this function shall be called again
      if (process.env.NODE_ENV !== 'production') {
        console.log('useAuthenticatorState._fetchOnlineAccountUserInfo', 'refreshing Cognito tokens')
      }
      try {
        const newTokens = await credentialsApi.refreshTokens(tokens.refreshToken)
        if (newTokens == null) {
          throw new Error('failed to refresh Cognito tokens')
        }
        if (process.env.NODE_ENV !== 'production') {
          console.log('useAuthenticatorState._fetchOnlineAccountUserInfo', 'refreshed Cognito tokens', tokens)
        }
        state.value = {
          type: 'authenticated',
          publicKeyInfo,
          tokens: newTokens
        }
      } catch (err) {
        // TODO: unauthorized error should trigger a sign-in request
        console.error('useAuthenticatorState._fetchOnlineAccountUserInfo', 'failed to refresh Cognito tokens', err)
        lastError.value = err
      }
      return
    }
    // updates the user information of the online account
    try {
      // TODO: what is the best way to provide the API access
      const url = import.meta.env.VITE_DOGS_BUSINESS_RESOURCE_API_BASE_URL + '/user'
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokens.idToken}`
        }
      })
      const userInfo = await res.json()
      if (process.env.NODE_ENV !== 'production') {
        console.log('useAuthenticatorState._fetchOnlineAccountUserInfo', 'fetched user information', userInfo)
      }
      if (!isUserInfo(userInfo)) {
        throw new Error('received invalid user information')
      }
      state.value = {
        type: 'authorized',
        publicKeyInfo,
        tokens,
        userInfo
      }
    } catch (err) {
      // TODO: transition to a proper state
      if (process.env.NODE_ENV !== 'production') {
        console.error('useAuthenticatorState._fetchOnlineAccountUserInfo', 'failed to fetch user information', err)
      }
      lastError.value = err
    }
  }

  // changes of the state should trigger authenticator events.
  watch(
    state,
    (state, oldState) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('useAuthenticatorState', 'state changed', `${oldState?.type} → ${state.type}`)
      }
      switch (state.type) {
        case 'loading':
        case 'welcoming':
          break // does nothing
        case 'guest':
          break // end of the event chain
        case 'authenticating':
          break // asks the user to sign in when the authenticator UI is attached
        case 'authenticated':
          // fetches the user information from the Dog's Business API
          _fetchOnlineAccountUserInfo(state.publicKeyInfo, state.tokens)
          break
        case 'authorized':
          break // end of the event chain
        default: {
          const unreachable: never = state
          throw new RangeError(`unknown authenticator state: ${unreachable}`)
        }
      }
    },
    { immediate: true }
  )

  // authenticates the online account when the authenticator UI is attached.
  watchEffect(() => {
    if (state.value.type !== 'authenticating') {
      return
    }
    if (_authenticatorUi.value == null) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('useAuthenticatorState', 'no authenticator UI is attached yet')
      }
      return
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log('useAuthenticatorState', 'asking sign-in with public key info', state.value.publicKeyInfo)
    }
    _authenticatorUi.value.askSignIn(state.value.publicKeyInfo)
  })

  // updates credentials for an online account.
  const updateCredentials = async (credentials: OnlineAccountCredentials) => {
    switch (state.value.type) {
      case 'loading':
      case 'welcoming':
        // if Cognito tokens are available → authenticated state
        // otherwise → authenticating state
        if (credentials.tokens != null) {
          state.value = {
            type: 'authenticated',
            publicKeyInfo: credentials.publicKeyInfo,
            tokens: credentials.tokens
          }
        } else {
          state.value = {
            type: 'authenticating',
            publicKeyInfo: credentials.publicKeyInfo
          }
        }
        break
      case 'guest':
        // TODO: handle as an error
        console.warn(`useAuthenticatorState.updateCredentials@${state.value.type}`, 'no credentials are expected')
        break
      case 'authenticating':
        if (credentials.tokens != null) {
          state.value = {
            type: 'authenticated',
            publicKeyInfo: credentials.publicKeyInfo,
            tokens: credentials.tokens
          }
        } else {
          // TODO: maybe switching to discoverable authentication
          console.warn(`useAuthenticatorState.updateCredentials@${state.value.type}`, 'Cognito tokens are expected')
        }
        break
      case 'authenticated':
      case 'authorized':
        if (credentials.tokens != null) {
          // Cognito tokens may have been refreshed
          if (!isEquivalentCognitoTokens(state.value.tokens, credentials.tokens)) {
            state.value = {
              type: 'authenticated',
              publicKeyInfo: state.value.publicKeyInfo,
              tokens: credentials.tokens
            }
          } else {
            // public key info may not change in this state
            // TODO: handle as an error
            console.warn(`useAuthenticatorState.updateCredentials@${state.value.type}`, 'refreshed Cognito tokens are expected')
          }
        } else {
          // public key info may not change in this state
          // TODO: handle as an error
          console.warn(`useAuthenticatorState.updateCredentials@${state.value.type}`, 'refreshed Cognito tokens are expected')
        }
        break
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
    // `detached` is to prevent multiple detachments
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

  return {
    attachAuthenticatorUi,
    state,
    syncStateWithAccountInfo,
    updateCredentials,
    _authenticatorUi
  }
})

// returns if given Cognito tokens are expired.
function isCognitoTokensExpired(tokens: CognitoTokens): boolean {
  const { activatedAt, expiresIn } = tokens
  return (Date.now() - activatedAt) >= (expiresIn * 1000)
}
