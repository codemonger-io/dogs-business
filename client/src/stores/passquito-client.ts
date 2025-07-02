import { defineStore } from 'pinia'
import { ref } from 'vue'

import {
  CredentialsApiImpl,
  PassquitoClient
} from '@codemonger-io/passquito-client-js'

/**
 * Manages the singleton `PassquitoClient` instance.
 *
 * @remarks
 *
 * Requires the `VITE_CREDENTIALS_API_BASE_URL` environment variable to be set.
 */
export const usePassquitoClientStore = defineStore('passquito-client', () => {
  const credentialsApi = new CredentialsApiImpl(import.meta.env.VITE_CREDENTIALS_API_BASE_URL)

  const client = ref(new PassquitoClient(credentialsApi))

  return {
    client
  }
})
