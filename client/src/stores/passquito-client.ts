import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  CredentialsApiImpl,
  PassquitoClient
} from '@codemonger-io/passquito-client-js'

import { useCredentialsApi } from './credentials-api'

/**
 * Manages the singleton `PassquitoClient` instance.
 *
 * @remarks
 *
 * Requires the `VITE_CREDENTIALS_API_BASE_URL` environment variable to be set.
 */
export const usePassquitoClientStore = defineStore('passquito-client', () => {
  const credentialsApi = useCredentialsApi()

  const client = ref(new PassquitoClient(credentialsApi.api))

  return {
    client
  }
})
