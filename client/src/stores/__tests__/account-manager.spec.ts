import assert from 'node:assert'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from 'vue'

import type { AccountManager } from '@/lib/account-manager'
import type {
  BusinessRecordDatabaseManager,
  BusinessRecordParams,
  BusinessRecordParamsOfDog,
  GuestBusinessRecordDatabase
} from '@/lib/business-record-database'
import type {
  DogDatabaseManager,
  DogParams,
  GuestDogDatabase
} from '@/lib/dog-database'
import {
  accountManagerProvider,
  businessRecordDatabaseManagerProvider,
  dogDatabaseManagerProvider,
  useAccountManager
} from '@/stores/account-manager'

const dummyAccountManager: AccountManager = {
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

const dummyGuestDogDatabaseManager = {
  async getGuestDogDatabase() {
    return {
      async createDog(params: DogParams) {
        return {
          ...params,
          key: 1
        }
      },
      async getDog() {
        return undefined
      }
    }
  }
}

const dummyBusinessRecordDatabaseManager = {
  async getGuestBusinessRecordDatabase() {
    return {
      async createBusinessRecord(params: BusinessRecordParamsOfDog<number>) {
        return {
          ...params,
          key: 1
        }
      }
    }
  }
}

describe('useAccountManager', () => {
  describe('without account manager provided', () => {
    beforeEach(() => {
      const app = createApp({})
      const pinia = createPinia()
      app.use(pinia)
      app.use(dogDatabaseManagerProvider(dummyGuestDogDatabaseManager))
      app.use(businessRecordDatabaseManagerProvider(dummyBusinessRecordDatabaseManager))
      setActivePinia(pinia)
    })

    it('should throw Error', () => {
      expect(() => useAccountManager()).toThrow(Error)
    })
  })

  describe('without dog database manager provided', () => {
    beforeEach(() => {
      const app = createApp({})
      const pinia = createPinia()
      app.use(pinia)
      app.use(accountManagerProvider(dummyAccountManager))
      app.use(businessRecordDatabaseManagerProvider(dummyBusinessRecordDatabaseManager))
      setActivePinia(pinia)
    })

    it('should throw Error', () => {
      expect(() => useAccountManager()).toThrow(Error)
    })
  })

  describe('without business record database manager provided', () => {
    beforeEach(() => {
      const app = createApp({})
      const pinia = createPinia()
      app.use(pinia)
      app.use(accountManagerProvider(dummyAccountManager))
      app.use(dogDatabaseManagerProvider(dummyGuestDogDatabaseManager))
      setActivePinia(pinia)
    })

    it('should throw Error', () => {
      expect(() => useAccountManager()).toThrow(Error)
    })
  })

  describe('with accountManagerProviderv, dogDatabaseManagerProvider, and businessRecordDatabaseManagerProvided', () => {
    let accountManager: AccountManager
    let guestDogDatabase: GuestDogDatabase
    let dogDatabaseManager: DogDatabaseManager
    let guestBusinessRecordDatabase: GuestBusinessRecordDatabase
    let businessRecordDatabaseManager: BusinessRecordDatabaseManager

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
        },
        async getDog() {
          return undefined
        }
      }
      vi.spyOn(guestDogDatabase, 'createDog')
      dogDatabaseManager = {
        async getGuestDogDatabase() {
          return guestDogDatabase
        }
      }
      vi.spyOn(dogDatabaseManager, 'getGuestDogDatabase')
      guestBusinessRecordDatabase = {
        async createBusinessRecord(params: BusinessRecordParamsOfDog<number>) {
          return {
            ...params,
            key: 1
          }
        }
      }
      vi.spyOn(guestBusinessRecordDatabase, 'createBusinessRecord')
      businessRecordDatabaseManager = {
        async getGuestBusinessRecordDatabase() {
          return guestBusinessRecordDatabase
        }
      }
      vi.spyOn(businessRecordDatabaseManager, 'getGuestBusinessRecordDatabase')
      const pinia = createPinia()
      app.use(pinia)
      app.use(accountManagerProvider(accountManager))
      app.use(dogDatabaseManagerProvider(dogDatabaseManager))
      app.use(businessRecordDatabaseManagerProvider(businessRecordDatabaseManager))
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

        it('should have the new dog key as accountInfo.activeDogKey', () => {
          assert(store.accountInfo?.type === 'guest')
          expect(store.accountInfo.activeDogKey).toEqual(1)
        })

        it('should call DogDatabaseManager.getGuestDogDatabase', () => {
          expect(dogDatabaseManager.getGuestDogDatabase)
            .toHaveBeenCalledWith(store.accountInfo)
        })

        it('should call GuestDogDatabase.createDog', () => {
          expect(guestDogDatabase.createDog).toHaveBeenCalledWith({
            name: 'ポチ'
          })
        })

        describe('then addBusinessRecord', () => {
          const RECORD_PARAMS: BusinessRecordParams = {
            businessType: 'poo',
            location: {
              latitude: 35.6812,
              longitude: 139.7671
            }
          }

          beforeEach(async () => {
            await store.addBusinessRecord(RECORD_PARAMS)
          })

          it('should have the business record in activeBusinessRecords', () => {
            expect(store.activeBusinessRecords).toEqual([
              {
                ...RECORD_PARAMS,
                key: 1,
                dogKey: 1
              }
            ])
          })

          it('should call BusinessRecordDatabaseManager.getGuestBusinessRecordDatabase', () => {
            expect(businessRecordDatabaseManager.getGuestBusinessRecordDatabase)
              .toHaveBeenCalledWith(store.accountInfo)
          })

          it('should call GuestBusinessRecordDatabase.createBusinessRecord', () => {
            expect(guestBusinessRecordDatabase.createBusinessRecord)
              .toHaveBeenCalledWith({
                ...RECORD_PARAMS,
                dogKey: 1
              })
          })
        })
      })
    })
  })
})
