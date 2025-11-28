<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

import { useAuthenticatorState } from '../stores/authenticator-state'
import RegistrationWelcome from './RegistrationWelcome.vue'
import SignInForm from './SignInForm.vue'

const authenticatorState = useAuthenticatorState()

// attaches the authenticator UI to the account manager on mounted
// and detaches it when the component is unmounted
const detachAuthenticatorUi = ref<() => void>()
onMounted(() => {
  detachAuthenticatorUi.value = authenticatorState.attachAuthenticatorUi({
    askSignIn: () => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('TheAuthenticator', 'asking the user to sign in')
      }
      // reloads the page to show a fresh sign-in form
      // as Safari has some weird constraints on passkey authentication.
      // appends a "signin=true" query parameter to avoid infinite reloading
      const SIGN_IN_QUERY_PARAM = 'signin'
      const params = new URLSearchParams(window.location.search)
      if (params.get(SIGN_IN_QUERY_PARAM) !== 'true') {
        if (process.env.NODE_ENV !== 'production') {
          console.log('TheAuthenticator', 'reloading the sign-in form')
        }
        params.set(SIGN_IN_QUERY_PARAM, 'true')
        window.location.search = params.toString()
      } else {
        if (process.env.NODE_ENV !== 'production') {
          console.log('TheAuthentictor', 'showing the sign-in form')
        }
      }
    }
  })
})
onBeforeUnmount(() => {
  detachAuthenticatorUi.value?.()
})
</script>

<template>
  <div v-if="authenticatorState.state.type === 'loading'">
    Loading...
  </div>
  <RegistrationWelcome v-else-if="authenticatorState.state.type === 'welcoming'" />
  <SignInForm
    v-else-if="authenticatorState.state.type === 'authenticating'"
    :publicKeyInfo="authenticatorState.state.publicKeyInfo"
  />
  <template v-else>
    <slot></slot>
  </template>
</template>
