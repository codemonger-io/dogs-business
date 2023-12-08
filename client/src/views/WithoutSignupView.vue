<script setup lang="ts">
import { getCurrentInstance, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import ThePrivacyPolicy from '../components/ThePrivacyPolicy.vue'
import TheTermsOfService from '../components/TheTermsOfService.vue'

const { t } = useI18n()

const self = getCurrentInstance()

const isAgreementChecked = ref(false)

const showTermsOfService = () => {
  self.proxy.$buefy.modal.open({
    component: TheTermsOfService,
    customClass: 'is-full-screen-mobile'
  })
}

const showPrivacyPolicy = () => {
  self.proxy.$buefy.modal.open({
    component: ThePrivacyPolicy,
    customClass: 'is-full-screen-mobile'
  })
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
              <a href="#" @click="showTermsOfService">{{ t('term.terms_of_service') }}</a>
              <a href="#" @click="showPrivacyPolicy">{{ t('term.privacy_policy') }}</a>
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
          >
            {{ t('message.get_started') }}
          </b-button>
        </p>
      </section>
    </div>
  </div>
</template>
