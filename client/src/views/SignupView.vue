<script setup lang="ts">
import { getCurrentInstance, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import ThePasskeys from '../components/ThePasskeys.vue'
import { usePasskeyCapabilityStore } from '../stores/passkey-capability'
import { usePassquitoClientStore } from '../stores/passquito-client'
import { capitalize } from '../utils/strings'

const { t } = useI18n()

const passkeyCapabilityStore = usePasskeyCapabilityStore()

const passquitoClientStore = usePassquitoClientStore()

const self = getCurrentInstance()
if (self == null) {
  throw new Error('setup is called without current active component instance')
}

const username = ref('')
const displayName = ref('')

onMounted(() => {
  passkeyCapabilityStore.askForCapabilities()
})

const onSubmit = async () => {
  try {
    console.log('signing up')
    await passquitoClientStore.client.doRegistrationCeremony({
      username: username.value,
      displayName: displayName.value
    })
    console.log('finished registration')
  } catch (err) {
    console.error(err)
  }
}

const showWhatArePasskeys = () => {
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
              <a href="#" @click.prevent="showWhatArePasskeys">
                {{ t('term.passkey', 2) }}
              </a>
            </i18n-t>
          </b-notification>
        </div>
        <div
          v-if="passkeyCapabilityStore.isRegistrationSupported"
          class="block"
        >
          <form @submit.prevent="onSubmit">
            <b-field label-position="on-border">
              <template #label>
                <b-tooltip
                  type="is-info"
                  :label="t('tooltip.username')"
                  append-to-body
                >
                  <span class="is-inline-block">
                    {{ capitalize(t('term.username')) }}
                  </span>
                </b-tooltip>
              </template>
              <b-input
                v-model="username"
                :placeholder="t('placeholder.username')"
              >
              </b-input>
            </b-field>
            <b-field label-position="on-border">
              <template #label>
                <b-tooltip
                  type="is-info"
                  :label="t('tooltip.display_name')"
                  append-to-body
                >
                  <span class="is-inline-block">
                    {{ capitalize(t('term.display_name')) }}
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
              <a href="#" @click.prevent="showWhatArePasskeys">
                {{ t('term.passkey', 2) }}
              </a>
            </i18n-t>
          </b-notification>
        </div>
      </section>
    </div>
  </div>
</template>
