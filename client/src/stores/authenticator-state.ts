import { defineStore } from 'pinia'
import { ref } from 'vue'

import { AuthenticatorState } from '../types/authenticator-state'

export const useAuthenticatorState = defineStore('authenticatorState', () => {
  const state = ref<AuthenticatorState>(AuthenticatorState.Welcome)

  return { state }
})
