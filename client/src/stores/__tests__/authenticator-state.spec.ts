import { setActivePinia, createPinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, nextTick } from 'vue'

import { ResourceApiProvider } from '@/providers/resource-api'
import { useAuthenticatorState } from '@/stores/authenticator-state'
import type { AuthenticatorUi } from '@/stores/authenticator-state'

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
      beforeEach(() => {
        const pinia = createPinia()
        app.use(pinia)
        app.use(new ResourceApiProvider({
          getCurrentUserInfo: vi.fn()
        }))
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
            authenticatorState.syncStateWithAccountInfo({
              type: 'guest',
              mapboxAccessToken: 'dummy-mapbox-access-token'
            })
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
          // TODO: mock the Dog's Business Resource API
          describe.skip('with valid tokens', () => {
            describe('with successful user info retrieval', () => {
            })

            describe('with unauthorized user info retrieval', () => {
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
                userInfo: {
                  mapboxAccessToken: 'dummy-mapbox-access-token'
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
          // TODO: mock the Dog's Business Resource API
          describe.skip('with valid tokens', () => {
            describe('with successful user info retrieval', () => {
              it('should be in the "authenticated" state', () => {
                throw new Error('not yet implemented')
              })
            })

            describe('with unauthorized user info retrieval', () => {
              it('should be in the "authenticating" state', () => {
                throw new Error('not yet implemented')
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
            authenticatorState.syncStateWithAccountInfo({
              type: 'guest',
              mapboxAccessToken: 'dummy-mapbox-access-token'
            })
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
          // TODO: mock the Dog's Business Resource API
          describe.skip('with valid tokens', () => {
            describe('with successful user info retrieval', () => {
            })

            describe('with unauthorized user info retrieval', () => {
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
                userInfo: {
                  mapboxAccessToken: 'dummy-mapbox-access-token'
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
          // TODO: mock the Dog's Business Resource API
          describe.skip('with valid tokens', () => {
            describe('with successful user info retrieval', () => {
              it('should be in the "authenticated" state', () => {
                throw new Error('not yet implemented')
              })

              it('should persist the "authenticated" state in sessionStorage', () => {
                throw new Error('not yet implemented')
              })
            })

            describe('with unauthorized user info retrieval', () => {
              it('should be in the "authenticating" state', () => {
                throw new Error('not yet implemented')
              })

              it('should persist the "authenticating" state in sessionStorage', () => {
                throw new Error('not yet implemented')
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
            authenticatorState.syncStateWithAccountInfo({
              type: 'guest',
              mapboxAccessToken: 'dummy-mapbox-access-token'
            })
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
              userInfo: {
                mapboxAccessToken: 'dummy-mapbox-access-token'
              }
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
            authenticatorState.syncStateWithAccountInfo({
              type: 'guest',
              mapboxAccessToken: 'dummy-mapbox-access-token'
            })
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
              userInfo: {
                mapboxAccessToken: 'dummy-mapbox-access-token'
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
        })

        describe('after updateCredentials without tokens', () => {
          // TODO: introduce the "discovering" state
          it.skip('should be in the "discovering" state', () => {
            throw new Error('not yet implemented')
          })
        })

        describe('after updateCredentials with tokens', () => {
          // TODO: mock the Dog's Business Resource API
          describe.skip('with valid tokens', () => {
            describe('with successful user info retrieval', () => {
            })

            describe('with unauthorized user info retrieval', () => {
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
                userInfo: {
                  mapboxAccessToken: 'dummy-mapbox-access-token'
                }
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
              userInfo: {
                mapboxAccessToken: 'dummy-mapbox-access-token'
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
              authenticatorState.syncStateWithAccountInfo({
                type: 'guest',
                mapboxAccessToken: 'dummy-mapbox-access-token'
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
                  activatedAt,
                  expiresIn: 30 * 60,
                  accessToken: 'dummy-access-token',
                  idToken: 'dummy-id-token',
                  refreshToken: 'dummy-refresh-token'
                },
                userInfo: {
                  mapboxAccessToken: 'dummy-mapbox-access-token'
                }
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
                userInfo: {
                  mapboxAccessToken: 'dummy-mapbox-access-token'
                }
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
                userInfo: {
                  mapboxAccessToken: 'dummy-mapbox-access-token'
                }
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
              userInfo: {
                mapboxAccessToken: 'dummy-mapbox-access-token'
              }
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
                  activatedAt,
                  expiresIn: 30 * 60,
                  accessToken: 'dummy-access-token',
                  idToken: 'dummy-id-token',
                  refreshToken: 'dummy-refresh-token'
                },
                userInfo: {
                  mapboxAccessToken: 'dummy-mapbox-access-token'
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
            authenticatorState.syncStateWithAccountInfo({
              type: 'guest',
              mapboxAccessToken: 'dummy-mapbox-access-token'
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
              userInfo: {
                mapboxAccessToken: 'dummy-mapbox-access-token'
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
