<script setup lang="ts">
import { getCurrentInstance, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import ThePasskeys from '../components/ThePasskeys.vue'
import { capitalize } from '../utils/strings'

const { t } = useI18n()

const self = getCurrentInstance()

const username = ref('')

const onSubmit = () => {
  console.log('signing up')
}

const showWhatArePasskeys = () => {
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
        <div class="block">
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
          </form>
        </div>
      </section>
    </div>
  </div>
</template>
