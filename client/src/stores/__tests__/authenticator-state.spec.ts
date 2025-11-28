import { setActivePinia, createPinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, nextTick } from 'vue'

import { ResourceApiProvider } from '@/providers/resource-api'
import { useAuthenticatorState } from '@/stores/authenticator-state'
import type { AuthenticatorUi } from '@/stores/authenticator-state'
import { isUserInfo } from '@/types/account-info'
import type { ResourceApi } from '@/types/resource-api'
import { wrapFetchResponse } from '@/utils/api-response'

// key used in `sessionStorage` to store the authenticator state.
const SESSION_STORAGE_KEY = 'dogs-business.authenticator-state'

const app = createApp({}) // app can be reused across tests

describe('stores.authenticator-state', () => {
  describe('useAuthenticatorState', () => {
    describe('without ResourceApi injected', () => {
      beforeEach(() => {
        setActivePinia(createPinia())
      })

      it('should throw', () => {
        expect(() => useAuthenticatorState()).toThrow()
      })
    })

    describe('with ResourceApi injected', () => {
      const mockResourceApi: ResourceApi = {
        getCurrentUserInfo: vi.fn()
      }

      beforeEach(() => {
        const pinia = createPinia()
        app.use(pinia)
        app.use(new ResourceApiProvider(mockResourceApi))
        setActivePinia(pinia)
      })

      describe('with empty sessionStorage', () => {
        let authenticatorState: ReturnType<typeof useAuthenticatorState>

        beforeEach(() => {
          authenticatorState = useAuthenticatorState()
        })

        afterEach(() => {
          sessionStorage.clear()
        })

        it('should be in the "loading" state', () => {
          expect(authenticatorState.state.type).toBe('loading')
        })

        describe('after syncStateWithAccountInfo(no-account)', () => {
          beforeEach(() => {
            authenticatorState.syncStateWithAccountInfo({ type: 'no-account' })
          })

          it('should be in the "welcoming" state', () => {
            expect(authenticatorState.state.type).toBe('welcoming')
          })

          it('should persist the "welcoming" state in sessionStorage', () => {
            const storedState = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY)!)
            expect(storedState.type).toBe('welcoming')
          })
        })

        describe('after syncStateWithAccountInfo(guest)', () => {
          beforeEach(() => {
            authenticatorState.syncStateWithAccountInfo({ type: 'guest' })
          })

          it('should be in the "guest" state', () => {
            expect(authenticatorState.state.type).toBe('guest')
          })

          it('should persist the "guest" state in sessionStorage', () => {
            const storedState = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY)!)
            expect(storedState.type).toBe('guest')
          })
        })

        describe('after syncStateWithAccountInfo(online)', () => {
          describe('with valid tokens', () => {
            describe('with successful user info retrieval', () => {
              let activatedAt: number

              beforeEach(async () => {
                // lets the getCurrentUserInfo return a valid user info
                const apiResponse = wrapFetchResponse(new Response('{}'), isUserInfo)
                mockResourceApi.getCurrentUserInfo = vi
                  .mocked(mockResourceApi.getCurrentUserInfo)
                  .mockResolvedValue(apiResponse)

                // syncs the state
                activatedAt = Date.now()
                await authenticatorState.syncStateWithAccountInfo({
                  type: 'online',
                  publicKeyInfo: {
                    authenticatorAttachment: 'platform',
                    id: 'dummy-public-key-id',
                    userHandle: 'dummy-user-handle'
                  },
                  tokens: {
                    activatedAt,
                    expiresIn: 30 * 60,
                    accessToken: 'dummy-access-token',
                    idToken: 'dummy-id-token',
                    refreshToken: 'dummy-refresh-token'
                  },
                  userInfo: {}
                })
              })

              afterEach(() => {
                vi.mocked(mockResourceApi.getCurrentUserInfo).mockReset()
              })

              it('should be in the "authenticated" state', () => {
                const expectedState = {
                  type: 'authenticated',
                  publicKeyInfo: {
                    authenticatorAttachment: 'platform',
                    id: 'dummy-public-key-id',
                    userHandle: 'dummy-user-handle'
                  },
                  tokens: {
                    activatedAt,
                    expiresIn: 30 * 60,
                    accessToken: 'dummy-access-token',
                    idToken: 'dummy-id-token',
                    refreshToken: 'dummy-refresh-token'
                  },
                  userInfo: {}
                }

                expect(authenticatorState.state).toEqual(expectedState)

                const storedState = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY)!)
                expect(storedState).toEqual(expectedState)
              })
            })

            describe('with unauthorized user info retrieval', () => {
              beforeEach(async () => {
                // lets the getCurrentUserInfo return a 401 response
                const apiResponse = wrapFetchResponse(
                  new Response('Unauthorized', { status: 401 }),
                  isUserInfo
                )
                mockResourceApi.getCurrentUserInfo = vi
                  .mocked(mockResourceApi.getCurrentUserInfo)
                  .mockResolvedValue(apiResponse)

                // syncs the state
                await authenticatorState.syncStateWithAccountInfo({
                  type: 'online',
                  publicKeyInfo: {
                    authenticatorAttachment: 'platform',
                    id: 'dummy-public-key-id',
                    userHandle: 'dummy-user-handle'
                  },
                  tokens: {
                    activatedAt: Date.now(),
                    expiresIn: 30 * 60,
                    accessToken: 'dummy-access-token',
                    idToken: 'dummy-id-token',
                    refreshToken: 'dummy-refresh-token'
                  },
                  userInfo: {}
                })
              })

              afterEach(() => {
                vi.mocked(mockResourceApi.getCurrentUserInfo).mockReset()
              })

              it('should be in the "authenticating" state', () => {
                const expectedState = {
                  type: 'authenticating',
                  publicKeyInfo: {
                    authenticatorAttachment: 'platform',
                    id: 'dummy-public-key-id',
                    userHandle: 'dummy-user-handle'
                  }
                }

                expect(authenticatorState.state).toEqual(expectedState)

                const storedState = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY)!)
                expect(storedState).toEqual(expectedState)
              })
            })

            // TODO: determine the behavior
            describe.skip('with other failed user info retrieval', () => {
            })
          })

          describe('with expiring tokens', () => {
            let activatedAt: number

            beforeEach(() => {
              activatedAt = Date.now() - 30 * 60 * 1000 // 30 minutes ago
              authenticatorState.syncStateWithAccountInfo({
                type: 'online',
                publicKeyInfo: {
                  authenticatorAttachment: 'platform',
                  id: 'dummy-public-key-id',
                  userHandle: 'dummy-user-handle'
                },
                tokens: {
                  activatedAt,
                  expiresIn: 30 * 60,
                  accessToken: 'dummy-access-token',
                  idToken: 'dummy-id-token',
                  refreshToken: 'dummy-refresh-token'
                },
                userInfo: {}
              })
            })

            it('should be in the "refreshing-tokens" state', () => {
              expect(authenticatorState.state).toEqual({
                type: 'refreshing-tokens',
                publicKeyInfo: {
                  authenticatorAttachment: 'platform',
                  id: 'dummy-public-key-id',
                  userHandle: 'dummy-user-handle'
                },
                tokens: {
                  activatedAt,
                  expiresIn: 30 * 60,
                  accessToken: 'dummy-access-token',
                  idToken: 'dummy-id-token',
                  refreshToken: 'dummy-refresh-token'
                }
              })
            })

            it('should persist the "refreshing-tokens" state in sessionStorage', () => {
              const storedState = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY)!)
              expect(storedState).toEqual({
                type: 'refreshing-tokens',
                publicKeyInfo: {
                  authenticatorAttachment: 'platform',
                  id: 'dummy-public-key-id',
                  userHandle: 'dummy-user-handle'
                },
                tokens: {
                  activatedAt,
                  expiresIn: 30 * 60,
                  accessToken: 'dummy-access-token',
                  idToken: 'dummy-id-token',
                  refreshToken: 'dummy-refresh-token'
                }
              })
            })
          })
        })

        describe('after updateCredentials without tokens', () => {
          beforeEach(() => {
            authenticatorState.updateCredentials({
              publicKeyInfo: {
                authenticatorAttachment: 'platform',
                id: 'dummy-public-key-id',
                userHandle: 'dummy-user-handle'
              }
            })
          })

          it('should be in the "authenticating" state', () => {
            expect(authenticatorState.state).toEqual({
              type: 'authenticating',
              publicKeyInfo: {
                authenticatorAttachment: 'platform',
                id: 'dummy-public-key-id',
                userHandle: 'dummy-user-handle'
              }
            })
          })

          it('should persist the "authenticating" state in sessionStorage', () => {
            const storedState = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY)!)
            expect(storedState).toEqual({
              type: 'authenticating',
              publicKeyInfo: {
                authenticatorAttachment: 'platform',
                id: 'dummy-public-key-id',
                userHandle: 'dummy-user-handle'
              }
            })
          })
        })

        describe('after updateCredentials with tokens', () => {
          describe('with valid tokens', () => {
            describe('with successful user info retrieval', () => {
              let activatedAt: number

              beforeEach(async () => {
                // lets the getCurrentUserInfo return a valid user info
                mockResourceApi.getCurrentUserInfo = vi
                  .mocked(mockResourceApi.getCurrentUserInfo)
                  .mockResolvedValue(wrapFetchResponse(new Response('{}'), isUserInfo))

                // updates the credentials
                activatedAt = Date.now()
                await authenticatorState.updateCredentials({
                  publicKeyInfo: {
                    authenticatorAttachment: 'platform',
                    id: 'dummy-public-key-id',
                    userHandle: 'dummy-user-handle'
                  },
                  tokens: {
                    activatedAt,
                    expiresIn: 30 * 60,
                    accessToken: 'dummy-access-token',
                    idToken: 'dummy-id-token',
                    refreshToken: 'dummy-refresh-token'
                  }
                })
              })

              afterEach(() => {
                vi.mocked(mockResourceApi.getCurrentUserInfo).mockReset()
              })

              it('should be in the "authenticated" state', () => {
                const expectedState = {
                  type: 'authenticated',
                  publicKeyInfo: {
                    authenticatorAttachment: 'platform',
                    id: 'dummy-public-key-id',
                    userHandle: 'dummy-user-handle'
                  },
                  tokens: {
                    activatedAt,
                    expiresIn: 30 * 60,
                    accessToken: 'dummy-access-token',
                    idToken: 'dummy-id-token',
                    refreshToken: 'dummy-refresh-token'
                  },
                  userInfo: {}
                }

                expect(authenticatorState.state).toEqual(expectedState)

                const storedState = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY)!)
                expect(storedState).toEqual(expectedState)
              })
            })

            describe('with unauthorized user info retrieval', () => {
              beforeEach(async () => {
                // lets the getCurrentUserInfo return a 401 response
                const apiResponse = wrapFetchResponse(
                  new Response('Unauthorized', { status: 401 }),
                  isUserInfo
                )
                mockResourceApi.getCurrentUserInfo = vi
                  .mocked(mockResourceApi.getCurrentUserInfo)
                  .mockResolvedValue(apiResponse)

                // updates the credentials
                await authenticatorState.updateCredentials({
                  publicKeyInfo: {
                    authenticatorAttachment: 'platform',
                    id: 'dummy-public-key-id',
                    userHandle: 'dummy-user-handle'
                  },
                  tokens: {
                    activatedAt: Date.now(),
                    expiresIn: 30 * 60,
                    accessToken: 'dummy-access-token',
                    idToken: 'dummy-id-token',
                    refreshToken: 'dummy-refresh-token'
                  }
                })
              })

              afterEach(() => {
                vi.mocked(mockResourceApi.getCurrentUserInfo).mockReset()
              })

              it('should be in the "authenticating" state', () => {
                const expectedState = {
                  type: 'authenticating',
                  publicKeyInfo: {
                    authenticatorAttachment: 'platform',
                    id: 'dummy-public-key-id',
                    userHandle: 'dummy-user-handle'
                  }
                }

                expect(authenticatorState.state).toEqual(expectedState)

                const storedState = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY)!)
                expect(storedState).toEqual(expectedState)
              })
            })

            // TODO: determine the behavior
            describe.skip('with other failed user info retrieval', () => {
            })
          })

          describe('with expiring tokens', () => {
            let activatedAt: number

            beforeEach(() => {
              activatedAt = Date.now() - 30 * 60 * 1000 // 30 minutes ago
              authenticatorState.updateCredentials({
                publicKeyInfo: {
                  authenticatorAttachment: 'platform',
                  id: 'dummy-public-key-id',
                  userHandle: 'dummy-user-handle'
                },
                tokens: {
                  activatedAt,
                  expiresIn: 30 * 60,
                  accessToken: 'dummy-access-token',
                  idToken: 'dummy-id-token',
                  refreshToken: 'dummy-refresh-token'
                }
              })
            })

            it('should be in the "refreshing-tokens" state', () => {
              expect(authenticatorState.state).toEqual({
                type: 'refreshing-tokens',
                publicKeyInfo: {
                  authenticatorAttachment: 'platform',
                  id: 'dummy-public-key-id',
                  userHandle: 'dummy-user-handle'
                },
                tokens: {
                  activatedAt,
                  expiresIn: 30 * 60,
                  accessToken: 'dummy-access-token',
                  idToken: 'dummy-id-token',
                  refreshToken: 'dummy-refresh-token'
                }
              })
            })

            it('should persist the "refreshing-tokens" state in sessionStorage', () => {
              const storedState = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY)!)
              expect(storedState).toEqual({
                type: 'refreshing-tokens',
                publicKeyInfo: {
                  authenticatorAttachment: 'platform',
                  id: 'dummy-public-key-id',
                  userHandle: 'dummy-user-handle'
                },
                tokens: {
                  activatedAt,
                  expiresIn: 30 * 60,
                  accessToken: 'dummy-access-token',
                  idToken: 'dummy-id-token',
                  refreshToken: 'dummy-refresh-token'
                }
              })
            })
          })
        })
      })

      describe('with sessionStorage containing the "welcoming" state', () => {
        let authenticatorState: ReturnType<typeof useAuthenticatorState>

        beforeEach(() => {
          sessionStorage.setItem(
            SESSION_STORAGE_KEY,
            JSON.stringify({ type: 'welcoming' }),
          )
          authenticatorState = useAuthenticatorState()
        })

        afterEach(() => {
          sessionStorage.clear()
        })

        it('should be in the "welcoming" state', () => {
          expect(authenticatorState.state.type).toBe('welcoming')
        })

        describe('after syncStateWithAccountInfo(no-account)', () => {
          beforeEach(() => {
            authenticatorState.syncStateWithAccountInfo({ type: 'no-account' })
          })

          it('should be in the "welcoming" state', () => {
            expect(authenticatorState.state.type).toBe('welcoming')
          })
        })

        describe('after syncStateWithAccountInfo(guest)', () => {
          beforeEach(() => {
            authenticatorState.syncStateWithAccountInfo({ type: 'guest' })
          })

          it('should be in the "guest" state', () => {
            expect(authenticatorState.state.type).toBe('guest')
          })

          it('should persist the "guest" state in sessionStorage', () => {
            const storedState = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY)!)
            expect(storedState.type).toBe('guest')
          })
        })

        describe('after syncStateWithAccountInfo(online)', () => {
          describe('with valid tokens', () => {
            describe('with successful user info retrieval', () => {
              let activatedAt: number

              beforeEach(async () => {
                // lets the getCurrentUserInfo return a valid user info
                mockResourceApi.getCurrentUserInfo = vi
                  .mocked(mockResourceApi.getCurrentUserInfo)
                  .mockResolvedValue(wrapFetchResponse(new Response('{}'), isUserInfo))

                // syncs the state
                activatedAt = Date.now()
                await authenticatorState.syncStateWithAccountInfo({
                  type: 'online',
                  publicKeyInfo: {
                    authenticatorAttachment: 'platform',
                    id: 'dummy-public-key-id',
                    userHandle: 'dummy-user-handle'
                  },
                  tokens: {
                    activatedAt,
                    expiresIn: 30 * 60,
                    accessToken: 'dummy-access-token',
                    idToken: 'dummy-id-token',
                    refreshToken: 'dummy-refresh-token'
                  },
                  userInfo: {}
                })
              })

              afterEach(() => {
                vi.mocked(mockResourceApi.getCurrentUserInfo).mockReset()
              })

              it('should be in the "authenticated" state', () => {
                const expectedState = {
                  type: 'authenticated',
                  publicKeyInfo: {
                    authenticatorAttachment: 'platform',
                    id: 'dummy-public-key-id',
                    userHandle: 'dummy-user-handle'
                  },
                  tokens: {
                    activatedAt,
                    expiresIn: 30 * 60,
                    accessToken: 'dummy-access-token',
                    idToken: 'dummy-id-token',
                    refreshToken: 'dummy-refresh-token'
                  },
                  userInfo: {}
                }

                expect(authenticatorState.state).toEqual(expectedState)

                const storedState = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY)!)
                expect(storedState).toEqual(expectedState)
              })
            })

            describe('with unauthorized user info retrieval', () => {
              beforeEach(async () => {
                // lets the getCurrentUserInfo return a 401 response
                const apiResponse = wrapFetchResponse(
                  new Response('Unauthorized', { status: 401 }),
                  isUserInfo
                )
                mockResourceApi.getCurrentUserInfo = vi
                  .mocked(mockResourceApi.getCurrentUserInfo)
                  .mockResolvedValue(apiResponse)

                // syncs the state
                await authenticatorState.syncStateWithAccountInfo({
                  type: 'online',
                  publicKeyInfo: {
                    authenticatorAttachment: 'platform',
                    id: 'dummy-public-key-id',
                    userHandle: 'dummy-user-handle'
                  },
                  tokens: {
                    activatedAt: Date.now(),
                    expiresIn: 30 * 60,
                    accessToken: 'dummy-access-token',
                    idToken: 'dummy-id-token',
                    refreshToken: 'dummy-refresh-token'
                  },
                  userInfo: {}
                })
              })

              afterEach(() => {
                vi.mocked(mockResourceApi.getCurrentUserInfo).mockReset()
              })

              it('should be in the "authenticating" state', () => {
                const expectedState = {
                  type: 'authenticating',
                  publicKeyInfo: {
                    authenticatorAttachment: 'platform',
                    id: 'dummy-public-key-id',
                    userHandle: 'dummy-user-handle'
                  }
                }

                expect(authenticatorState.state).toEqual(expectedState)

                const storedState = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY)!)
                expect(storedState).toEqual(expectedState)
              })
            })

            // TODO: determine the behavior
            describe.skip('with other failed user info retrieval', () => {
            })
          })

          describe('with expiring tokens', () => {
            let activatedAt: number

            beforeEach(() => {
              activatedAt = Date.now() - 30 * 60 * 1000 // 30 minutes ago
              authenticatorState.syncStateWithAccountInfo({
                type: 'online',
                publicKeyInfo: {
                  authenticatorAttachment: 'platform',
                  id: 'dummy-public-key-id',
                  userHandle: 'dummy-user-handle'
                },
                tokens: {
                  activatedAt,
                  expiresIn: 30 * 60,
                  accessToken: 'dummy-access-token',
                  idToken: 'dummy-id-token',
                  refreshToken: 'dummy-refresh-token'
                },
                userInfo: {}
              })
            })

            it('should be in the "refreshing-tokens" state', () => {
              expect(authenticatorState.state).toEqual({
                type: 'refreshing-tokens',
                publicKeyInfo: {
                  authenticatorAttachment: 'platform',
                  id: 'dummy-public-key-id',
                  userHandle: 'dummy-user-handle'
                },
                tokens: {
                  activatedAt,
                  expiresIn: 30 * 60,
                  accessToken: 'dummy-access-token',
                  idToken: 'dummy-id-token',
                  refreshToken: 'dummy-refresh-token'
                }
              })
            })

            it('should persist the "refreshing-tokens" state in sessionStorage', () => {
              const storedState = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY)!)
              expect(storedState).toEqual({
                type: 'refreshing-tokens',
                publicKeyInfo: {
                  authenticatorAttachment: 'platform',
                  id: 'dummy-public-key-id',
                  userHandle: 'dummy-user-handle'
                },
                tokens: {
                  activatedAt,
                  expiresIn: 30 * 60,
                  accessToken: 'dummy-access-token',
                  idToken: 'dummy-id-token',
                  refreshToken: 'dummy-refresh-token'
                }
              })
            })
          })
        })

        describe('after updateCredentials without tokens', () => {
          beforeEach(() => {
            authenticatorState.updateCredentials({
              publicKeyInfo: {
                authenticatorAttachment: 'platform',
                id: 'dummy-public-key-id',
                userHandle: 'dummy-user-handle'
              }
            })
          })

          it('should be in the "authenticating" state', () => {
            expect(authenticatorState.state).toEqual({
              type: 'authenticating',
              publicKeyInfo: {
                authenticatorAttachment: 'platform',
                id: 'dummy-public-key-id',
                userHandle: 'dummy-user-handle'
              }
            })
          })

          it('should persist the "authenticating" state in sessionStorage', () => {
            const storedState = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY)!)
            expect(storedState).toEqual({
              type: 'authenticating',
              publicKeyInfo: {
                authenticatorAttachment: 'platform',
                id: 'dummy-public-key-id',
                userHandle: 'dummy-user-handle'
              }
            })
          })
        })

        describe('after updateCredentials with tokens', () => {
          describe('with valid tokens', () => {
            describe('with successful user info retrieval', () => {
              let activatedAt: number

              beforeEach(async () => {
                // lets the getCurrentUserInfo return a valid user info
                mockResourceApi.getCurrentUserInfo = vi
                  .mocked(mockResourceApi.getCurrentUserInfo)
                  .mockResolvedValue(wrapFetchResponse(new Response('{}'), isUserInfo))

                // updates the credentials
                activatedAt = Date.now()
                await authenticatorState.updateCredentials({
                  publicKeyInfo: {
                    authenticatorAttachment: 'platform',
                    id: 'dummy-public-key-id',
                    userHandle: 'dummy-user-handle'
                  },
                  tokens: {
                    activatedAt,
                    expiresIn: 30 * 60,
                    accessToken: 'dummy-access-token',
                    idToken: 'dummy-id-token',
                    refreshToken: 'dummy-refresh-token'
                  }
                })
              })

              it('should be in the "authenticated" state', () => {
                const expectedState = {
                  type: 'authenticated',
                  publicKeyInfo: {
                    authenticatorAttachment: 'platform',
                    id: 'dummy-public-key-id',
                    userHandle: 'dummy-user-handle'
                  },
                  tokens: {
                    activatedAt,
                    expiresIn: 30 * 60,
                    accessToken: 'dummy-access-token',
                    idToken: 'dummy-id-token',
                    refreshToken: 'dummy-refresh-token'
                  },
                  userInfo: {}
                }

                expect(authenticatorState.state).toEqual(expectedState)

                const storedState = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY)!)
                expect(storedState).toEqual(expectedState)
              })
            })

            describe('with unauthorized user info retrieval', () => {
              beforeEach(async () => {
                // lets the getCurrentUserInfo return a 401 response
                const apiResponse = wrapFetchResponse(
                  new Response('Unauthorized', { status: 401 }),
                  isUserInfo
                )
                mockResourceApi.getCurrentUserInfo = vi
                  .mocked(mockResourceApi.getCurrentUserInfo)
                  .mockResolvedValue(apiResponse)

                // updates the credentials
                await authenticatorState.updateCredentials({
                  publicKeyInfo: {
                    authenticatorAttachment: 'platform',
                    id: 'dummy-public-key-id',
                    userHandle: 'dummy-user-handle'
                  },
                  tokens: {
                    activatedAt: Date.now(),
                    expiresIn: 30 * 60,
                    accessToken: 'dummy-access-token',
                    idToken: 'dummy-id-token',
                    refreshToken: 'dummy-refresh-token'
                  }
                })
              })

              afterEach(() => {
                vi.mocked(mockResourceApi.getCurrentUserInfo).mockReset()
              })

              it('should be in the "authenticating" state', () => {
                const expectedState = {
                  type: 'authenticating',
                  publicKeyInfo: {
                    authenticatorAttachment: 'platform',
                    id: 'dummy-public-key-id',
                    userHandle: 'dummy-user-handle'
                  }
                }

                expect(authenticatorState.state).toEqual(expectedState)

                const storedState = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY)!)
                expect(storedState).toEqual(expectedState)
              })
            })

            // TODO: determine the behavior
            describe.skip('with other failed user info retrieval', () => {
            })
          })

          describe('with expiring tokens', () => {
            let activatedAt: number

            beforeEach(() => {
              activatedAt = Date.now() - 30 * 60 * 1000 // 30 minutes ago
              authenticatorState.updateCredentials({
                publicKeyInfo: {
                  authenticatorAttachment: 'platform',
                  id: 'dummy-public-key-id',
                  userHandle: 'dummy-user-handle'
                },
                tokens: {
                  activatedAt,
                  expiresIn: 30 * 60,
                  accessToken: 'dummy-access-token',
                  idToken: 'dummy-id-token',
                  refreshToken: 'dummy-refresh-token'
                }
              })
            })

            it('should be in the "refreshing-tokens" state', () => {
              expect(authenticatorState.state).toEqual({
                type: 'refreshing-tokens',
                publicKeyInfo: {
                  authenticatorAttachment: 'platform',
                  id: 'dummy-public-key-id',
                  userHandle: 'dummy-user-handle'
                },
                tokens: {
                  activatedAt,
                  expiresIn: 30 * 60,
                  accessToken: 'dummy-access-token',
                  idToken: 'dummy-id-token',
                  refreshToken: 'dummy-refresh-token'
                }
              })
            })

            it('should persist the "refreshing-tokens" state in sessionStorage', () => {
              const storedState = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY)!)
              expect(storedState).toEqual({
                type: 'refreshing-tokens',
                publicKeyInfo: {
                  authenticatorAttachment: 'platform',
                  id: 'dummy-public-key-id',
                  userHandle: 'dummy-user-handle'
                },
                tokens: {
                  activatedAt,
                  expiresIn: 30 * 60,
                  accessToken: 'dummy-access-token',
                  idToken: 'dummy-id-token',
                  refreshToken: 'dummy-refresh-token'
                }
              })
            })
          })
        })
      })

      describe('with sessionStorage containing the "guest" state', () => {
        let authenticatorState: ReturnType<typeof useAuthenticatorState>

        beforeEach(() => {
          sessionStorage.setItem(
            SESSION_STORAGE_KEY,
            JSON.stringify({ type: 'guest' })
          )
          authenticatorState = useAuthenticatorState()
        })

        afterEach(() => {
          sessionStorage.clear()
        })

        it('should be in the "guest" state', () => {
          expect(authenticatorState.state.type).toBe('guest')
        })

        describe('after syncStateWithAccountInfo(no-account)', () => {
          beforeEach(() => {
            authenticatorState.syncStateWithAccountInfo({ type: 'no-account' })
          })

          it('should be in the "welcoming" state with a "corrupted-account-info" error', () => {
            expect(authenticatorState.state.type).toBe('welcoming')
            expect(authenticatorState.lastError?.type).toBe('corrupted-account-info')
          })
        })

        describe('after syncStateWithAccountInfo(guest)', () => {
          beforeEach(() => {
            authenticatorState.syncStateWithAccountInfo({ type: 'guest' })
          })

          it('should be in the "guest" state', () => {
            expect(authenticatorState.state.type).toBe('guest')
          })
        })

        describe('after syncStateWithAccountInfo(online)', () => {
          beforeEach(() => {
            authenticatorState.syncStateWithAccountInfo({
              type: 'online',
              publicKeyInfo: {
                authenticatorAttachment: 'platform',
                id: 'dummy-public-key-id',
                userHandle: 'dummy-user-handle'
              },
              tokens: {
                activatedAt: Date.now(),
                expiresIn: 30 * 60,
                accessToken: 'dummy-access-token',
                idToken: 'dummy-id-token',
                refreshToken: 'dummy-refresh-token'
              },
              userInfo: {}
            })
          })

          it('should be in the "welcoming" state with a "corrupted-account-info" error', () => {
            expect(authenticatorState.state.type).toBe('welcoming')
            expect(authenticatorState.lastError?.type).toBe('corrupted-account-info')
          })

          it('should persist the "welcoming" state in sessionStorage', () => {
            const storedState = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY)!)
            expect(storedState.type).toBe('welcoming')
          })
        })

        it('updateCredentials without tokens should throw', async () => {
          await expect(() => authenticatorState.updateCredentials({
            publicKeyInfo: {
              authenticatorAttachment: 'platform',
              id: 'dummy-public-key-id',
              userHandle: 'dummy-user-handle'
            }
          })).rejects.toThrow()
        })

        it('updateCredentials with tokens should throw', async () => {
          await expect(() => authenticatorState.updateCredentials({
            publicKeyInfo: {
              authenticatorAttachment: 'platform',
              id: 'dummy-public-key-id',
              userHandle: 'dummy-user-handle'
            },
            tokens: {
              activatedAt: Date.now(),
              expiresIn: 30 * 60,
              accessToken: 'dummy-access-token',
              idToken: 'dummy-id-token',
              refreshToken: 'dummy-refresh-token'
            }
          })).rejects.toThrow()
        })
      })

      describe('with sessionStorage containing the "authenticating" state', () => {
        let authenticatorState: ReturnType<typeof useAuthenticatorState>

        beforeEach(() => {
          sessionStorage.setItem(
            SESSION_STORAGE_KEY,
            JSON.stringify({
              type: 'authenticating',
              publicKeyInfo: {
                authenticatorAttachment: 'platform',
                id: 'dummy-public-key-id',
                userHandle: 'dummy-user-handle'
              }
            })
          )
          authenticatorState = useAuthenticatorState()
        })

        afterEach(() => {
          sessionStorage.clear()
        })

        it('should be in the "authenticating" state', () => {
          expect(authenticatorState.state).toEqual({
            type: 'authenticating',
            publicKeyInfo: {
              authenticatorAttachment: 'platform',
              id: 'dummy-public-key-id',
              userHandle: 'dummy-user-handle'
            }
          })
        })

        describe('after attachAuthenticatorUi()', () => {
          let authenticatorUi: AuthenticatorUi
          let detachAuthenticatorUi: () => void

          beforeEach(async () => {
            authenticatorUi = {
              askSignIn: vi.fn()
            }
            detachAuthenticatorUi = authenticatorState.attachAuthenticatorUi(authenticatorUi)
            // makes sure that the watchEffect is executed
            await nextTick()
          })

          it('should call askSignIn of the authenticator UI', () => {
            expect(authenticatorUi.askSignIn).toHaveBeenCalledWith({
              authenticatorAttachment: 'platform',
              id: 'dummy-public-key-id',
              userHandle: 'dummy-user-handle'
            })
          })

          it('should not be able to attach another authenticator UI but end up with an error thrown', () => {
            expect(() => {
              authenticatorState.attachAuthenticatorUi({
                askSignIn: () => Promise.resolve()
              })
            }).toThrow()
          })

          describe('after detaching the authenticator UI', () => {
            beforeEach(async () => {
              detachAuthenticatorUi()
              vi.mocked(authenticatorUi.askSignIn).mockClear()
              // makes sure that the watchEffect is executed
              await nextTick()
            })

            it('should be able to attach another authenticator UI', async () => {
              const newAuthenticatorUi: AuthenticatorUi = {
                askSignIn: vi.fn()
              }
              authenticatorState.attachAuthenticatorUi(newAuthenticatorUi)
              // makes sure that the watchEffect is executed
              await nextTick()

              expect(newAuthenticatorUi.askSignIn).toHaveBeenCalledWith({
                authenticatorAttachment: 'platform',
                id: 'dummy-public-key-id',
                userHandle: 'dummy-user-handle'
              })
              expect(authenticatorUi.askSignIn).not.toHaveBeenCalled()
            })
          })
        })

        describe('after syncStateWithAccountInfo(no-account)', () => {
          beforeEach(() => {
            authenticatorState.syncStateWithAccountInfo({ type: 'no-account' })
          })

          it('should be in the "authenticating" state', () => {
            expect(authenticatorState.state).toEqual({
              type: 'authenticating',
              publicKeyInfo: {
                authenticatorAttachment: 'platform',
                id: 'dummy-public-key-id',
                userHandle: 'dummy-user-handle'
              }
            })
          })
        })

        describe('after syncStateWithAccountInfo(guest)', () => {
          beforeEach(() => {
            authenticatorState.syncStateWithAccountInfo({ type: 'guest' })
          })

          it('should be in the "welcoming" state with a "corrupted-account-info" error', () => {
            expect(authenticatorState.state.type).toBe('welcoming')
            expect(authenticatorState.lastError?.type).toBe('corrupted-account-info')
          })
        })

        describe('after syncStateWithAccountInfo(online)', () => {
          let activatedAt: number

          beforeEach(() => {
            activatedAt = Date.now()
            authenticatorState.syncStateWithAccountInfo({
              type: 'online',
              publicKeyInfo: {
                authenticatorAttachment: 'platform',
                id: 'dummy-public-key-id',
                userHandle: 'dummy-user-handle'
              },
              tokens: {
                activatedAt,
                expiresIn: 30 * 60,
                accessToken: 'dummy-access-token',
                idToken: 'dummy-id-token',
                refreshToken: 'dummy-refresh-token'
              },
              userInfo: {}
            })
          })

          it('should be in the "authenticating" state', () => {
            expect(authenticatorState.state).toEqual({
              type: 'authenticating',
              publicKeyInfo: {
                authenticatorAttachment: 'platform',
                id: 'dummy-public-key-id',
                userHandle: 'dummy-user-handle'
              }
            })
          })
        })

        describe('after updateCredentials without tokens', () => {
          // TODO: introduce the "discovering" state
          it.skip('should be in the "discovering" state', () => {
            throw new Error('not yet implemented')
          })
        })

        describe('after updateCredentials with tokens', () => {
          describe('with valid tokens', () => {
            describe('with successful user info retrieval', () => {
              let activatedAt: number

              beforeEach(async () => {
                // lets the getCurrentUserInfo return a valid user info
                mockResourceApi.getCurrentUserInfo = vi
                  .mocked(mockResourceApi.getCurrentUserInfo)
                  .mockResolvedValue(wrapFetchResponse(new Response('{}'), isUserInfo))

                // updates the credentials
                activatedAt = Date.now()
                await authenticatorState.updateCredentials({
                  publicKeyInfo: {
                    authenticatorAttachment: 'platform',
                    id: 'dummy-public-key-id-2',
                    userHandle: 'dummy-user-handle-2'
                  },
                  tokens: {
                    activatedAt,
                    expiresIn: 30 * 60,
                    accessToken: 'dummy-access-token',
                    idToken: 'dummy-id-token',
                    refreshToken: 'dummy-refresh-token'
                  }
                })
              })

              afterEach(() => {
                vi.mocked(mockResourceApi.getCurrentUserInfo).mockReset()
              })

              it('should be in the "authenticated" state', () => {
                const expectedState = {
                  type: 'authenticated',
                  publicKeyInfo: {
                    authenticatorAttachment: 'platform',
                    id: 'dummy-public-key-id-2',
                    userHandle: 'dummy-user-handle-2'
                  },
                  tokens: {
                    activatedAt,
                    expiresIn: 30 * 60,
                    accessToken: 'dummy-access-token',
                    idToken: 'dummy-id-token',
                    refreshToken: 'dummy-refresh-token'
                  },
                  userInfo: {}
                }

                expect(authenticatorState.state).toEqual(expectedState)

                const storedState = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY)!)
                expect(storedState).toEqual(expectedState)
              })
            })

            describe('with unauthorized user info retrieval', () => {
              beforeEach(async () => {
                // lets the getCurrentUserInfo return a 401 response
                const apiResponse = wrapFetchResponse(
                  new Response('Unauthorized', { status: 401 }),
                  isUserInfo
                )
                mockResourceApi.getCurrentUserInfo = vi
                  .mocked(mockResourceApi.getCurrentUserInfo)
                  .mockResolvedValue(apiResponse)

                // updates the credentials
                await authenticatorState.updateCredentials({
                  publicKeyInfo: {
                    authenticatorAttachment: 'platform',
                    id: 'dummy-public-key-id-2',
                    userHandle: 'dummy-user-handle-2'
                  },
                  tokens: {
                    activatedAt: Date.now(),
                    expiresIn: 30 * 60,
                    accessToken: 'dummy-access-token',
                    idToken: 'dummy-id-token',
                    refreshToken: 'dummy-refresh-token'
                  }
                })
              })

              afterEach(() => {
                vi.mocked(mockResourceApi.getCurrentUserInfo).mockReset()
              })

              it('should be in the "authenticating" state', () => {
                const expectedState = {
                  type: 'authenticating',
                  publicKeyInfo: {
                    authenticatorAttachment: 'platform',
                    id: 'dummy-public-key-id-2',
                    userHandle: 'dummy-user-handle-2'
                  }
                }

                expect(authenticatorState.state).toEqual(expectedState)

                const storedState = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY)!)
                expect(storedState).toEqual(expectedState)
              })
            })
          })

          describe('with expiring tokens', () => {
            let activatedAt: number

            beforeEach(() => {
              activatedAt = Date.now() - 30 * 60 * 1000 // 30 minutes ago
              authenticatorState.updateCredentials({
                publicKeyInfo: {
                  authenticatorAttachment: 'platform',
                  id: 'dummy-public-key-id-2',
                  userHandle: 'dummy-user-handle-2'
                },
                tokens: {
                  activatedAt,
                  expiresIn: 30 * 60,
                  accessToken: 'dummy-access-token-2',
                  idToken: 'dummy-id-token-2',
                  refreshToken: 'dummy-refresh-token-2'
                }
              })
            })

            it('should be in the "refreshing-tokens" state', () => {
              expect(authenticatorState.state).toEqual({
                type: 'refreshing-tokens',
                publicKeyInfo: {
                  authenticatorAttachment: 'platform',
                  id: 'dummy-public-key-id-2',
                  userHandle: 'dummy-user-handle-2'
                },
                tokens: {
                  activatedAt,
                  expiresIn: 30 * 60,
                  accessToken: 'dummy-access-token-2',
                  idToken: 'dummy-id-token-2',
                  refreshToken: 'dummy-refresh-token-2'
                }
              })
            })
          })
        })
      })

      describe('with sessionStorage containing the "authenticated" state', () => {
        describe('with valid tokens', () => {
          let activatedAt: number
          let authenticatorState: ReturnType<typeof useAuthenticatorState>

          beforeEach(() => {
            activatedAt = Date.now()
            sessionStorage.setItem(
              SESSION_STORAGE_KEY,
              JSON.stringify({
                type: 'authenticated',
                publicKeyInfo: {
                  authenticatorAttachment: 'platform',
                  id: 'dummy-public-key-id',
                  userHandle: 'dummy-user-handle'
                },
                tokens: {
                  activatedAt,
                  expiresIn: 30 * 60,
                  accessToken: 'dummy-access-token',
                  idToken: 'dummy-id-token',
                  refreshToken: 'dummy-refresh-token'
                },
                userInfo: {}
              })
            )
            authenticatorState = useAuthenticatorState()
          })

          afterEach(() => {
            sessionStorage.clear()
          })

          it('should be in the "authenticated" state', () => {
            expect(authenticatorState.state).toEqual({
              type: 'authenticated',
              publicKeyInfo: {
                authenticatorAttachment: 'platform',
                id: 'dummy-public-key-id',
                userHandle: 'dummy-user-handle'
              },
              tokens: {
                activatedAt,
                expiresIn: 30 * 60,
                accessToken: 'dummy-access-token',
                idToken: 'dummy-id-token',
                refreshToken: 'dummy-refresh-token'
              },
              userInfo: {}
            })
          })

          describe('after syncStateWithAccountInfo(no-account)', () => {
            beforeEach(() => {
              authenticatorState.syncStateWithAccountInfo({ type: 'no-account' })
            })

            it('should be in the "welcoming" state with a "corrupted-account-info" error', () => {
              expect(authenticatorState.state.type).toBe('welcoming')
              expect(authenticatorState.lastError?.type).toBe('corrupted-account-info')
            })

            it('should persist the "welcoming" state in sessionStorage', () => {
              const storedState = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY)!)
              expect(storedState.type).toBe('welcoming')
            })
          })

          describe('after syncStateWithAccountInfo(guest)', () => {
            beforeEach(() => {
              authenticatorState.syncStateWithAccountInfo({ type: 'guest' })
            })

            it('should be in the "welcoming" state with a "corrupted-account-info" error', () => {
              expect(authenticatorState.state.type).toBe('welcoming')
              expect(authenticatorState.lastError?.type).toBe('corrupted-account-info')
            })

            it('should persist the "welcoming" state in sessionStorage', () => {
              const storedState = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY)!)
              expect(storedState.type).toBe('welcoming')
            })
          })

          describe('after syncStateWithAccountInfo(online)', () => {
            beforeEach(() => {
              // intentionally gives a different account info
              // but it should not matter to the state
              authenticatorState.syncStateWithAccountInfo({
                type: 'online',
                publicKeyInfo: {
                  authenticatorAttachment: 'platform',
                  id: 'dummy-public-key-id-2',
                  userHandle: 'dummy-user-handle-2'
                },
                tokens: {
                  activatedAt: Date.now() - 30 * 60 * 1000,
                  expiresIn: 30 * 60,
                  accessToken: 'dummy-access-token-2',
                  idToken: 'dummy-id-token-2',
                  refreshToken: 'dummy-refresh-token-2'
                },
                userInfo: {}
              })
            })

            it('should be in the "authenticated" state', () => {
              expect(authenticatorState.state).toEqual({
                type: 'authenticated',
                publicKeyInfo: {
                  authenticatorAttachment: 'platform',
                  id: 'dummy-public-key-id',
                  userHandle: 'dummy-user-handle'
                },
                tokens: {
                  activatedAt,
                  expiresIn: 30 * 60,
                  accessToken: 'dummy-access-token',
                  idToken: 'dummy-id-token',
                  refreshToken: 'dummy-refresh-token'
                },
                userInfo: {}
              })
            })
          })

          it('updateCredentials without tokens should throw', async () => {
            await expect(() => authenticatorState.updateCredentials({
              publicKeyInfo: {
                authenticatorAttachment: 'platform',
                id: 'dummy-public-key-id',
                userHandle: 'dummy-user-handle'
              }
            })).rejects.toThrow()
          })

          it('updateCredentials with tokens should throw', async () => {
            await expect(() => authenticatorState.updateCredentials({
              publicKeyInfo: {
                authenticatorAttachment: 'platform',
                id: 'dummy-public-key-id',
                userHandle: 'dummy-user-handle'
              },
              tokens: {
                activatedAt: Date.now(),
                expiresIn: 30 * 60,
                accessToken: 'dummy-access-token',
                idToken: 'dummy-id-token',
                refreshToken: 'dummy-refresh-token'
              }
            })).rejects.toThrow()
          })
        })

        describe('with expiring tokens', () => {
          let activatedAt: number
          let authenticatorState: ReturnType<typeof useAuthenticatorState>

          beforeEach(() => {
            activatedAt = Date.now() - 30 * 60 * 1000 // 30 minutes ago
            sessionStorage.setItem(
              SESSION_STORAGE_KEY,
              JSON.stringify({
                type: 'authenticated',
                publicKeyInfo: {
                  authenticatorAttachment: 'platform',
                  id: 'dummy-public-key-id',
                  userHandle: 'dummy-user-handle'
                },
                tokens: {
                  activatedAt,
                  expiresIn: 30 * 60,
                  accessToken: 'dummy-access-token',
                  idToken: 'dummy-id-token',
                  refreshToken: 'dummy-refresh-token'
                },
                userInfo: {}
              })
            )
            authenticatorState = useAuthenticatorState()
          })

          afterEach(() => {
            sessionStorage.clear()
          })

          it('should be in the "authenticated" state', () => {
            expect(authenticatorState.state).toEqual({
              type: 'authenticated',
              publicKeyInfo: {
                authenticatorAttachment: 'platform',
                id: 'dummy-public-key-id',
                userHandle: 'dummy-user-handle'
              },
              tokens: {
                activatedAt,
                expiresIn: 30 * 60,
                accessToken: 'dummy-access-token',
                idToken: 'dummy-id-token',
                refreshToken: 'dummy-refresh-token'
              },
              userInfo: {}
            })
          })

          describe('after syncStateWithAccountInfo(online)', () => {
            beforeEach(() => {
              // intentionally gives a different account info
              // but it should not matter to the state
              authenticatorState.syncStateWithAccountInfo({
                type: 'online',
                publicKeyInfo: {
                  authenticatorAttachment: 'platform',
                  id: 'dummy-public-key-id-2',
                  userHandle: 'dummy-user-handle-2'
                },
                tokens: {
                  activatedAt: Date.now(),
                  expiresIn: 30 * 60,
                  accessToken: 'dummy-access-token-2',
                  idToken: 'dummy-id-token-2',
                  refreshToken: 'dummy-refresh-token-2'
                },
                userInfo: {}
              })
            })

            it('should be in the "refreshing-tokens" state', () => {
              expect(authenticatorState.state).toEqual({
                type: 'refreshing-tokens',
                publicKeyInfo: {
                  authenticatorAttachment: 'platform',
                  id: 'dummy-public-key-id',
                  userHandle: 'dummy-user-handle'
                },
                tokens: {
                  activatedAt,
                  expiresIn: 30 * 60,
                  accessToken: 'dummy-access-token',
                  idToken: 'dummy-id-token',
                  refreshToken: 'dummy-refresh-token'
                }
              })
            })

            it('should persist the "refreshing-tokens" state in sessionStorage', () => {
              const storedState = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY)!)
              expect(storedState).toEqual({
                type: 'refreshing-tokens',
                publicKeyInfo: {
                  authenticatorAttachment: 'platform',
                  id: 'dummy-public-key-id',
                  userHandle: 'dummy-user-handle'
                },
                tokens: {
                  activatedAt,
                  expiresIn: 30 * 60,
                  accessToken: 'dummy-access-token',
                  idToken: 'dummy-id-token',
                  refreshToken: 'dummy-refresh-token'
                }
              })
            })
          })
        })
      })

      describe('with sessionStorage containing the "refreshing-tokens" state', () => {
        let activatedAt: number
        let authenticatorState: ReturnType<typeof useAuthenticatorState>

        beforeEach(() => {
          activatedAt = Date.now() - 30 * 60 * 1000 // 30 minutes ago
          sessionStorage.setItem(
            SESSION_STORAGE_KEY,
            JSON.stringify({
              type: 'refreshing-tokens',
              publicKeyInfo: {
                authenticatorAttachment: 'platform',
                id: 'dummy-public-key-id',
                userHandle: 'dummy-user-handle'
              },
              tokens: {
                activatedAt,
                expiresIn: 30 * 60,
                accessToken: 'dummy-access-token',
                idToken: 'dummy-id-token',
                refreshToken: 'dummy-refresh-token'
              }
            })
          )
          authenticatorState = useAuthenticatorState()
        })

        afterEach(() => {
          sessionStorage.clear()
        })

        it('should be in the "refreshing-tokens" state', () => {
          expect(authenticatorState.state).toEqual({
            type: 'refreshing-tokens',
            publicKeyInfo: {
              authenticatorAttachment: 'platform',
              id: 'dummy-public-key-id',
              userHandle: 'dummy-user-handle'
            },
            tokens: {
              activatedAt,
              expiresIn: 30 * 60,
              accessToken: 'dummy-access-token',
              idToken: 'dummy-id-token',
              refreshToken: 'dummy-refresh-token'
            }
          })
        })

        describe('after syncStateWithAccountInfo(no-account)', () => {
          beforeEach(() => {
            authenticatorState.syncStateWithAccountInfo({ type: 'no-account' })
          })

          it('should be in the "welcoming" state with a "corrupted-account-info" error', () => {
            expect(authenticatorState.state.type).toBe('welcoming')
            expect(authenticatorState.lastError?.type).toBe('corrupted-account-info')
          })

          it('should persist the "welcoming" state in sessionStorage', () => {
            const storedState = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY)!)
            expect(storedState.type).toBe('welcoming')
          })
        })

        describe('after syncStateWithAccountInfo(guest)', () => {
          beforeEach(() => {
            authenticatorState.syncStateWithAccountInfo({ type: 'guest' })
          })

          it('should be in the "welcoming" state with a "corrupted-account-info" error', () => {
            expect(authenticatorState.state.type).toBe('welcoming')
            expect(authenticatorState.lastError?.type).toBe('corrupted-account-info')
          })

          it('should persist the "welcoming" state in sessionStorage', () => {
            const storedState = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY)!)
            expect(storedState.type).toBe('welcoming')
          })
        })

        describe('after syncStateWithAccountInfo(online)', () => {
          beforeEach(() => {
            authenticatorState.syncStateWithAccountInfo({
              type: 'online',
              publicKeyInfo: {
                authenticatorAttachment: 'platform',
                id: 'dummy-public-key-id',
                userHandle: 'dummy-user-handle'
              },
              tokens: {
                activatedAt: Date.now(),
                expiresIn: 30 * 60,
                accessToken: 'dummy-access-token',
                idToken: 'dummy-id-token',
                refreshToken: 'dummy-refresh-token'
              },
              userInfo: {}
            })
          })

          it('should be in the "refreshing-tokens" state', () => {
            expect(authenticatorState.state).toEqual({
              type: 'refreshing-tokens',
              publicKeyInfo: {
                authenticatorAttachment: 'platform',
                id: 'dummy-public-key-id',
                userHandle: 'dummy-user-handle'
              },
              tokens: {
                activatedAt,
                expiresIn: 30 * 60,
                accessToken: 'dummy-access-token',
                idToken: 'dummy-id-token',
                refreshToken: 'dummy-refresh-token'
              }
            })
          })
        })

        it('updateCredentials without tokens should throw', async () => {
          await expect(authenticatorState.updateCredentials({
            publicKeyInfo: {
              authenticatorAttachment: 'platform',
              id: 'dummy-public-key-id',
              userHandle: 'dummy-user-handle'
            }
          })).rejects.toThrow()
        })

        it('updateCredentials with tokens should throw', async () => {
          await expect(authenticatorState.updateCredentials({
            publicKeyInfo: {
              authenticatorAttachment: 'platform',
              id: 'dummy-public-key-id',
              userHandle: 'dummy-user-handle'
            },
            tokens: {
              activatedAt: Date.now(),
              expiresIn: 30 * 60,
              accessToken: 'dummy-access-token',
              idToken: 'dummy-id-token',
              refreshToken: 'dummy-refresh-token'
            }
          })).rejects.toThrow()
        })
      })

      describe('with sessionStorage containing an unknown state', () => {
        let authenticatorState: ReturnType<typeof useAuthenticatorState>

        beforeEach(() => {
          sessionStorage.setItem(
            SESSION_STORAGE_KEY,
            JSON.stringify({ type: 'unknown' }),
          )
          authenticatorState = useAuthenticatorState()
        })

        afterEach(() => {
          sessionStorage.clear()
        })

        it('should be in the "loading" state', () => {
          expect(authenticatorState.state.type).toBe('loading')
        })

        // due to the `writeDefaults` option disabled for `useSessionStorage`,
        // the default "loading" state won't be written.
        // the behavior won't matter to the actual app behavior anyway.
        it.skip('should persist the "loading" state in sessionStorage', () => {
          const storedState = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY)!)
          expect(storedState.type).toBe('loading')
        })
      })

      describe('with sessionStorage containing an invalid "authenticating" state', () => {
        let authenticatorState: ReturnType<typeof useAuthenticatorState>

        beforeEach(() => {
          sessionStorage.setItem(
            SESSION_STORAGE_KEY,
            JSON.stringify({
              type: 'authenticating',
              publicKeyInfo: {
                authenticatorAttachment: 'platform',
                // missing `id`
                userHandle: 'dummy-user-handle'
              }
            })
          )
          authenticatorState = useAuthenticatorState()
        })

        afterEach(() => {
          sessionStorage.clear()
        })

        it('should be in the "loading" state', () => {
          expect(authenticatorState.state.type).toBe('loading')
        })

        // due to the `writeDefaults` option disabled for `useSessionStorage` ,
        // the default "loading" state won't be written.
        // the behavior won't matter to the actual app behavior anyway.
        it.skip('should persist the "loading" state in sessionStorage', () => {
          const storedState = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY)!)
          expect(storedState.type).toBe('loading')
        })
      })
    })
  })
})
