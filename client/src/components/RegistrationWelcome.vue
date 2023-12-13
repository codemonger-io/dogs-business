<script setup lang="ts">
import { getCurrentInstance, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'

import TheFunctionalities from './TheFunctionalities.vue'
import ThePrivacyPolicy from './ThePrivacyPolicy.vue'
import TheTermsOfService from './TheTermsOfService.vue'

const { t } = useI18n()

const self = getCurrentInstance()
if (self == null) {
  throw new Error('setup is called without current active component instance')
}

const isAgreementChecked = ref(false);

const showTermsOfService = () => {
  if (self.proxy == null) {
    throw new Error('no proxy instance exists')
  }
  self.proxy.$buefy.modal.open({
    component: TheTermsOfService,
    customClass: 'is-full-screen-mobile'
  })
}

const showPrivacyPolicy = () => {
  if (self.proxy == null) {
    throw new Error('no proxy instance exists')
  }
  self.proxy.$buefy.modal.open({
    component: ThePrivacyPolicy,
    customClass: 'is-full-screen-mobile'
  })
}

const showFunctionalities = () => {
  if (self.proxy == null) {
    throw new Error('no proxy instance exists')
  }
  self.proxy.$buefy.modal.open({
    component: TheFunctionalities,
    customClass: 'is-full-screen-mobile'
  })
}
</script>

<template>
  <div class="container is-max-desktop">
    <div class="box welcome-box paper">
      <section class="section">
        <h1 class="title is-3">{{ t('message.sign_up_now') }}</h1>
        <p class="block">
          <b-checkbox v-model="isAgreementChecked">
            <i18n-t keypath="message.agreement">
              <a href="#" @click="showTermsOfService">{{ t('term.terms_of_service') }}</a>
              <a href="#" @click="showPrivacyPolicy">{{ t('term.privacy_policy') }}</a>
            </i18n-t>
          </b-checkbox>
        </p>
        <p class="block is-flex is-justify-content-center">
          <RouterLink
            :to="{ name: 'sign-up' }"
            custom
            v-slot="{ href, navigate }"
          >
            <b-button
              type="is-primary"
              @click="navigate"
              :disabled="!isAgreementChecked || undefined"
            >
              {{ t('message.sign_up') }}
            </b-button>
          </RouterLink>
        </p>
      </section>
      <section class="section">
        <p class="block">
          {{ t('message.may_start_without_signup') }}
          <i18n-t keypath="message.functionalities_are_restricted">
            <a href="#" @click="showFunctionalities">{{ t('term.functionality', 2) }}</a>
          </i18n-t>
        </p>
        <p class="block is-flex is-justify-content-center">
          <RouterLink
            :to="{ name: 'wo-sign-up' }"
            custom
            v-slot="{ href, navigate }"
          >
            <b-button type="is-primary" @click="navigate">
              {{ t('message.start_without_signup') }}
            </b-button>
          </RouterLink>
        </p>
      </section>
    </div>
  </div>
</template>
