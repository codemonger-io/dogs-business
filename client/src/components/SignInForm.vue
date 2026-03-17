<script setup lang="ts">
import { BInput, BLoading, BNotification } from 'buefy'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { PublicKeyInfo } from '@codemonger-io/passquito-client-js'

import IconInfo from '../components/icons/IconInfo.vue'
import { useAuthenticatorState } from '../stores/authenticator-state'
import { usePasskeyCapabilityStore } from '../stores/passkey-capability'
import { usePassquitoClientStore } from '../stores/passquito-client'
import type { SignInReason } from '../types/sign-in-reason'
import { capitalize } from '../utils/strings'

const props = defineProps<{
  // if specified and the user ID is known, an authentication ceremony for the
  // specified user will be performed.
  // otherwise, a discoverable authentication ceremony will be performed.
  publicKeyInfo?: PublicKeyInfo,
  // optional reason for sign-in
  signInReason?: SignInReason
}>()

const emit = defineEmits<{
  // when the authentication ceremony has succeeded
  (e: 'authenticated'): void
}>()

const { t } = useI18n()

const passkeyCapabilityStore = usePasskeyCapabilityStore()

const passquitoClientStore = usePassquitoClientStore()

const authenticatorState = useAuthenticatorState()

const isLoading = ref(true)

// reason for sign-in. `undefined` if no reason is specified.
const reasonForSignIn = computed(() => {
  if (props.signInReason == null) {
    return undefined
  }
  switch (props.signInReason) {
    case 'fresh-sign-up':
      return t('message.sign_in_with_your_new_passkey')
    case 're-authentication':
      return t('message.sign_in_to_reauthenticate')
    default: {
      const unreachable: never = props.signInReason
      throw new RangeError(`unknown sign-in reason: ${unreachable}`)
    }
  }
})

// passkey input field which gets focused when mounted.
const passkeyInput = ref<InstanceType<typeof BInput> | null>(null)

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
    const { abort, credentials, eventEmitter } = userId != null
      ? passquitoClientStore.client.doAuthenticationCeremonyForUser(userId)
      : passquitoClientStore.client.doAuthenticationCeremony()
    abortAuthentication.value = abort
    eventEmitter.addListener((event) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('SignInForm', 'authentication ceremony event', event)
      }
      switch (event) {
        case 'credential-request-options-obtained':
          isLoading.value = false
          passkeyInput.value?.focus()
          break
        case 'credential-provided':
          isLoading.value = true
          break
        default:
          // ignores other events
      }
    })
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
        <div v-if="reasonForSignIn" class="block">
          <b-notification type="is-warning" :closable="false">
            {{ reasonForSignIn }}
          </b-notification>
        </div>
        <div
          v-if="passkeyCapabilityStore.isAuthenticationSupported"
          class="block"
        >
          <b-field>
            <template #label>
              <b-tooltip
                type="is-info"
                :label="t('tooltip.passkey')"
                position="is-top"
                multilined
                :triggers="['click']"
                :auto-close="['inside', 'outside']"
              >
                <span class="icon-text tooltip-trigger-label">
                  {{ capitalize(t('term.passkey')) }}
                  <icon-info></icon-info>
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
    <b-loading :model-value="isLoading"></b-loading>
  </div>
</template>
