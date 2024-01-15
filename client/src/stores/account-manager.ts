import { defineStore } from 'pinia'
import { type App, type InjectionKey, inject, markRaw, ref, watch } from 'vue'

import type {
  AccountInfo,
  AccountManager,
  GuestAccountInfo
} from '../lib/account-manager'
import type {
  BusinessRecord,
  BusinessRecordDatabaseManager,
  BusinessRecordParams
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

  const currentDog = ref<Dog<unknown>>()

  // NOTE: update `activeBusinessRecords` in an immutable manner
  const activeBusinessRecords = ref<BusinessRecord<unknown, unknown>[]>()

  // loads the remembrered account info
  accountManager
    .loadAccountInfo()
    .then((account: AccountInfo) => accountInfo.value = account)
    .catch((err: any) => {
      console.error('failed to obtain account info', err)
      lastError.value = err
    })

  // saves the account info when it is udpated
  watch(
    accountInfo,
    async (account) => {
      if (account == null) {
        console.warn('account info should not become null')
        return
      }
      try {
        await accountManager.saveAccountInfo(account)
      } catch (err) {
        console.error('failed to save account info', err)
        lastError.value = err
      }
    },
    { deep: true }
  )

  // loads the remembered dog
  watch(accountInfo, (account) => {
    if (account == null) {
      return
    }
    switch (account.type) {
      case 'guest':
        _loadGuestDogFriend(account)
        break
      case 'no-account':
        break // does nothing
      default: {
        // exhaustive cases must not lead here
        const unreachable: never = account
        throw new Error(`unknown account type: ${unreachable}`)
      }
    }
  })

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
    try {
      const dogDb = await dogDatabaseManager.getGuestDogDatabase(account)
      const dog = await dogDb.getDog(dogKey)
      if (dog == null) {
        throw new Error(`no dog friend with key: ${dogKey}`)
      }
      currentDog.value = dog
    } catch (err) {
      console.error('failed to load guest dog friend', err)
      lastError.value = err
    }
  }

  // loads the business records associated with the current dog when the
  // current dog is updated.
  watch(currentDog, async (dog) => {
    if (accountInfo.value == null || dog == null) {
      activeBusinessRecords.value = undefined
      return
    }
    switch (accountInfo.value.type) {
      case 'guest':
        try {
          _loadBusinessRecordsOfGuest(accountInfo.value, dog)
        } catch (err) {
          console.error('failed to load business records of guest', err)
          lastError.value = err
        }
        break
      case 'no-account':
        activeBusinessRecords.value = undefined
        break
      default: {
        const unreachable: never = accountInfo.value
        console.error(`unknown account type: ${unreachable}`)
      }
    }
  })

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

  const _loadBusinessRecordsOfGuest = async (
    accountInfo: GuestAccountInfo,
    dog: Dog<unknown>
  ) => {
    if (!isGuestDog(dog)) {
      throw new Error('dog must be a dog friend of the guest')
    }
    try {
      const recordDb = await businessRecordDatabaseManager
        .getGuestBusinessRecordDatabase(accountInfo)
      const records = await recordDb.loadBusinessRecords(dog.key)
      // marks the records as raw to reduce the reactivity overhead
      activeBusinessRecords.value = markRaw(records)
    } catch (err) {
      throw err
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
    } catch (err) {
      throw err
    }
  }

  return {
    accountInfo,
    activeBusinessRecords,
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
