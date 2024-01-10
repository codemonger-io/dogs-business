<script setup lang="ts">
import { getCurrentInstance, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import ThePrivacyPolicy from '../components/ThePrivacyPolicy.vue'
import TheTermsOfService from '../components/TheTermsOfService.vue'
import { useAccountManager } from '../stores/account-manager'

const { t } = useI18n()

const router = useRouter()

const { createGuestAccount } = useAccountManager()

const self = getCurrentInstance()
if (self == null) {
  throw new Error('setup is called without current active component instance')
}

const isAgreementChecked = ref(false)

const showTermsOfService = () => {
  if (self.proxy == null) {
    throw new Error('no insance proxy exists')
  }
  // @ts-ignore
  self.proxy.$buefy.modal.open({
    component: TheTermsOfService,
    customClass: 'is-full-screen-mobile'
  })
}

const showPrivacyPolicy = () => {
  if (self.proxy == null) {
    throw new Error('no instance proxy exists')
  }
  // @ts-ignore
  self.proxy.$buefy.modal.open({
    component: ThePrivacyPolicy,
    customClass: 'is-full-screen-mobile'
  })
}

const createGuestAccountAndGo = async () => {
  try {
    if (process.env.NODE_ENV !== 'production') {
      console.log('creating guest account')
    }
    await createGuestAccount()
    router.push({ name: 'profile' })
  } catch (err) {
    console.error('failed to create guest account', err)
  }
}
</script>

<template>
  <div class="container is-max-desktop">
    <div class="box welcome-box paper">
      <section class="section">
        <h1 class="title is-3">{{ t('message.start_without_signup') }}</h1>
        <p class="block">
          <b-checkbox v-model="isAgreementChecked">
            <i18n-t keypath="message.agreement">
              <a href="#" @click.prevent="showTermsOfService">
                {{ t('term.terms_of_service') }}
              </a>
              <a href="#" @click.prevent="showPrivacyPolicy">
                {{ t('term.privacy_policy') }}
              </a>
            </i18n-t>
          </b-checkbox>
        </p>
        <b-notification type="is-warning" :closable="false">
          {{ t('message.remarks_on_without_signup') }}
        </b-notification>
        <p class="block is-flex is-justify-content-center">
          <b-button
            type="is-primary"
            :disabled="!isAgreementChecked || undefined"
            @click="createGuestAccountAndGo"
          >
            {{ t('message.get_started') }}
          </b-button>
        </p>
      </section>
    </div>
  </div>
</template>
