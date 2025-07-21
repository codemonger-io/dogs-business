// TODO: this is likely a store for an active account.

import { defineStore } from 'pinia'
import {
  type App,
  type InjectionKey,
  computed,
  inject,
  markRaw,
  ref,
  watch,
  watchEffect
} from 'vue'
import type { CognitoTokens, PublicKeyInfo } from '@codemonger-io/passquito-client-js'
import { useSessionStorage, useStorage } from '@vueuse/core'

import type {
  AccountInfo,
  GuestAccountInfo,
  OnlineAccountCredentials,
  UserInfo
} from '../types/account-info'
import { isAccountInfo, isSameUserInfo, isUserInfo } from '../types/account-info'
import type { AuthenticatorState } from '../types/authenticator-state'
import {
  isAuthenticatorState,
  isEquivalentCognitoTokens
} from '../types/authenticator-state'
import type {
  GenericBusinessRecord,
  BusinessRecordDatabaseManager,
  BusinessRecordParams
} from '../lib/business-record-database'
import type {
  DogDatabaseManager,
  DogParams,
  GenericDog
} from '../lib/dog-database'
import { isGuestDog } from '../lib/dog-database'
import { makeValidatingSerializer } from '../lib/storage-serializer'
import { useCredentialsApi } from './credentials-api'

/** Injection key for the dog database manager. */
export const DOG_DATABASE_MANAGER_INJECTION_KEY =
  Symbol() as InjectionKey<DogDatabaseManager>

/** Injection key for the business record database manager. */
export const BUSINESS_RECORD_DATABASE_MANAGER_INJECTION_KEY =
  Symbol() as InjectionKey<BusinessRecordDatabaseManager>

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
 * Uses the provided account manager.
 *
 * @remarks
 *
 * An instance of {@link DogDatabaseManager} is supposed to be provided by the
 * host Vue application.
 *
 * An instance of {@link BusinessRecordDatabaseManager} is supposed to be
 * provided by the host Veu application.
 *
 * @throws Error
 *
 *   If no account manager is provided,
 *   or if no dog database manager is provided,
 *   or if no business record database manager is provided.
 */
export const useAccountManager = defineStore('accountManager', () => {
  const dogDatabaseManager = inject(DOG_DATABASE_MANAGER_INJECTION_KEY)
  if (dogDatabaseManager == null) {
    throw new Error('no dog database manager is provided')
  }
  const businessRecordDatabaseManager =
    inject(BUSINESS_RECORD_DATABASE_MANAGER_INJECTION_KEY)
  if (businessRecordDatabaseManager == null) {
    throw new Error('no business record database manager is provided')
  }

  const credentialsApi = useCredentialsApi()

  // remembers the last error.
  const lastError = ref<any>()

  // runs a given function and captures any error.
  // the error is rethrown after being remembered in `lastError`.
  //
  // `finally_` is an optional function that always runs after `f` is executed.
  const runAndCaptureError = <T>(f: () => T, finally_?: () => void) => {
    try {
      return f()
    } catch (err) {
      console.error('useAccountManager', 'captured error', err)
      lastError.value = err
      throw err
    } finally {
      finally_?.()
    }
  }

  // authenticator UI provides a way to ask the user to sign in.
  const authenticatorUi = ref<AuthenticatorUi>()

  // state of the authenticator.
  // NOTE: update `authenticatorState` in an immutable manner; i.e., do not partially update
  const authenticatorState = useSessionStorage(
    'dogs-business.authenticator-state',
    { type: 'loading' }, // loading by default
    {
      writeDefaults: false,
      deep: false, // partial updates are not saved
      serializer: makeValidatingSerializer(isAuthenticatorState)
    }
  )

  // account info is stored in the local storage.
  // NOTE: update `accountInfo` in an immutable manner; i.e., do not partially update
  const accountInfo = useStorage(
    'dogs-business.account',
    { type: 'no-account' }, // no account by default
    undefined,
    {
      writeDefaults: false,
      deep: false, // partial updates are not saved
      serializer: makeValidatingSerializer(isAccountInfo)
    }
  )

  // initializes the authenticator state according to the account info.
  watchEffect(() => {
    switch (accountInfo.value.type) {
      case 'no-account':
        switch (authenticatorState.value.type) {
          case 'loading':
          case 'welcoming':
            break // does nothing
          case 'guest':
          case 'authenticating':
          case 'authenticated':
          case 'authorized':
            // TODO: due to a corrupted account info?
            console.warn('useAccountManager', 'account info may have been corrupted')
            authenticatorState.value = { type: 'welcoming' }
            break
          default: {
            const unreachable: never = authenticatorState.value
            throw new RangeError(`unknown authenticator state: ${unreachable}`)
          }
        }
        break
      case 'guest':
        switch (authenticatorState.value.type) {
          case 'loading':
          case 'welcoming':
            authenticatorState.value = { type: 'guest' }
            break
          case 'guest':
            break // does nothing
          case 'authenticating':
          case 'authenticated':
          case 'authorized':
            // online account should not be directly switched to a guest
            // TODO: handle as an error
            console.error('useAccountManager', 'cannot switch to guest account from online account')
            break
          default: {
            const unreachable: never = authenticatorState.value
            throw new RangeError(`unknown authenticator state: ${unreachable}`)
          }
        }
        break
      case 'online':
        switch (authenticatorState.value.type) {
          case 'loading':
          case 'welcoming':
            // if the Cognito tokens are available → authenticated state
            // otherwise → authenticating state
            if (accountInfo.value.tokens != null) {
              authenticatorState.value = {
                type: 'authenticated',
                publicKeyInfo: accountInfo.value.publicKeyInfo,
                tokens: accountInfo.value.tokens
              }
            } else {
              authenticatorState.value = {
                type: 'authenticating',
                publicKeyInfo: accountInfo.value.publicKeyInfo
              }
            }
            break
          case 'authenticating':
          case 'authenticated':
          case 'authorized':
            break // does nothing
          case 'guest':
            // guest should not be directly switched to an online account
            // TODO: handle as an error
            console.error('useAccountManager', 'cannot switch to online account from guest')
            break
          default: {
            const unreachable: never = authenticatorState.value
            throw new RangeError(`unknown authenticator state: ${unreachable}`)
          }
        }
        break
      default: {
        const unreachable: never = accountInfo.value
        throw new RangeError(`unknown account type: ${unreachable}`)
      }
    }
  })

  // updates the information on the online account.
  const _updateOnlineAccountInfo = (
    publicKeyInfo: PublicKeyInfo,
    tokens: CognitoTokens,
    userInfo?: UserInfo
  ) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('useAccountManager._updateOnlineAccountCredentials', 'updating credentials', publicKeyInfo, tokens)
    }
    if (accountInfo.value.type === 'online') {
      // updates the existing online account info
      // if the user ID (`userHandle`) is the same, retains the other information
      // otherwise, simply replaces the account info
      if (accountInfo.value.publicKeyInfo.userHandle === publicKeyInfo.userHandle) {
        const {
          publicKeyInfo: _1,
          tokens: _2,
          userInfo: oldUserInfo,
          ...rest
        } = accountInfo.value
        accountInfo.value = {
          ...rest,
          publicKeyInfo,
          tokens,
          userInfo: userInfo ?? oldUserInfo
        }
      } else {
        accountInfo.value = {
          type: 'online',
          publicKeyInfo,
          tokens,
          userInfo
        }
      }
    } else {
      // simply replaces the account info
      accountInfo.value = {
        type: 'online',
        publicKeyInfo,
        tokens,
        userInfo
      }
    }
  }

  // fetches the user information of the online account
  const _fetchOnlineAccountUserInfo = async (
    publicKeyInfo: PublicKeyInfo,
    tokens: CognitoTokens
  ) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('useAccountManager._fetchOnlineAccountUserInfo', 'fetching user info', publicKeyInfo, tokens)
    }
    if (isCognitoTokensExpired(tokens)) {
      // refreshes the tokens first
      // this watch function will be triggered again
      if (process.env.NODE_ENV !== 'production') {
        console.log('useAccountManager._fetchOnlineAccountUserInfo', 'refreshing Cognito tokens')
      }
      try {
        const newTokens = await credentialsApi.refreshTokens(tokens.refreshToken)
        if (newTokens == null) {
          throw new Error('failed to refresh Cognito tokens')
        }
        if (process.env.NODE_ENV !== 'production') {
          console.log('useAccountManager._fetchOnlineAccountUserInfo', 'refreshed Cognito tokens', tokens)
        }
        authenticatorState.value = {
          type: 'authenticated',
          publicKeyInfo,
          tokens: newTokens
        }
      } catch (err) {
        // TODO: unauthorized error should trigger a sign-in request
        console.error('useAccountManager._fetchOnlineAccountUserInfo', 'failed to refresh Cognito tokens', err)
        lastError.value = err
      }
      return
    }
    // updates the user information of the online account
    try {
      // TODO: what is the best way to provide the API access
      const url = import.meta.env.VITE_DOGS_BUSINESS_API_BASE_URL + '/user'
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${tokens.idToken}`
        }
      })
      const userInfo = await res.json()
      if (process.env.NODE_ENV !== 'production') {
        console.log('useAccountManager._fetchOnlineAccountUserInfo', 'fetched user information', userInfo)
      }
      if (!isUserInfo(userInfo)) {
        throw new Error('received invalid user information')
      }
      authenticatorState.value = {
        type: 'authorized',
        publicKeyInfo,
        tokens,
        userInfo
      }
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('useAccountManager._fetchOnlineAccountUserInfo', 'failed to fetch user information', err)
      }
      lastError.value = err
    }
  }

  // changes of the authenticator state should trigger authenticator events.
  watch(
    authenticatorState,
    (state, oldState) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('userAccountManager', 'authenticator state changed', `${oldState?.type} → ${state.type}`)
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
          // updates the account info
          _updateOnlineAccountInfo(state.publicKeyInfo, state.tokens)
          // fetches the user information from the Dog's Business API
          _fetchOnlineAccountUserInfo(state.publicKeyInfo, state.tokens)
          break
        case 'authorized':
          // updates the account info
          _updateOnlineAccountInfo(state.publicKeyInfo, state.tokens, state.userInfo)
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
    if (authenticatorState.value.type !== 'authenticating') {
      return
    }
    if (authenticatorUi.value == null) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('useAccountManager', 'no authenticator UI is attached yet')
      }
      return
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log('useAccountManager', 'asking sign-in with public key info', authenticatorState.value.publicKeyInfo)
    }
    authenticatorUi.value.askSignIn(authenticatorState.value.publicKeyInfo)
  })

  const currentDog = ref<GenericDog>()
  const isLoadingDog = ref<boolean>(false)

  // NOTE: update `activeBusinessRecords` in an immutable manner
  const activeBusinessRecords = ref<GenericBusinessRecord[]>()

  // loads the dog associated with the guest account.
  // does nothing if the account has no dog friend, or if the dog friend has
  // already been loaded.
  const _loadGuestDogFriend = async (account: GuestAccountInfo) => {
    const dogKey = account.activeDogKey
    if (dogKey == null) {
      return
    }
    if (currentDog.value?.key === dogKey) {
      return
    }
    const dogDb = await dogDatabaseManager.getGuestDogDatabase(account)
    const dog = await dogDb.getDog(dogKey)
    if (dog == null) {
      throw new Error(`no dog friend with key: ${dogKey}`)
    }
    currentDog.value = dog
  }

  // loads the remembered dog of the guest account.
  watch(
    accountInfo,
    (account) => {
      if (account.type !== 'guest') {
        return
      }
      isLoadingDog.value = true
      runAndCaptureError(
        () => _loadGuestDogFriend(account),
        () => {
          isLoadingDog.value = false
        }
      )
    },
    { immediate: true }
  )

  const _loadBusinessRecordsOfGuest = async (
    accountInfo: GuestAccountInfo,
    dog: GenericDog
  ) => {
    if (!isGuestDog(dog)) {
      throw new Error('dog must be a dog friend of the guest')
    }
    const recordDb = await businessRecordDatabaseManager
      .getGuestBusinessRecordDatabase(accountInfo)
    const records = await recordDb.loadBusinessRecords(dog.key)
    // marks the records as raw to reduce the reactivity overhead
    activeBusinessRecords.value = markRaw(records)
  }

  // loads the business records associated with the current dog when the
  // current dog is updated.
  watch(
    currentDog,
    async (dog) => {
      if (accountInfo.value == null || dog == null) {
        activeBusinessRecords.value = undefined
        return
      }
      switch (accountInfo.value.type) {
        case 'guest': {
          const guestAccountInfo = accountInfo.value
          runAndCaptureError(
            () => _loadBusinessRecordsOfGuest(guestAccountInfo, dog)
          )
          break
        }
        case 'online':
          // TODO: maybe unnecessary, because business records are attached to map tiles
          console.error('not yet implemented: loading business records of online account')
          break
        case 'no-account':
          activeBusinessRecords.value = undefined
          break
        default: {
          const unreachable: never = accountInfo.value
          console.error(`unknown account type: ${unreachable}`)
        }
      }
    },
    { immediate: true }
  )

  const createGuestAccount = async () => {
    // TODO: fail if the account already exists
    accountInfo.value = {
      type: 'guest',
      mapboxAccessToken: import.meta.env.VITE_MAPBOX_GUEST_ACCESS_TOKEN
    }
  }

  // updates credentials for an online account.
  const updateCredentials = async (credentials: OnlineAccountCredentials) => {
    switch (authenticatorState.value.type) {
      case 'loading':
      case 'welcoming':
        authenticatorState.value = {
          type: 'authenticating',
          publicKeyInfo: credentials.publicKeyInfo
        }
        break
      case 'guest':
        // TODO: handle as an error
        console.warn(`useAccountManager.updateCredentials@${authenticatorState.value.type}`, 'no credentials are expected')
        break
      case 'authenticating':
        if (credentials.tokens != null) {
          authenticatorState.value = {
            type: 'authenticated',
            publicKeyInfo: credentials.publicKeyInfo,
            tokens: credentials.tokens
          }
        } else {
          // TODO: maybe switching to discoverable authentication
          console.warn(`useAccountManager.updateCredentials@{authenticatorState.value.type}`, 'Cognito tokens are expected')
        }
        break
      case 'authenticated':
      case 'authorized':
        if (credentials.tokens != null) {
          // Cognito tokens may have been refreshed
          if (!isEquivalentCognitoTokens(authenticatorState.value.tokens, credentials.tokens)) {
            authenticatorState.value = {
              type: 'authenticated',
              publicKeyInfo: authenticatorState.value.publicKeyInfo,
              tokens: credentials.tokens
            }
          } else {
            // public key info may not change in this state
            // TODO: handle as an error
            console.warn(`useAccountManager.updateCredentials@${authenticatorState.value.type}`, 'refreshed Cognito tokens are expected')
          }
        } else {
          // public key info may not change in this state
          // TODO: handle as an error
          console.warn(`useAccountManager.updateCredentials@${authenticatorState.value.type}`, 'refreshed Cognito tokens are expected')
        }
        break
      default: {
        const unreachable: never = authenticatorState.value
        throw new RangeError(`unknown authenticator state: ${unreachable}`)
      }
    }
  }

  const _registerNewDogFriendOfGuest = async (
    accountInfo: GuestAccountInfo,
    dogParams: DogParams
  ) => {
    try {
      const dogDb = await dogDatabaseManager.getGuestDogDatabase(accountInfo)
      // we have to update currentDog then accountInfo.activeDogKey
      // otherwise, the watcher of accountInfo will try to load the dog friend
      const dog = await dogDb.createDog(dogParams)
      currentDog.value = dog
      accountInfo.activeDogKey = dog.key
    } catch (err) {
      console.error('failed to register guest dog friend', err)
      throw err
    }
  }

  const registerNewDogFriend = async (dogParams: DogParams) => {
    if (accountInfo.value == null) {
      throw new Error('no account info available')
    }
    switch (accountInfo.value.type) {
      case 'guest':
        await _registerNewDogFriendOfGuest(accountInfo.value, dogParams)
        break
      case 'online':
        // TODO: register a new dog friend of the online account
        console.error('not yet implemented: registering new dog friend of online account')
        break
      case 'no-account':
        throw new Error('account must be created first')
        break
      default: {
        // exhaustive cases must not lead here
        const unreachable: never = accountInfo.value
        throw new Error(`unknown account type: ${unreachable}`)
      }
    }
  }

  const _addBusinessRecordOfGuest = async (
    accountInfo: GuestAccountInfo,
    dog: GenericDog,
    recordParams: BusinessRecordParams
  ) => {
    if (!isGuestDog(dog)) {
      throw new Error('dog must be a dog friend of the guest')
    }
    const recordDb = await businessRecordDatabaseManager
      .getGuestBusinessRecordDatabase(accountInfo)
    const record = await recordDb.createBusinessRecord({
      ...recordParams,
      dogKey: dog.key
    })
    // prepends the new record to `activeBusinessRecords`
    // avoids deep reactivity to reduce the overhead
    activeBusinessRecords.value = markRaw([
      record,
      ...(activeBusinessRecords.value ?? [])
    ])
  }

  const addBusinessRecord = async (recordParams: BusinessRecordParams) => {
    if (accountInfo.value == null) {
      throw new Error('no account info available')
    }
    if (currentDog.value == null) {
      throw new Error('no current dog available')
    }
    switch (accountInfo.value.type) {
      case 'guest':
        try {
          await _addBusinessRecordOfGuest(
            accountInfo.value,
            currentDog.value,
            recordParams
          )
        } catch (err) {
          console.error('failed to add business record of guest', err)
          throw err
        }
        break
      case 'online':
        // TODO: add a business record of the online account
        throw new Error('not yet implemented: adding business record of online account')
      case 'no-account':
        throw new Error('account must be created first')
        break
      default: {
        // exhaustive cases must not lead here
        const unreachable: never = accountInfo.value
        throw new Error(`unknown account type: ${unreachable}`)
      }
    }
  }

  // attaches a given `AuthenticatorUi` to the underlying account manager.
  //
  // the provider of the `AuthenticatorUi` should call the returned function
  // to detach the `AuthenticatorUi` when it is unmounted.
  const attachAuthenticatorUi = (newAuthenticatorUi: AuthenticatorUi) => {
    return runAndCaptureError(() => {
      if (authenticatorUi.value != null) {
        throw new Error('only one authenticator UI can be attached at a time')
      }
      if (process.env.NODE_ENV !== 'production') {
        console.log('useAccountManager', 'attaching authenticator UI')
      }
      authenticatorUi.value = newAuthenticatorUi
      // function to detach the authenticator UI
      // `detached` is to prevent multiple detachments
      let detached = false
      return () => {
        if (detached) {
          console.warn('useAccountManager', 'autheticator UI is already detached')
          return
        }
        if (process.env.NODE_ENV !== 'production') {
          console.log('useAccountManager', 'detaching authenticator UI')
        }
        authenticatorUi.value = undefined
        detached = true
      }
    })
  }

  return {
    accountInfo,
    activeBusinessRecords,
    addBusinessRecord,
    attachAuthenticatorUi,
    authenticatorState,
    createGuestAccount,
    currentDog,
    isLoadingDog,
    lastError,
    registerNewDogFriend,
    updateCredentials
  }
})

/**
 * Provider of a dog database manager.
 *
 * @remarks
 *
 * Returns a Vue plugin that you can use in a Vue app you want to provide with
 * a dog database manager.
 *
 * ```ts
 * import { createApp } from 'vue'
 * const app = createApp()
 * app.use(provideDogDatabaseManager({
 *   // dog database manager implementation
 * }))
 * ```
 */
export const dogDatabaseManagerProvider = (dogDatabaseManager: DogDatabaseManager) => {
  return {
    install(app: App) {
      app.provide(DOG_DATABASE_MANAGER_INJECTION_KEY, dogDatabaseManager)
    }
  }
}

/**
 * Provider of a business record database manager.
 *
 * @remarks
 *
 * Returns a Vue plugin that you can use in a Vue app you want to provide with
 * a business record database manager.
 *
 * ```ts
 * import { createApp } from 'vue'
 * const app = createApp()
 * app.use(provideBusinessRecordDatabaseManager({
 *   // business record database manager implementation
 * }))
 * ```
 */
export const businessRecordDatabaseManagerProvider = (businessRecordDatabaseManager: BusinessRecordDatabaseManager) => {
  return {
    install(app: App) {
      app.provide(
        BUSINESS_RECORD_DATABASE_MANAGER_INJECTION_KEY,
        businessRecordDatabaseManager
      )
    }
  }
}

// returns if given Cognito tokens are expired.
function isCognitoTokensExpired(tokens: CognitoTokens): boolean {
  const { activatedAt, expiresIn } = tokens
  return (Date.now() - activatedAt) >= (expiresIn * 1000)
}
