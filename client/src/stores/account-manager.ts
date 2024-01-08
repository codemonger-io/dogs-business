import { defineStore } from 'pinia'
import { type App, type InjectionKey, inject, ref } from 'vue'

import type {
  AccountInfo,
  AccountManager,
  GuestAccountInfo
} from '../lib/account-manager'
import type {
  BusinessRecordDatabaseManager,
  BusinessRecordParams,
  BusinessType
} from '../lib/business-record-database'
import type { Dog, DogDatabaseManager, DogParams } from '../lib/dog-database'
import { isGuestDog } from '../lib/dog-database'

/** Injection key for the global account manager. */
export const ACCOUNT_MANAGER_INJECTION_KEY =
  Symbol() as InjectionKey<AccountManager>

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
 * An instance of {@link AccountManager} is supposed to be provided by the host
 * Vue application.
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
  const accountManager = inject(ACCOUNT_MANAGER_INJECTION_KEY)
  if (accountManager == null) {
    throw new Error('no account manager is provided')
  }
  const dogDatabaseManager = inject(DOG_DATABASE_MANAGER_INJECTION_KEY)
  if (dogDatabaseManager == null) {
    throw new Error('no dog database manager is provided')
  }
  const businessRecordDatabaseManager =
    inject(BUSINESS_RECORD_DATABASE_MANAGER_INJECTION_KEY)
  if (businessRecordDatabaseManager == null) {
    throw new Error('no business record database manager is provided')
  }

  const lastError = ref<any>()

  const accountInfo = ref<AccountInfo>()
  accountManager
    .getAccountInfo()
    .then((info: AccountInfo) => accountInfo.value = info)
    .catch((err: any) => {
      console.error('failed to obtain account info', err)
      lastError.value = err
    })

  const currentDog = ref<Dog<unknown>>()

  const createGuestAccount = async () => {
    // TODO: fail if the account already exists
    try {
      accountInfo.value = await accountManager.createGuestAccount()
    } catch (err) {
      lastError.value = err
      throw err
    }
  }

  const registerNewDogFriend = async (dogParams: DogParams) => {
    if (accountInfo.value == null) {
      throw new Error('no account info available')
    }
    switch (accountInfo.value.type) {
      case 'guest':
        currentDog.value =
          await _registerNewDogFriendOfGuest(accountInfo.value, dogParams)
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

  const _registerNewDogFriendOfGuest = async (
    accountInfo: GuestAccountInfo,
    dogParams: DogParams
  ) => {
    try {
      const dogDb = await dogDatabaseManager.getGuestDogDatabase(accountInfo)
      return await dogDb.createDog(dogParams)
    } catch (err) {
      console.error('failed to register guest dog friend', err)
      throw err
    }
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
        await _addBusinessRecordOfGuest(
          accountInfo.value,
          currentDog.value,
          recordParams
        )
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
    dog: Dog<unknown>,
    recordParams: BusinessRecordParams
  ) => {
    if (!isGuestDog(dog)) {
      throw new Error('dog must be a dog friend of the guest')
    }
    try {
      const recordDb = await businessRecordDatabaseManager
        .getGuestBusinessRecordDatabase(accountInfo)
      await recordDb.createBusinessRecord({
        ...recordParams,
        dogKey: dog.key
      })
      // TODO: update business record map layer source
    } catch (err) {
      console.error('failed to add business record of guest', err)
      throw err
    }
  }

  return {
    accountInfo,
    addBusinessRecord,
    createGuestAccount,
    currentDog,
    lastError,
    registerNewDogFriend
  }
})

/**
 * Provider of an account manager.
 *
 * @remarks
 *
 * Returns a Vue plugin that you can use in a Vue app you want to provide with
 * an account manager.
 *
 * ```ts
 * import { createApp } from 'vue'
 * const app = createApp()
 * app.use(provideAccountManager({
 *   // account manager implementation
 * }))
 * ```
 */
export const accountManagerProvider = (accountManager: AccountManager) => {
  return {
    install(app: App) {
      app.provide(ACCOUNT_MANAGER_INJECTION_KEY, accountManager)
    }
  }
}

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
