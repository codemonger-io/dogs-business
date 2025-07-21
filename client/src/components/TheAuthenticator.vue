<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { useAccountManager } from '../stores/account-manager'
import type { AuthenticatorState } from '../types/authenticator-state'
import RegistrationWelcome from './RegistrationWelcome.vue'
import SignInForm from './SignInForm.vue'

const accountManager = useAccountManager()

const authenticatorState = computed(() => accountManager.authenticatorState)

// attaches the authenticator UI to the account manager on mounted
// and detaches it when the component is unmounted
const detachAuthenticatorUi = ref<() => void>()
onMounted(() => {
  detachAuthenticatorUi.value = accountManager.attachAuthenticatorUi({
    askSignIn: () => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('TheAuthenticator', 'asking the user to sign in')
      }
      // reloads the page to show a fresh sign-in form
      // as Safari has some weird constraints on passkey authentication
      // to avoid infinite reloading, it appends a "signin=true" query parameter
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
  <RegistrationWelcome v-if="authenticatorState.type === 'welcoming'" />
  <SignInForm
    v-else-if="authenticatorState.type === 'authenticating'"
    :publicKeyInfo="authenticatorState.publicKeyInfo"
  />
  <div v-else-if="authenticatorState.type === 'authenticated'">
    Authenticated!
  </div>
  <template v-else>
    <slot></slot>
  </template>
</template>
