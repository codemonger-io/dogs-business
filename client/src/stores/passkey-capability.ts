import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import {
  checkPasskeyAuthenticationSupported,
  checkPasskeyRegistrationSupported
} from '@codemonger-io/passquito-client-js'

type State = 'not-asked' | 'asking' | 'asked'

export const usePasskeyCapabilityStore = defineStore('passkey-capability', () => {
  const _state = ref<State>('not-asked')

  const isIndeterminate =
    computed(() => _state.value === 'not-asked' || _state.value === 'asking')

  const isRegistrationSupported = ref(false)
  const isAuthenticationSupported = ref(false)

  // asks for passkey capabilities.
  // does nothing if capabilities are already known.
  // TODO: option to ask for capabilities again?
  const askForCapabilities = async () => {
    switch (_state.value) {
      case 'asking':
        console.log('already asking for passkey capabilities')
        break
      case 'asked':
        console.log('already asked for passkey capabilities')
        break
      case 'not-asked': {
        console.log('starting to ask for passkey capabilities')
        _state.value = 'asking'
        isRegistrationSupported.value = false
        isAuthenticationSupported.value = false
        try {
          isRegistrationSupported.value = await checkPasskeyRegistrationSupported()
        } catch (err) {
          console.error(
            'usePasskeyCapabilityStore',
            'failed to ask registration capability',
            err
          )
        }
        try {
          isAuthenticationSupported.value = await checkPasskeyAuthenticationSupported()
        } catch (err) {
          console.error(
            'usePasskeyCapabilityStore',
            'failed to ask authentication capability',
            err
          )
        }
        _state.value = 'asked'
        break
      }
      default: {
        // exhaustive check
        const neverState: never = _state.value
        throw new Error('unhandled passkey capability store state: ' + neverState)
      }
    }
  }

  return {
    _state,
    askForCapabilities,
    isAuthenticationSupported,
    isIndeterminate,
    isRegistrationSupported,
  }
})
