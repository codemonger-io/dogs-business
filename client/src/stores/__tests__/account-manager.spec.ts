import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { type App, createApp } from 'vue'

import type { AccountManager } from '@/lib/account-manager'
import {
  accountManagerProvider,
  useAccountManager,
} from '@/stores/account-manager'

describe('useAccountManager', () => {
  describe('without account manager provided', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
    })

    it('should throw Error', () => {
      expect(() => useAccountManager()).toThrow(Error)
    })
  })

  describe('with accountManagerProvider', () => {
    let accountManager: AccountManager

    beforeEach(() => {
      const app = createApp({})
      accountManager = {
        async getAccountInfo() {
          return { type: 'no-account' }
        },
        async createGuestAccount() {
          return {
            type: 'guest',
            mapboxAccessToken: 'dummy token'
          }
        }
      }
      vi.spyOn(accountManager, 'getAccountInfo')
      vi.spyOn(accountManager, 'createGuestAccount')
      const pinia = createPinia()
      app.use(pinia)
      app.use(accountManagerProvider(accountManager))
      setActivePinia(pinia)
    })

    it('should call AccountManager.getAccountInfo', () => {
      useAccountManager()
      expect(accountManager.getAccountInfo).toHaveBeenCalled()
    })

    it('should have accountInfo "no-account"', async () => {
      const store = useAccountManager()
      // waits for getAccountInfo to make sure `accountInfo` is resolved
      await accountManager.getAccountInfo()
      expect(store.accountInfo).toEqual({ type: 'no-account' })
    })

    it('should have lastError undefined', async () => {
      const store = useAccountManager()
      // waits for getAccountInfo to make sure `lastError` is updated
      await accountManager.getAccountInfo()
      expect(store.lastError).toBeUndefined()
    })

    describe('then createGuestAccount', () => {
      let store: ReturnType<typeof useAccountManager>

      beforeEach(async () => {
        store = useAccountManager()
        await store.createGuestAccount()
      })

      it('should call AccountManager.createGuestAccount', () => {
        expect(accountManager.createGuestAccount).toHaveBeenCalled()
      })

      it('should have accountInfo "guest"', () => {
        expect(store.accountInfo).toEqual({
          type: 'guest',
          mapboxAccessToken: 'dummy token'
        })
      })
    })
  })
})
