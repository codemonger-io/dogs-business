import { defineStore } from 'pinia'
import { type App, type InjectionKey, inject, ref } from 'vue'

import type { AccountInfo, AccountManager } from '../lib/account-manager'

/** Injection key for the global account manager. */
export const ACCOUNT_MANAGER_INJECTION_KEY =
  Symbol() as InjectionKey<AccountManager>

/**
 * Uses the provided account manager.
 *
 * @remarks
 *
 * An instance of {@link AccountManager} is supposed to be provided by the host
 * Vue application.
 *
 * @throws Error
 *
 *   If no account manager is provided.
 */
export const useAccountManager = defineStore('accountManager', () => {
  const accountManager = inject(ACCOUNT_MANAGER_INJECTION_KEY)
  if (accountManager == null) {
    throw new Error('no account manager is provided')
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

  const createGuestAccount = async () => {
    try {
      accountInfo.value = await accountManager.createGuestAccount()
    } catch (err) {
      lastError.value = err
      throw err
    }
  }

  return { accountInfo, createGuestAccount, lastError }
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
