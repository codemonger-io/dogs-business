<script setup lang="ts">
import { BInput } from 'buefy'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PublicKeyInfo } from '@codemonger-io/passquito-client-js'

import { useAuthenticatorState } from '../stores/authenticator-state'
import { usePasskeyCapabilityStore } from '../stores/passkey-capability'
import { usePassquitoClientStore } from '../stores/passquito-client'
import { capitalize } from '../utils/strings'

const props = defineProps<{
  // if specified and the user ID is known, an authentication ceremony for the
  // specified user will be performed.
  // otherwise, a discoverable authentication ceremony will be performed.
  publicKeyInfo?: PublicKeyInfo
}>()

const emit = defineEmits<{
  // when the authentication ceremony has succeeded
  (e: 'authenticated'): void
}>()

const { t } = useI18n()

const passkeyCapabilityStore = usePasskeyCapabilityStore()

const passquitoClientStore = usePassquitoClientStore()

const authenticatorState = useAuthenticatorState()

// passkey input field which gets focused when mounted.
const passkeyInput = ref<InstanceType<typeof BInput> | null>(null)
watch(passkeyInput, (input) => {
  if (input) {
    input.focus()
  }
})

// checks the passkey capabilities on mounted
onMounted(() => {
  passkeyCapabilityStore.askForCapabilities()
})

// performs an authentication ceremony if passkeys are supported.
const abortAuthentication = ref<(message: string) => void>(() => {})
watch(
  () => passkeyCapabilityStore.isAuthenticationSupported,
  async (isSupported) => {
    if (!isSupported) {
      if (!passkeyCapabilityStore.isIndeterminate) {
        console.error('SignInForm', 'passkeys are not supported on this device')
      }
      return
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log('SignInForm', 'starting authentication ceremony')
    }
    // aborts the authentication ceremony that might be running
    abortAuthentication.value('starting new authentication ceremony')
    const userId = props.publicKeyInfo?.userHandle
    const { abort, credentials } = userId != null
      ? passquitoClientStore.client.doAuthenticationCeremonyForUser(userId)
      : passquitoClientStore.client.doAuthenticationCeremony()
    abortAuthentication.value = abort
    try {
      const { publicKeyInfo, tokens } = await credentials
      if (process.env.NODE_ENV !== 'production') {
        console.log('SignInForm', 'authenticated', publicKeyInfo, tokens)
      }
      authenticatorState.updateCredentials({
        publicKeyInfo,
        tokens
      })
      emit('authenticated')
    } catch (err) {
      // TODO: check error causes
      console.error('SignInForm', 'authentication failed', err)
    }
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  abortAuthentication.value('leaving sign-in form')
})
</script>

<template>
  <div class="container is-max-desktop">
    <div class="box welcome-box paper">
      <section class="section">
        <h1 class="title is-3">{{ t('term.signin') }}</h1>
        <div
          v-if="passkeyCapabilityStore.isAuthenticationSupported"
          class="block"
        >
          <b-field label-position="on-border">
            <template #label>
              <b-tooltip
                type="is-info"
                :label="t('tooltip.passkey')"
                append-to-body
              >
                <span class="is-inline-block">
                  {{ capitalize(t('term.passkey')) }}
                </span>
              </b-tooltip>
            </template>
            <b-input
              ref="passkeyInput"
              autocomplete="username webauthn"
              :placeholder="t('placeholder.passkey')"
            >
            </b-input>
          </b-field>
        </div>
        <div v-else-if="passkeyCapabilityStore.isIndeterminate">
          indeterminate
        </div>
        <div v-else>
          passkey not supported
        </div>
      </section>
    </div>
  </div>
</template>
