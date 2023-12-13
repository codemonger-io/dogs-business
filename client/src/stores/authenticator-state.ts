import { defineStore } from 'pinia'
import { computed } from 'vue'

import { AuthenticatorState } from '../types/authenticator-state'
import { useAccountManager } from './account-manager'

export const useAuthenticatorState = defineStore('authenticatorState', () => {
  const accountManager = useAccountManager()

  const state = computed(() => {
    console.log('updating authenticator state', accountManager.accountInfo)
    if (accountManager.accountInfo == null) {
      return AuthenticatorState.Loading
    }
    switch (accountManager.accountInfo.type) {
      case 'no-account':
        return AuthenticatorState.Welcome
      case 'guest':
        return AuthenticatorState.Guest
      default: {
        // exhaustive cases must not lead here
        const unreachable: never = accountManager.accountInfo
        throw new RangeError(`unknown account info: ${unreachable}`)
      }
    }
  })

  return { state }
})
