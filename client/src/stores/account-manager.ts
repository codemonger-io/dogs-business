// TODO: this is likely a store for an active account.

import { defineStore } from 'pinia'
import {
  type App,
  type InjectionKey,
  inject,
  markRaw,
  ref,
  watch
} from 'vue'
import type { CognitoTokens, PublicKeyInfo } from '@codemonger-io/passquito-client-js'
import { useStorage } from '@vueuse/core'

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
import { isGuestDog, isOnlineDog } from '../lib/dog-database'
import { makeValidatingSerializer } from '../lib/storage-serializer'
import type {
  GuestAccountInfo,
  OnlineAccountInfo,
  UserInfo
} from '../types/account-info'
import { isAccountInfo } from '../types/account-info'
import {
  isAuthenticatorState,
  isEquivalentCognitoTokens
} from '../types/authenticator-state'
import { useAuthenticatorState } from './authenticator-state'

/** Injection key for the dog database manager. */
export const DOG_DATABASE_MANAGER_INJECTION_KEY =
  Symbol() as InjectionKey<DogDatabaseManager>

/** Injection key for the business record database manager. */
export const BUSINESS_RECORD_DATABASE_MANAGER_INJECTION_KEY =
  Symbol() as InjectionKey<BusinessRecordDatabaseManager>

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
 * It calls `useAuthenticatorState` to access the global authenticator state.
 *
 * @throws Error
 *
 *   If no dog database manager is provided,
 *   or if no business record database manager is provided.
 */
export const useAccountManager = defineStore('account-manager', () => {
  const dogDatabaseManager = inject(DOG_DATABASE_MANAGER_INJECTION_KEY)
  if (dogDatabaseManager == null) {
    throw new Error('no dog database manager is provided')
  }
  const businessRecordDatabaseManager =
    inject(BUSINESS_RECORD_DATABASE_MANAGER_INJECTION_KEY)
  if (businessRecordDatabaseManager == null) {
    throw new Error('no business record database manager is provided')
  }

  // authenticator state
  const authenticatorState = useAuthenticatorState()

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

  // runs a given async function and captures any error.
  const runAndCaptureErrorAsync = async <T>(f: () => Promise<T>, finally_?: () => void) => {
    try {
      return await f()
    } catch (err) {
      console.error('useAccountManager', 'captured error', err)
      lastError.value = err
      throw err
    } finally {
      finally_?.()
    }
  }

  // account info is stored in the local storage.
  // NOTE: update `accountInfo` in an immutable manner; i.e., do not partially update it
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

  // syncs `authenticatorState` whenever `accountInfo` is updated.
  watch(
    accountInfo,
    (account, oldAccount) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('useAccountManager', 'accountInfo updated', `${oldAccount?.type} → ${account.type}`)
      }
      authenticatorState.syncStateWithAccountInfo(account)
    },
    { immediate: true }
  )

  // updates the information on the online account.
  const _updateOnlineAccountInfo = (
    publicKeyInfo: PublicKeyInfo,
    tokens: CognitoTokens,
    userInfo?: UserInfo
  ) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('useAccountManager._updateOnlineAccountCredentials', 'updating credentials', publicKeyInfo, tokens, userInfo)
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

  // updates and saves `accountInfo` whenever `authenticatorState` is updated.
  watch(
    () => authenticatorState.state,
    (state) => {
      if (state.type === 'authenticated') {
        _updateOnlineAccountInfo(state.publicKeyInfo, state.tokens)
      } else if (state.type === 'authorized') {
        _updateOnlineAccountInfo(state.publicKeyInfo, state.tokens, state.userInfo)
      } else {
        // does nothing
      }
    }
  )

  const currentDog = ref<GenericDog>()
  const isLoadingDog = ref<boolean>(false)

  // NOTE: update `activeBusinessRecords` in an immutable manner
  const activeBusinessRecords = ref<GenericBusinessRecord[]>()

  // loads the dog associated with the guest account.
  // does nothing if the account has no dog friend, or if the dog friend has
  // already been loaded.
  const _loadGuestDogFriend = async (account: GuestAccountInfo) => {
    const dogId = account.activeDogId
    if (dogId == null) {
      return
    }
    if (currentDog.value?.dogId === dogId) {
      return
    }
    const dogDb = await dogDatabaseManager.getGuestDogDatabase(account)
    const dog = await dogDb.getDog(dogId)
    if (dog == null) {
      throw new Error(`no dog friend with ID: ${dogId}`)
    }
    currentDog.value = dog
  }

  // loads the dog associated with the online account.
  // does nothing if the account has no dog friend, or if the dog friend has
  // already been loaded.
  const _loadOnlineDogFriend = async (account: OnlineAccountInfo) => {
    const dogId = account.activeDogId
    if (dogId == null) {
      return
    }
    if (currentDog.value?.dogId === dogId) {
      return
    }
    const dogDb = await dogDatabaseManager.getOnlineDogDatabase(account)
    const dog = await dogDb.getDog(dogId)
    if (dog == null) {
      throw new Error(`no dog friend with ID: ${dogId}`)
    }
    currentDog.value = dog
  }

  // loads the remembered dog of the guest account.
  watch(
    accountInfo,
    (account) => {
      if (account.type !== 'guest' && account.type !== 'online') {
        return
      }
      isLoadingDog.value = true
      runAndCaptureErrorAsync(
        () => {
          switch (account.type) {
            case 'guest':
              return _loadGuestDogFriend(account)
            case 'online':
              return _loadOnlineDogFriend(account)
            default: {
              const unreachable: never = account
              throw new Error(`unnacceptable account type: ${account}`)
            }
          }
        },
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
    const records = await recordDb.loadBusinessRecords(dog.dogId)
    // marks the records as raw to reduce the reactivity overhead
    activeBusinessRecords.value = markRaw(records)
  }

  const _loadBusinessRecordsOfOnlineAccount = async (
    accountInfo: OnlineAccountInfo,
    dog: GenericDog
  ) => {
    if (!isOnlineDog(dog)) {
      throw new Error('dog must be a dog friend of an online account')
    }
    const recordDb = await businessRecordDatabaseManager
      .getOnlineBusinessRecordDatabase(accountInfo)
    const records = await recordDb.loadBusinessRecords(dog.dogId)
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
          runAndCaptureErrorAsync(
            () => _loadBusinessRecordsOfGuest(guestAccountInfo, dog)
          )
          break
        }
        case 'online': {
          const onlineAccountInfo = accountInfo.value
          runAndCaptureErrorAsync(
            () => _loadBusinessRecordsOfOnlineAccount(onlineAccountInfo, dog)
          )
          break
        }
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

  const _registerNewDogFriendOfGuest = async (
    guest: GuestAccountInfo,
    dogParams: DogParams
  ) => {
    try {
      const dogDb = await dogDatabaseManager.getGuestDogDatabase(guest)
      // we have to update currentDog then accountInfo.activeDogId
      // otherwise, the watcher of accountInfo will try to load the dog friend
      const dog = await dogDb.createDog(dogParams)
      currentDog.value = dog
      accountInfo.value = {
        ...guest,
        activeDogId: dog.dogId
      }
    } catch (err) {
      console.error('failed to register guest dog friend', err)
      throw err
    }
  }

  const _registerNewDogFriendOfOnlineAccount = async (
    account: OnlineAccountInfo,
    dogParams: DogParams
  ) => {
    try {
      const dogDb = await dogDatabaseManager.getOnlineDogDatabase(account)
      const dog = await dogDb.createDog(dogParams)
      // we have to update currentDog then accountInfo.activeDogId
      // otherwise, the watcher of accountInfo will try to load the dog friend
      currentDog.value = dog
      accountInfo.value = {
        ...account,
        activeDogId: dog.dogId
      }
    } catch (err) {
      console.error('failed to register online dog friend', err)
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
        await _registerNewDogFriendOfOnlineAccount(accountInfo.value, dogParams)
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
      dogId: dog.dogId
    })
    // prepends the new record to `activeBusinessRecords`
    // avoids deep reactivity to reduce the overhead
    activeBusinessRecords.value = markRaw([
      record,
      ...(activeBusinessRecords.value ?? [])
    ])
  }

  const _addBusinessRecordOfOnlineAccount = async (
    accountInfo: OnlineAccountInfo,
    dog: GenericDog,
    recordParams: BusinessRecordParams
  ) => {
    if (!isOnlineDog(dog)) {
      throw new Error('dog must be a dog friend of an online account')
    }
    const recordDb = await businessRecordDatabaseManager
      .getOnlineBusinessRecordDatabase(accountInfo)
    const record = await recordDb.createBusinessRecord({
      ...recordParams,
      dogId: dog.dogId
    })
    // prepends the new record to `activeBusinessRecords`
    // avoids deep reactivity to reduce the overhead
    activeBusinessRecords.value = markRaw([
      record,
      ...(activeBusinessRecords.value ?? [])
    ])
  }

  const addBusinessRecord = async (recordParams: BusinessRecordParams) => {
    const account = accountInfo.value
    const dog = currentDog.value
    if (account == null) {
      throw new Error('no account info available')
    }
    if (dog == null) {
      throw new Error('no current dog available')
    }
    switch (account.type) {
      case 'guest':
        try {
          await _addBusinessRecordOfGuest(
            account,
            dog,
            recordParams
          )
        } catch (err) {
          console.error('failed to add business record of guest', err)
          throw err
        }
        break
      case 'online':
        await runAndCaptureErrorAsync(
          () => _addBusinessRecordOfOnlineAccount(
            account,
            dog,
            recordParams
          )
        )
      case 'no-account':
        throw new Error('account must be created first')
        break
      default: {
        // exhaustive cases must not lead here
        const unreachable: never = account
        throw new Error(`unknown account type: ${unreachable}`)
      }
    }
  }

  return {
    accountInfo,
    activeBusinessRecords,
    addBusinessRecord,
    createGuestAccount,
    currentDog,
    isLoadingDog,
    lastError,
    registerNewDogFriend
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
