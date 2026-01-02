<script setup lang="ts">
import { BModal } from 'buefy'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { useAccountManager } from '../stores/account-manager'
import { capitalize } from '../utils/strings'

const router = useRouter()
const { t } = useI18n()

const accountManager = useAccountManager()

const inviteNewHumanFriend = async () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('ShowProfileView', 'inviting a new human friend...')
  }
  const invitation = await accountManager.inviteNewHumanFriendForCurrentDog()
  router.push({
    name: 'show-invitation',
    params: {
      invitationId: invitation.invitationId
    },
    query: {
      expiresAt: invitation.payload.expiresAt,
      dogName: accountManager.currentDog?.name
    }
  })
}

const close = () => {
  router.back()
}
</script>

<template>
  <div class="container is-max-desktop">
    <b-modal
      custom-class="is-full-screen-mobile"
      :model-value="true"
      @cancel="close"
    >
      <div class="card paper">
        <div class="card-content">
          <section class="section">
            <h1 class="title is-3">{{ capitalize(t('term.profile')) }}</h1>
            <div class="block">
              <p class="block is-flex is-justify-content-center">
                <b-button
                  type="is-primary"
                  @click="inviteNewHumanFriend()"
                >
                  {{ t('message.invite_new_human_friend') }}
                </b-button>
              </p>
            </div>
          </section>
        </div>
      </div>
    </b-modal>
  </div>
</template>
