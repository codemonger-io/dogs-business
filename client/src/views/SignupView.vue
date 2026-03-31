<script setup lang="ts">
import { BField, BInput, BNotification, BSkeleton, BTooltip } from 'buefy'
import { getCurrentInstance, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import IconInfo from '../components/icons/IconInfo.vue'
import ThePasskeys from '../components/ThePasskeys.vue'
import { useAuthenticatorState } from '../stores/authenticator-state'
import { usePasskeyCapabilityStore } from '../stores/passkey-capability'
import { usePassquitoClientStore } from '../stores/passquito-client'
import { capitalize } from '../utils/strings'

const router = useRouter()

const { t } = useI18n()

const passkeyCapabilityStore = usePasskeyCapabilityStore()

const passquitoClientStore = usePassquitoClientStore()

const authenticatorState = useAuthenticatorState()

const self = getCurrentInstance()
if (self == null) {
  throw new Error('setup is called without current active component instance')
}

const username = ref('')
const displayName = ref('')

// checks the passkey capability on mounted
onMounted(() => {
  passkeyCapabilityStore.askForCapabilities()
})

// attaches an authenticator UI to the account manager on mounted
// and detaches it when the component is unmounted
const detachAuthenticatorUi = ref<() => void>()
onMounted(() => {
  detachAuthenticatorUi.value = authenticatorState.attachAuthenticatorUi({
    // will be called after the user successfully signs up
    askSignIn: async () => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('SignupView', 'asking user to sign in')
      }
      // why not navigate to "sign-in" (`SigninView`)?
      // because `SigninView` starts a *discoverable* authentication ceremony
      // while users would expect to sign in with the public key that they
      // created just now.
      window.location.href = router.resolve({ name: 'map' }).href
    }
  })
})
onUnmounted(() => {
  detachAuthenticatorUi.value?.()
})

const onSubmit = async () => {
  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log('SignupView', 'signing up')
    }
    const publicKeyInfo = await passquitoClientStore.client.doRegistrationCeremony({
      username: username.value,
      displayName: displayName.value
    })
    if (process.env.NODE_ENV !== 'production') {
      console.log('SignupView', 'finished registration', publicKeyInfo)
    }
    await authenticatorState.updateCredentials({
      publicKeyInfo,
      isNewPublicKey: true
    })
  } catch (err) {
    console.error(err)
  }
}

const showWhatIsPasskey = () => {
  if (self.proxy == null) {
    throw new Error('no instance proxy exists')
  }
  // @ts-ignore
  self.proxy.$buefy.modal.open({
    component: ThePasskeys,
    customClass: 'is-full-screen-mobile'
  })
}
</script>

<template>
  <div class="container is-max-desktop">
    <div class="box welcome-box paper">
      <section class="section">
        <h1 class="title is-3">{{ t('term.signup') }}</h1>
        <div class="block">
          <b-notification type="is-warning" :closable="false">
            <i18n-t keypath="message.we_wont_rely_on_passwords">
              <template #passkeys>
                <a href="#" @click.prevent="showWhatIsPasskey">
                  {{ t('term.passkey', 2) }}
                </a>
              </template>
            </i18n-t>
          </b-notification>
        </div>
        <div
          v-if="passkeyCapabilityStore.isRegistrationSupported"
          class="block"
        >
          <form @submit.prevent="onSubmit">
            <b-field>
              <template #label>
                <b-tooltip
                  type="is-info"
                  :label="t('tooltip.username')"
                  position="is-top"
                  multilined
                  :triggers="['click']"
                  :auto-close="['inside', 'outside']"
                >
                  <span class="icon-text tooltip-trigger-label">
                    {{ capitalize(t('term.username')) }}
                    <icon-info></icon-info>
                  </span>
                </b-tooltip>
              </template>
              <b-input
                v-model="username"
                :placeholder="t('placeholder.username')"
              >
              </b-input>
            </b-field>
            <b-field>
              <template #label>
                <b-tooltip
                  type="is-info"
                  :label="t('tooltip.display_name')"
                  position="is-top"
                  multilined
                  :triggers="['click']"
                  :auto-close="['inside', 'outside']"
                >
                  <span class="icon-text tooltip-trigger-label">
                    {{ capitalize(t('term.display_name')) }}
                    <icon-info></icon-info>
                  </span>
                </b-tooltip>
              </template>
              <b-input
                v-model="displayName"
                :placeholder="t('placeholder.display_name')"
              >
              </b-input>
            </b-field>
            <p class="block is-flex is-justify-content-center">
              <input
                type="submit"
                class="button is-primary"
                :value="t('message.sign_up')"
              >
            </p>
          </form>
        </div>
        <div v-else-if="passkeyCapabilityStore.isIndeterminate">
          <b-notification type="is-info" :closable="false">
            {{ t('message.checking_passkey_registration_capability') }}
            <b-skeleton active />
          </b-notification>
        </div>
        <div v-else>
          <b-notification type="is-danger" :closable="false">
            <i18n-t keypath="message.no_passkey_registration_supported">
              <a href="#" @click.prevent="showWhatIsPasskey">
                {{ t('term.passkey', 2) }}
              </a>
            </i18n-t>
          </b-notification>
        </div>
      </section>
    </div>
  </div>
</template>
