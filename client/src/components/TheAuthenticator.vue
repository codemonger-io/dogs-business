<script setup lang="ts">
import { useAuthenticatorState } from '../stores/authenticator-state'
import { AuthenticatorState } from '../types/authenticator-state'
import RegistrationWelcome from './RegistrationWelcome.vue'

const authenticatorState = useAuthenticatorState()
</script>

<template>
  <RegistrationWelcome
    v-if="authenticatorState.state == AuthenticatorState.Welcome"
  />
  <template v-else>
    <slot></slot>
  </template>
</template>
