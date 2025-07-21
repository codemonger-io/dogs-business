import { defineStore } from 'pinia'
import { ref } from 'vue'

import { CredentialsApiImpl } from '@codemonger-io/passquito-client-js'

/**
 * Manages the signleton `CredentialsApi` instance.
 *
 * @remarks
 *
 * Requires the `VITE_CREDENTIALS_API_BASE_URL` environment variable to be set.
 *
 * @beta
 */
export const useCredentialsApi = defineStore('credentials-api', () => {
  const api = ref(new CredentialsApiImpl(import.meta.env.VITE_CREDENTIALS_API_BASE_URL))

  const refreshTokens = (refreshToken: string) => {
    return api.value.refreshTokens(refreshToken)
  }

  return {
    api,
    refreshTokens
  }
})
