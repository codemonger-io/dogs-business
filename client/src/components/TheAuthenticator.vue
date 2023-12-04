<script setup lang="ts">
import { useAuthenticatorState } from '../stores/authenticator-state'
import { AuthenticatorState } from '../types/authenticator-state'
import AuthenticatorWelcome from './AuthenticatorWelcome.vue'

const authenticatorState = useAuthenticatorState()
</script>

<template>
  <AuthenticatorWelcome
    v-if="authenticatorState.state == AuthenticatorState.Welcome"
  />
  <template v-else>
    <slot></slot>
  </template>
</template>
