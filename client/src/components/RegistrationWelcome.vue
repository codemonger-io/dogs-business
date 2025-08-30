<script setup lang="ts">
import { getCurrentInstance, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink, useRouter } from 'vue-router'

import TheDogsBusinessLogo from './TheDogsBusinessLogo.vue'
import TheFunctionalities from './TheFunctionalities.vue'
import ThePrivacyPolicy from './ThePrivacyPolicy.vue'
import TheTermsOfService from './TheTermsOfService.vue'

const { t } = useI18n()

const router = useRouter()

const self = getCurrentInstance()
if (self == null) {
  throw new Error('setup is called without current active component instance')
}

const isAgreementChecked = ref(false);

const showTermsOfService = () => {
  if (self.proxy == null) {
    throw new Error('no proxy instance exists')
  }
  // @ts-ignore
  self.proxy.$buefy.modal.open({
    component: TheTermsOfService,
    customClass: 'is-full-screen-mobile',
    onCancel: () => scrollToContents('instant')
  })
}

const showPrivacyPolicy = () => {
  if (self.proxy == null) {
    throw new Error('no proxy instance exists')
  }
  // @ts-ignore
  self.proxy.$buefy.modal.open({
    component: ThePrivacyPolicy,
    customClass: 'is-full-screen-mobile',
    onCancel: () => scrollToContents('instant')
  })
}

const showFunctionalities = () => {
  if (self.proxy == null) {
    throw new Error('no proxy instance exists')
  }
  // @ts-ignore
  self.proxy.$buefy.modal.open({
    component: TheFunctionalities,
    customClass: 'is-full-screen-mobile',
    onCancel: () => scrollToContents('instant')
  })
}

const signIn = () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('signing in')
  }
  // opens a fresh sign-in page
  // as Safari has some weird constraints on passkey authentication.
  window.location.href = router.resolve({ name: 'sign-in' }).href
}

// scrolls to the contents after 1 second
const contentsRef = ref<HTMLElement | null>(null)
const scrollToContents = (behavior: ScrollBehavior) => {
  if (contentsRef.value != null) {
    window.scrollTo({
      top: contentsRef.value.offsetTop,
      behavior,
    })
  } else {
    console.warn('RegistrationWelcome', 'contents is not mounted')
  }
}
onMounted(() => {
  setTimeout(() => {
    scrollToContents('smooth')
  }, 1000)
})
</script>

<template>
  <header class="welcome-header">
    <TheDogsBusinessLogo />
  </header>
  <div ref="contentsRef" class="welcome-contents">
    <div class="container is-max-desktop welcome-container">
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
              v-slot="{ navigate }"
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
            {{ t('message.sign_in_if_you_have_account') }}
          </p>
          <p class="block is-flex is-justify-content-center">
            <b-button type="is-primary" @click="signIn">
              {{ t('message.sign_in') }}
            </b-button>
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
              v-slot="{ navigate }"
            >
              <b-button type="is-primary" @click="navigate">
                {{ t('message.start_without_signup') }}
              </b-button>
            </RouterLink>
          </p>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.welcome-header {
  position: fixed;
  width: 100%;
  min-height: 100vh;
  max-height: 100vh;
  z-index: -1;
}

.welcome-contents {
  position: absolute;
  top: 100vh;
  width: 100vw;
}
</style>
