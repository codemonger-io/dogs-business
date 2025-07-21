/*
import { defineStore } from 'pinia'
import { watch } from 'vue'
import { useSessionStorage } from '@vueuse/core'

import { makeValidatingSerializer } from '../lib/storage-serializer'
import { isAuthenticatorState } from '../types/authenticator-state'
import { useAccountManager } from './account-manager'

export const useAuthenticatorState = defineStore('authenticatorState', () => {
  const accountManager = useAccountManager()

  const state = useSessionStorage(
    'dogs-business.authenticator-state',
    { type: 'loading' }, // loading by default
    {
      writeDefaults: false,
      serializer: makeValidatingSerializer(isAuthenticatorState)
    }
  )

  watch(
    () => accountManager.accountInfo,
    (accountInfo) => {
      switch (accountInfo.type) {
        case 'no-account':
          state.value = { type: 'welcoming' }
          break
        case 'guest':
          state.value = { type: 'guest' }
          break
        case 'online': {
          // TODO: can we really determine the state from the account info?
          // if so, why do we have this store in the first place?
          if (process.env.NODE_ENV !== 'production') {
            console.log('useAuthenticatorState', 'authenticating online account')
          }
          // assumes the user has been authenticated if tokens are present
          if (accountInfo.tokens != null) {
            // TODO: should we check the expiration of the tokens here?
            // assumes the user has authorized if the user info is present
            if (accountInfo.userInfo != null) {
              state.value = { type: 'authorized' }
            } else {
              state.value = {
                type: 'authenticated',
                tokens: accountInfo.tokens
              }
            }
          } else {
            // the user is identified, but not authenticated yet
            state.value = {
              type: 'authenticating',
              publicKeyInfo: accountInfo.publicKeyInfo
            }
          }
          break
        }
        default: {
          // exhaustive cases must not lead here
          const unreachable: never = accountInfo
          throw new RangeError(`unknown account info: ${unreachable}`)
        }
      }
    },
    {
      immediate: true,
      deep: true
    }
  )

  return { state }
}) */
