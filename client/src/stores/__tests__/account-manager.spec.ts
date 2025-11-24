import assert from 'node:assert'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, nextTick } from 'vue'

import type {
  BusinessRecord,
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
import { ResourceApiProvider } from '@/providers/resource-api'
import {
  businessRecordDatabaseManagerProvider,
  dogDatabaseManagerProvider,
  useAccountManager
} from '@/stores/account-manager'
import type { ResourceApi } from '@/types/resource-api'

// key used in `localStorage` to store the account info.
const ACCOUNT_INFO_LOCAL_STORAGE_KEY = 'dogs-business.account'

const dummyResourceApi: ResourceApi = {
  getCurrentUserInfo: vi.fn()
}

const dummyGuestDogDatabaseManager = {
  async getGuestDogDatabase() {
    return {
      async createDog(params: DogParams) {
        return {
          ...params,
          dogId: 1
        }
      },
      async getDog() {
        return undefined
      }
    }
  },
  getOnlineDogDatabase: vi.fn()
}

const dummyBusinessRecordDatabaseManager = {
  async getGuestBusinessRecordDatabase() {
    return {
      async createBusinessRecord(params: BusinessRecordParamsOfDog<number>) {
        return {
          ...params,
          recordId: 1
        }
      },
      async loadBusinessRecords() {
        return []
      }
    }
  },
  getOnlineBusinessRecordDatabase: vi.fn()
}

describe('useAccountManager', () => {
  describe('without Resource API provided', () => {
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
      app.use(new ResourceApiProvider(dummyResourceApi))
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
      app.use(new ResourceApiProvider(dummyResourceApi))
      app.use(dogDatabaseManagerProvider(dummyGuestDogDatabaseManager))
      setActivePinia(pinia)
    })

    it('should throw Error', () => {
      expect(() => useAccountManager()).toThrow(Error)
    })
  })

  describe('with all the necessary providers', () => {
    let resourceApi: ResourceApi
    let guestDogDatabase: GuestDogDatabase
    let dogDatabaseManager: DogDatabaseManager
    let guestBusinessRecordDatabase: GuestBusinessRecordDatabase
    let businessRecordDatabaseManager: BusinessRecordDatabaseManager

    beforeEach(() => {
      const app = createApp({})
      resourceApi = {
        getCurrentUserInfo: vi.fn()
      }
      guestDogDatabase = {
        async createDog(params: DogParams) {
          return {
            ...params,
            dogId: 1
          }
        },
        async getDog() {
          return undefined
        }
      }
      vi.spyOn(guestDogDatabase, 'createDog')
      vi.spyOn(guestDogDatabase, 'getDog')
      dogDatabaseManager = {
        async getGuestDogDatabase() {
          return guestDogDatabase
        },
        getOnlineDogDatabase: vi.fn()
      }
      vi.spyOn(dogDatabaseManager, 'getGuestDogDatabase')
      guestBusinessRecordDatabase = {
        async createBusinessRecord(params: BusinessRecordParamsOfDog<number>) {
          return {
            ...params,
            recordId: 1
          }
        },
        async loadBusinessRecords() {
          return []
        }
      }
      vi.spyOn(guestBusinessRecordDatabase, 'createBusinessRecord')
      vi.spyOn(guestBusinessRecordDatabase, 'loadBusinessRecords')
      businessRecordDatabaseManager = {
        async getGuestBusinessRecordDatabase() {
          return guestBusinessRecordDatabase
        },
        getOnlineBusinessRecordDatabase: vi.fn()
      }
      vi.spyOn(businessRecordDatabaseManager, 'getGuestBusinessRecordDatabase')
      const pinia = createPinia()
      app.use(pinia)
      app.use(new ResourceApiProvider(resourceApi))
      app.use(dogDatabaseManagerProvider(dogDatabaseManager))
      app.use(businessRecordDatabaseManagerProvider(businessRecordDatabaseManager))
      setActivePinia(pinia)
    })

    describe('with empty localStorage', () => {
      let accountManager: ReturnType<typeof useAccountManager>

      beforeEach(() => {
        accountManager = useAccountManager()
      })

      afterEach(() => {
        localStorage.clear()
      })

      it('should have "no-account"', () => {
        expect(accountManager.accountInfo).toEqual({ type: 'no-account' })
      })

      it('should not persist account info to localStorage', () => {
        expect(localStorage.getItem(ACCOUNT_INFO_LOCAL_STORAGE_KEY)).toBeNull()
      })

      it('should have no current dog', () => {
        expect(accountManager.currentDog).toBeUndefined()
      })

      it('should have no active business records', () => {
        expect(accountManager.activeBusinessRecords).toBeUndefined()
      })
    })

    describe('with localStorage containing "no-account" account type', () => {
      let accountManager: ReturnType<typeof useAccountManager>

      beforeEach(() => {
        localStorage.setItem(
          ACCOUNT_INFO_LOCAL_STORAGE_KEY,
          JSON.stringify({ type: 'no-account' })
        )
        accountManager = useAccountManager()
      })

      afterEach(() => {
        localStorage.clear()
      })

      it('should have "no-account"', () => {
        expect(accountManager.accountInfo).toEqual({ type: 'no-account' })
      })

      it('should have no current dog', () => {
        expect(accountManager.currentDog).toBeUndefined()
      })

      it('should have no active business records', () => {
        expect(accountManager.activeBusinessRecords).toBeUndefined()
      })

      it('should fail to register a new guest dog friend', async () => {
        await expect(accountManager.registerNewDogFriend({ name: 'ポチ' }))
          .rejects.toThrow()
      })

      it('should fail to add a business record', async () => {
        await expect(accountManager.addBusinessRecord({
          businessType: 'pee',
          location: {
            latitude: 35.6812,
            longitude: 139.7671
          },
          timestamp: 1527001200
        })).rejects.toThrow()
      })

      describe('after createGuestAccount', () => {
        beforeEach(async () => {
          await accountManager.createGuestAccount()
        })

        it('should have "guest" account without dog', () => {
          const expectedAccountInfo = {
            type: 'guest',
            mapboxAccessToken: expect.any(String)
          }

          expect(accountManager.accountInfo).toEqual(expectedAccountInfo)

          const storedAccountInfo = JSON.parse(localStorage.getItem(ACCOUNT_INFO_LOCAL_STORAGE_KEY)!)
          expect(storedAccountInfo).toEqual(expectedAccountInfo)
        })

        it('should have no current dog', () => {
          expect(accountManager.currentDog).toBeUndefined()
        })

        it('should have no active business records', () => {
          expect(accountManager.activeBusinessRecords).toBeUndefined()
        })
      })
    })

    describe('with localStorage containing "guest" account type', () => {
      afterEach(() => {
        localStorage.clear()
      })

      describe('without the active dog', () => {
        let accountManager: ReturnType<typeof useAccountManager>

        beforeEach(() => {
          localStorage.setItem(
            ACCOUNT_INFO_LOCAL_STORAGE_KEY,
            JSON.stringify({
              type: 'guest',
              mapboxAccessToken: 'dummy-mapbox-access-token'
            })
          )
          accountManager = useAccountManager()
        })

        it('should have "guest" account', () => {
          expect(accountManager.accountInfo).toEqual({
            type: 'guest',
            mapboxAccessToken: 'dummy-mapbox-access-token'
          })
        })

        it('should not request the active dog', () => {
          expect(dogDatabaseManager.getGuestDogDatabase).not.toHaveBeenCalled()
        })

        it('should have no current dog', () => {
          expect(accountManager.currentDog).toBeUndefined()
        })

        it('should have no active business records', () => {
          expect(accountManager.activeBusinessRecords).toBeUndefined()
        })

        it('should fail to add a business record', async () => {
          await expect(accountManager.addBusinessRecord({
            businessType: 'pee',
            location: {
              latitude: 35.6812,
              longitude: 139.7671
            },
            timestamp: 1527001200
          })).rejects.toThrow()
        })

        describe('after registerNewDogFriend', () => {
          beforeEach(async () => {
            await accountManager.registerNewDogFriend({ name: 'ポチ' })
          })

          it('should store the updated account info', () => {
            const storedAccountInfo = JSON.parse(localStorage.getItem(ACCOUNT_INFO_LOCAL_STORAGE_KEY)!)
            expect(storedAccountInfo).toEqual({
              type: 'guest',
              mapboxAccessToken: 'dummy-mapbox-access-token',
              activeDogId: 1
            })
          })

          it('should register a new dog', () => {
            expect(guestDogDatabase.createDog).toHaveBeenCalledWith({
              name: 'ポチ'
            })
          })

          it('should have the current dog', () => {
            expect(accountManager.currentDog).toEqual({
              dogId: 1,
              name: 'ポチ'
            })
          })

          it('should have empty active business records', () => {
            expect(accountManager.activeBusinessRecords).toEqual([])
          })

          describe('after addBusinessRecord', () => {
            const businessRecordParams: BusinessRecordParams = {
              businessType: 'pee',
              location: {
                latitude: 35.6812,
                longitude: 139.7671
              },
              timestamp: 1527001200
            }

            beforeEach(async () => {
              await accountManager.addBusinessRecord(businessRecordParams)
            })

            it('should request to add a business record', () => {
              expect(guestBusinessRecordDatabase.createBusinessRecord).toHaveBeenCalledWith({
                dogId: 1,
                ...businessRecordParams
              })
            })
          })
        })
      })

      describe('with the active dog', () => {
        const dummyDog = {
          dogId: 1,
          name: 'ポチ'
        }
        const dummyRecords: BusinessRecord<number, number>[] = [
          {
            recordId: 1,
            dogId: 1,
            businessType: 'pee',
            location: {
              latitude: 35.6812,
              longitude: 139.7671
            },
            timestamp: 1527001200
          },
          {
            recordId: 2,
            dogId: 1,
            businessType: 'poo',
            location: {
              latitude: -34.6037,
              longitude: -58.3821,
            },
            timestamp: 1763794500
          }
        ]
        let accountManager: ReturnType<typeof useAccountManager>

        beforeEach(async () => {
          localStorage.setItem(
            ACCOUNT_INFO_LOCAL_STORAGE_KEY,
            JSON.stringify({
              type: 'guest',
              mapboxAccessToken: 'dummy-mapbox-access-token',
              activeDogId: 1
            })
          )
          // returns a dummy dog
          vi.mocked(guestDogDatabase.getDog).mockResolvedValue(dummyDog)
          accountManager = useAccountManager()
          // returns dummy business records
          vi.mocked(guestBusinessRecordDatabase.loadBusinessRecords)
            .mockResolvedValue(dummyRecords)

          // waits for async operations to complete
          // TODO: how many ticks are actually needed?
          await nextTick()
        })

        it('should have "guest" account', () => {
          expect(accountManager.accountInfo).toEqual({
            type: 'guest',
            mapboxAccessToken: 'dummy-mapbox-access-token',
            activeDogId: 1
          })
        })

        it('should request the active dog', () => {
          expect(dogDatabaseManager.getGuestDogDatabase).toHaveBeenCalled()
          expect(guestDogDatabase.getDog).toHaveBeenCalledWith(1)
        })

        it('should have the active dog as the current dog', () => {
          expect(accountManager.currentDog).toEqual(dummyDog)
        })

        it('should request the business records of the active dog', async () => {
          expect(businessRecordDatabaseManager.getGuestBusinessRecordDatabase).toHaveBeenCalled()
          expect(guestBusinessRecordDatabase.loadBusinessRecords).toHaveBeenCalledWith(1)
        })

        it('should have the active business records loaded from the database', () => {
          expect(accountManager.activeBusinessRecords).toEqual(dummyRecords)
        })
      })
    })
  })
})
