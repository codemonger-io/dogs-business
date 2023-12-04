<script setup lang="ts">
import { getCurrentInstance } from 'vue'
import { useI18n } from 'vue-i18n'

import ThePrivacyPolicy from './ThePrivacyPolicy.vue'
import TheTermsOfService from './TheTermsOfService.vue'

const { t } = useI18n()

const self = getCurrentInstance()
console.log('AuthenticatorWelcome.getCurrentInstance()', self)

const showTermsOfService = () => {
  self.proxy.$buefy.modal.open({
    component: TheTermsOfService
  })
}

const showPrivacyPolicy = () => {
  self.proxy.$buefy.modal.open({
    component: ThePrivacyPolicy
  })
}
</script>

<template>
  <div class="container is-max-desktop paper">
    <section class="section">
      <h1 class="title is-3">{{ t('message.sign_up_now') }}</h1>
      <p>
        <b-checkbox>
          <i18n-t keypath="message.agreement">
            <a href="#" @click="showTermsOfService">{{ t('term.terms_of_service') }}</a>
            <a href="#" @click="showPrivacyPolicy">{{ t('term.privacy_policy') }}</a>
          </i18n-t>
        </b-checkbox>
      </p>
      <p>
        <b-button class="is-primary">{{ t('message.sign_up') }}</b-button>
      </p>
    </section>
    <section class="section">
      <p>{{ t('message.may_start_without_signup') }}</p>
      <p>
        <b-button class="is-primary">{{ t('message.start_without_signup') }}</b-button>
      </p>
    </section>
  </div>
</template>

<style scoped>
.container {
  min-height: 100vh;
  box-shadow: 0px 0px 100px 1px rgba(0, 0, 0, 0.3);
}

.section {
  & p {
    margin-top: 1em;
    margin-bottom: 1em;
  }
}
</style>
