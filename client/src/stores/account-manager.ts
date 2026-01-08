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
import { RESOURCE_API_INJECTION_KEY } from '../providers/resource-api'
import type {
  GuestAccountInfo,
  OnlineAccountInfo,
  UserInfo
} from '../types/account-info'
import { isAccountInfo, isUserInfo } from '../types/account-info'
import {
  isHumanFriendInvitationAcceptanceResult,
  isHumanFriendInvitationStatus,
  isNewHumanFriendInvitation
} from '../types/human-friend-invitation'
import { isCognitoTokensExpiring } from '../utils/passquito'
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
 *   or if no business record database manager is provided,
 *   or if no Resource API is provided.
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
  const resourceApi = inject(RESOURCE_API_INJECTION_KEY)
  if (resourceApi == null) {
    throw new Error('no Resource API is provided')
  }

  // authenticator state
  const authenticatorState = useAuthenticatorState()

  // remembers the last error.
  const lastError = ref<any>()

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
    userInfo: UserInfo
  ) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('useAccountManager._updateOnlineAccountCredentials', 'updating credentials', publicKeyInfo, tokens, userInfo)
    }
    if (accountInfo.value.type === 'online') {
      // updates the existing online account info.
      // if the user ID (`userHandle`) is the same, retains the non-credential information
      // otherwise, simply replaces the account info
      if (accountInfo.value.publicKeyInfo.userHandle === publicKeyInfo.userHandle) {
        const {
          /* eslint-disable @typescript-eslint/no-unused-vars */
          publicKeyInfo: _1,
          tokens: _2,
          userInfo: _3,
          /* eslint-enable @typescript-eslint/no-unused-vars */
          ...rest
        } = accountInfo.value
        // TODO: avoid updating accounInfo if nothing changes
        accountInfo.value = {
          ...rest,
          publicKeyInfo,
          tokens,
          userInfo
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

  // when `authenticatorState` becomes "authenticated",
  // obtains the user info associated with the given ID token, and then
  // updates and saves `accountInfo`
  watch(
    () => authenticatorState.state,
    async (state) => {
      if (state.type === 'authenticated') {
        if (isCognitoTokensExpiring(state.tokens)) {
          await authenticatorState.refreshCognitoTokens()
          return
        }
        if (process.env.NODE_ENV !== 'production') {
          console.log('useAccountManager.watchAuthenticatorState', 'fetching user info associated with the ID token')
        }
        const res = await resourceApi.getCurrentUserInfo(state.tokens.idToken)
        if (res.ok) {
          const userInfo = await res.parse()
          _updateOnlineAccountInfo(state.publicKeyInfo, state.tokens, userInfo)
        } else {
          if (res.status === 401) {
            authenticatorState.triggerReAuthentication()
          }
          const message = await res.text()
          lastError.value = new Error(`failed to fetch user info: ${res.status} ${message}`)
        }
      } else {
        // does nothing
      }
    },
    { immediate: true }
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
    const dogId = account.userInfo.activeDogId
    if (dogId == null) {
      return
    }
    if (currentDog.value?.dogId === dogId) {
      return
    }
    const dogDb = await dogDatabaseManager.getOnlineDogDatabase({
      requestIdToken() {
        return _requestIdToken()
      },
      handleUnauthorized() {
        authenticatorState.triggerReAuthentication()
      }
    })
    const dog = await dogDb.getDog(dogId)
    if (dog == null) {
      throw new Error(`no dog friend with ID: ${dogId}`)
    }
    currentDog.value = dog
  }

  // loads the remembered dog friend whenever `accountInfo` is updated.
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
              throw new Error(`unnacceptable account type: ${unreachable}`)
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

  const _requestIdToken = async (): Promise<string> => {
    if (accountInfo.value.type !== 'online') {
      throw new Error('current account is not an online account')
    }
    const { tokens } = accountInfo.value
    if (tokens == null) {
      throw new Error('no Cognito tokens available')
    }
    if (!isCognitoTokensExpiring(tokens)) {
      return tokens.idToken
    } else {
      const tokens = await authenticatorState.refreshCognitoTokens()
      return tokens.idToken
    }
  }

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

  const _loadBusinessRecordsOfOnlineAccount = async (dog: GenericDog) => {
    if (!isOnlineDog(dog)) {
      throw new Error('dog must be a dog friend of an online account')
    }
    const recordDb = await businessRecordDatabaseManager
      .getOnlineBusinessRecordDatabase({
        requestIdToken() {
          return _requestIdToken()
        },
        handleUnauthorized() {
          authenticatorState.triggerReAuthentication()
        }
      })
    const records = await recordDb.loadBusinessRecords(dog.dogId)
    // marks the records as raw to reduce the reactivity overhead
    activeBusinessRecords.value = markRaw(records)
  }

  // loads the business records associated with the current dog when the
  // current dog is updated.
  watch(
    currentDog,
    async (dog) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('useAccountManager', 'currentDog updated', dog?.dogId)
      }
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
          runAndCaptureErrorAsync(
            () => _loadBusinessRecordsOfOnlineAccount(dog)
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
    accountInfo.value = { type: 'guest' }
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
    dogParams: DogParams
  ) => {
    try {
      const dogDb = await dogDatabaseManager.getOnlineDogDatabase({
        requestIdToken() {
          return _requestIdToken()
        },
        handleUnauthorized() {
          authenticatorState.triggerReAuthentication()
        }
      })
      const dog = await dogDb.createDog(dogParams)
      // makes sure that the account info is still online after the API call
      if (accountInfo.value.type === 'online') {
        // we have to update currentDog then accountInfo.userInfo.activeDogId
        // otherwise, the watcher of accountInfo will try to load the dog friend
        currentDog.value = dog
        accountInfo.value = {
          ...accountInfo.value,
          userInfo: {
            ...accountInfo.value.userInfo,
            activeDogId: dog.dogId
          }
        }
        // TODO: save the activeDogId to the server
      }
    } catch (err) {
      console.error('useAccountManager._registerNewDogFriendOfOnlineAccount', err)
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
        await _registerNewDogFriendOfOnlineAccount(dogParams)
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

  // the user must become a friend of the dog first.
  const _setActiveDogFriendOfOnlineAccount = async (dogId: string) => {
    const url = `${import.meta.env.VITE_DOGS_BUSINESS_RESOURCE_API_BASE_URL}/user`
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: await _requestIdToken()
      },
      body: JSON.stringify({
        activeDogId: { 'set': dogId }
      })
    })
    if (res.ok) {
      const userInfo = await res.json()
      if (!isUserInfo(userInfo) || userInfo.activeDogId !== dogId) {
        throw new Error('invalid user info response from server')
      }
      // makes sure that the account info is still online after the API call
      if (accountInfo.value.type !== 'online') {
        throw new Error('current account is not an online account')
      }
      // updating account info will trigger the watcher to load the dog friend
      accountInfo.value = {
        ...accountInfo.value,
        userInfo: {
          ...accountInfo.value.userInfo,
          activeDogId: dogId,
          consistencyToken: userInfo.consistencyToken
        }
      }
    } else {
      if (res.status === 401) {
        authenticatorState.triggerReAuthentication()
      }
      const message = await res.text()
      throw new Error(`failed to set active dog friend: ${res.status} ${message}`)
    }
  }

  const setActiveDogFriend = (dogId: number | string) => {
    switch (accountInfo.value.type) {
      case 'guest':
        throw new Error('not yet implemented for guest account')
      case 'online':
        if (accountInfo.value.userInfo.activeDogId === dogId) {
          return
        }
        if (typeof dogId !== 'string') {
          throw new Error('dog ID must be a string for online account')
        }
        return _setActiveDogFriendOfOnlineAccount(dogId)
      case 'no-account':
        throw new Error('no account info available')
      default: {
        const neverAccount: never = accountInfo.value
        throw new Error(`unknown account type: ${neverAccount}`)
      }
    }
  }

  const _getDogFriendOfOnlineAccount = async (dogId: string) => {
    const url = `${import.meta.env.VITE_DOGS_BUSINESS_RESOURCE_API_BASE_URL}/dog/${dogId}`
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: await _requestIdToken()
      }
    })
    if (res.ok) {
      const dog = await res.json()
      if (!isOnlineDog(dog) || dog.dogId !== dogId) {
        throw new Error('invalid dog response from server')
      }
      return dog
    } else {
      if (res.status === 401) {
        authenticatorState.triggerReAuthentication()
      }
      const message = await res.text()
      throw new Error(`failed to fetch dog: ${res.status} ${message}`)
    }
  }

  const getDogFriend = async (dogId: number | string) => {
    switch (accountInfo.value.type) {
      case 'guest':
        throw new Error('not yet implemented for guest account')
      case 'online':
        if (typeof dogId !== 'string') {
          throw new Error('dog ID must be a string for online account')
        }
        return _getDogFriendOfOnlineAccount(dogId)
      case 'no-account':
        throw new Error('no account info available')
      default: {
        const neverAccount: never = accountInfo.value
        throw new Error(`unknown account type: ${neverAccount}`)
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
    dog: GenericDog,
    recordParams: BusinessRecordParams
  ) => {
    if (!isOnlineDog(dog)) {
      throw new Error('dog must be a dog friend of an online account')
    }
    const recordDb = await businessRecordDatabaseManager
      .getOnlineBusinessRecordDatabase({
        requestIdToken() {
          return _requestIdToken()
        },
        handleUnauthorized() {
          authenticatorState.triggerReAuthentication()
        }
      })
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
          await _addBusinessRecordOfGuest(account, dog, recordParams)
        } catch (err) {
          console.error('failed to add business record of guest', err)
          throw err
        }
        break
      case 'online':
        await runAndCaptureErrorAsync(
          () => _addBusinessRecordOfOnlineAccount(dog, recordParams)
        )
        break
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

  const inviteNewHumanFriendForCurrentDog = async () => {
    const account = accountInfo.value
    if (account.type !== 'online') {
      throw new Error('only online account can invite friends')
    }
    const dog = currentDog.value
    if (dog == null) {
      throw new Error('no current dog available')
    }
    // TODO: account must be a guardian of the dog
    const url = `${import.meta.env.VITE_DOGS_BUSINESS_RESOURCE_API_BASE_URL}/dog/${dog.dogId}/invitation`
    const idToken = await _requestIdToken()
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: idToken
      },
      body: JSON.stringify({})
    })
    if (res.ok) {
      const invitation = await res.json()
      if (!isNewHumanFriendInvitation(invitation)) {
        throw new Error('invalid invitation response from server')
      }
      return invitation
    } else {
      if (res.status === 401) {
        authenticatorState.triggerReAuthentication()
      }
      const message = await res.text()
      throw new Error(`failed to invite new human friend: ${res.status} ${message}`)
    }
  }

  // TODO: this action may be executed by arbitrary online users who have
  // somehow obtained an invitation ID. can it be abused?
  const getHumanFriendInvitationStatus = async (invitationId: string) => {
    const account = accountInfo.value
    if (account.type !== 'online') {
      throw new Error('only online account can get invitations')
    }
    const url = `${import.meta.env.VITE_DOGS_BUSINESS_RESOURCE_API_BASE_URL}/invitation/${invitationId}`
    const idToken = await _requestIdToken()
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: idToken
      }
    })
    if (res.ok) {
      // TODO: include if the user is already a friend of the dog
      const invitation = await res.json()
      if (!isHumanFriendInvitationStatus(invitation)) {
        throw new Error('invalid invitation response from server')
      }
      return invitation
    } else {
      if (res.status === 401) {
        authenticatorState.triggerReAuthentication()
      }
      const message = await res.text()
      throw new Error(`failed to get invitation: ${res.status} ${message}`)
    }
  }

  const acceptHumanFriendInvitation = async (invitationId: string) => {
    const account = accountInfo.value
    if (account.type !== 'online') {
      throw new Error('only online account can accept invitations')
    }
    const url = `${import.meta.env.VITE_DOGS_BUSINESS_RESOURCE_API_BASE_URL}/invitation/${invitationId}`
    const idToken = await _requestIdToken()
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: idToken
      },
      body: JSON.stringify({})
    })
    if (res.ok) {
      const result = await res.json()
      if (!isHumanFriendInvitationAcceptanceResult(result)) {
        throw new Error('invalid invitation acceptance response from server')
      }
      return result
    } else {
      if (res.status === 401) {
        authenticatorState.triggerReAuthentication()
      }
      const message = await res.text()
      throw new Error(`failed to accept invitation: ${res.status} ${message}`)
    }
  }

  return {
    acceptHumanFriendInvitation,
    accountInfo,
    activeBusinessRecords,
    addBusinessRecord,
    createGuestAccount,
    currentDog,
    getDogFriend,
    getHumanFriendInvitationStatus,
    inviteNewHumanFriendForCurrentDog,
    isLoadingDog,
    lastError,
    registerNewDogFriend,
    setActiveDogFriend
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
