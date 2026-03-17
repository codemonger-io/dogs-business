<script setup lang="ts">
import { BButton, useDialog } from 'buefy'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import ModalPage from '../../../components/ModalPage.vue'
import { useAccountManager } from '../../../stores/account-manager'
import { capitalize } from '../../../utils/strings'

const dialog = useDialog()
const { t } = useI18n()

const accountManager = useAccountManager()

const signOut = () => {
  dialog.confirm({
    title: t('action.sign_out'),
    message: t('message.confirm_sign_out'),
    confirmText: t('action.sign_out'),
    cancelText: t('action.cancel'),
    type: 'is-warning',
    onConfirm: () => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('signing out...')
      }
      accountManager.signOut()
    }
  })
}
</script>

<template>
  <ModalPage>
    <div class="card paper">
      <div class="card-content">
        <section class="section">
          <h1 class="title is-3 has-text-centered">
            {{ capitalize(t('term.settings')) }}
          </h1>
          <div class="block">
            <h2 class="title is-4">{{ capitalize(t('term.your_dog_friend', 2)) }}</h2>
          </div>
          <div class="block is-flex is-justify-content-center">
            <b-button
              v-if="accountManager.accountInfo.type === 'online'"
              type="is-warning"
              @click="signOut()"
            >
              {{ t('action.sign_out') }}
            </b-button>
          </div>
        </section>
      </div>
    </div>
  </ModalPage>
</template>
