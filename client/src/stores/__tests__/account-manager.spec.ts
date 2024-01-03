import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { type App, createApp } from 'vue'

import type { AccountManager } from '@/lib/account-manager'
import type {
  Dog,
  DogDatabaseManager,
  DogParams,
  GuestDogDatabase
} from '@/lib/dog-database'
import {
  accountManagerProvider,
  dogDatabaseManagerProvider,
  useAccountManager
} from '@/stores/account-manager'

describe('useAccountManager', () => {
  describe('without account manager provided', () => {
    beforeEach(() => {
      const app = createApp({})
      const dogDatabaseManager = {
        async getGuestDogDatabase() {
          return {
            async createDog(params: DogParams) {
              return {
                ...params,
                key: 1
              }
            }
          }
        }
      }
      const pinia = createPinia()
      app.use(pinia)
      app.use(dogDatabaseManagerProvider(dogDatabaseManager))
      setActivePinia(pinia)
    })

    it('should throw Error', () => {
      expect(() => useAccountManager()).toThrow(Error)
    })
  })

  describe('without dog database manager provided', () => {
    beforeEach(() => {
      const app = createApp({})
      const accountManager: AccountManager = {
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
      const pinia = createPinia()
      app.use(pinia)
      app.use(accountManagerProvider(accountManager))
      setActivePinia(pinia)
    })

    it('should throw Error', () => {
      expect(() => useAccountManager()).toThrow(Error)
    })
  })

  describe('with accountManagerProviderv and dogDatabaseManagerProvider', () => {
    let accountManager: AccountManager
    let guestDogDatabase: GuestDogDatabase
    let dogDatabaseManager: DogDatabaseManager

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
      guestDogDatabase = {
        async createDog(params: DogParams) {
          return {
            ...params,
            key: 1
          }
        }
      }
      vi.spyOn(guestDogDatabase, 'createDog')
      dogDatabaseManager = {
        async getGuestDogDatabase() {
          return guestDogDatabase
        }
      }
      vi.spyOn(dogDatabaseManager, 'getGuestDogDatabase')
      const pinia = createPinia()
      app.use(pinia)
      app.use(accountManagerProvider(accountManager))
      app.use(dogDatabaseManagerProvider(dogDatabaseManager))
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

      describe('then registerNewDogFriend', () => {
        beforeEach(async () => {
          await store.registerNewDogFriend({ name: 'ポチ' })
        })

        it('should have a new dog as currentDog', () => {
          expect(store.currentDog).toEqual({
            key: 1,
            name: 'ポチ'
          })
        })

        it('should call DogDatabaseManager.getGuestDogDatabase', () => {
          expect(dogDatabaseManager.getGuestDogDatabase).toHaveBeenCalled()
        })

        it('should call GuestDogDatabase.createDog', () => {
          expect(guestDogDatabase.createDog).toHaveBeenCalled()
        })
      })
    })
  })
})
