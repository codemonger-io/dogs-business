<script setup lang="ts">
import { computedAsync } from '@vueuse/core'
import { BButton, BLoading, BModal } from 'buefy'
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { useAccountManager } from '../stores/account-manager'
import type {
  HumanFriendInvitationStatus,
  HumanFriendInvitationAcceptanceResult
} from '../types/human-friend-invitation'
import { capitalize } from '../utils/strings'

const props = defineProps<{
  invitationId: string
}>()

const router = useRouter()
const { t } = useI18n()
const accountManager = useAccountManager()

const invitation = ref<HumanFriendInvitationStatus>()

const acceptanceResult = ref<HumanFriendInvitationAcceptanceResult>()

onMounted(async () => {
  invitation.value = await accountManager.getHumanFriendInvitationStatus(props.invitationId)
})

// friendDog becomes the information of the dog who is already a friend
// otherwise, undefined
const friendDog = computedAsync(async () => {
  const invitationStatus = invitation.value?.payload
  if (invitationStatus == null) {
    return undefined
  }
  switch (invitationStatus.type) {
    case 'eligible':
      return undefined
    case 'duplicated': {
      return accountManager.getDogFriend(invitationStatus.dogId)
    }
    default: {
      const neverStatus: never = invitationStatus
      throw new Error(`unknown invitation status payload type: ${neverStatus}`)
    }
  }
})

const selectDogFriend = async (dogId: string) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('AcceptInvitationView.selectDogFriend', dogId)
  }
  await accountManager.setActiveDogFriend(dogId)
  router.push({ name: 'new-profile' })
}

const acceptInvitation = async () => {
  const result = await accountManager.acceptHumanFriendInvitation(props.invitationId)
  switch (result.payload.type) {
    case 'accepted':
      if (process.env.NODE_ENV !== 'production') {
        console.log('AcceptInvitationView', 'accepted invitation from dog:', result.payload.dogId)
      }
      await selectDogFriend(result.payload.dogId)
      break
    case 'duplicated':
      if (process.env.NODE_ENV !== 'production') {
        console.log('AcceptInvitationView', 'already friend of dog:', result.payload.dogId)
      }
      await selectDogFriend(result.payload.dogId)
      break
    default: {
      const neverResult: never = result.payload
      throw new Error(`unknown invitation acceptance result payload type: ${neverResult}`)
    }
  }
  acceptanceResult.value = result
}

const declineInvitation = () => {
  // invitation is valid after decline
  router.back()
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
            <h1 class="title is-3">{{ capitalize(t('term.invitation')) }}</h1>
            <template v-if="invitation?.payload.type === 'eligible'">
              <div class="block">
                <i18n-t keypath="message.do_you_accept_invitation_and_become_friend_of_dog" tag="p">
                  <template v-slot:dog-name>
                    <span class="has-text-weight-bold">{{ invitation.payload.dogName }}</span>
                  </template>
                </i18n-t>
              </div>
              <div class="block is-flex is-justify-content-space-evenly">
                <b-button
                  type="is-warning"
                  @click="declineInvitation()"
                >
                  {{ t('message.decline_invitation') }}
                </b-button>
                <b-button
                  type="is-primary"
                  @click="acceptInvitation()"
                >
                  {{ t('message.accept_invitation') }}
                </b-button>
              </div>
            </template>
            <template v-else-if="invitation?.payload.type === 'duplicated' && friendDog != null">
              <div class="block">
                <i18n-t keypath="message.you_are_already_friend_of_dog">
                  <template v-slot:dog-name>
                    <span class="has-text-weight-bold">{{ friendDog.name }}</span>
                  </template>
                </i18n-t>
              </div>
              <div class="block is-flex is-justify-content-space-evenly">
                <b-button
                  type="is-primary"
                  @click="selectDogFriend(friendDog.dogId)"
                >
                  {{ t('message.switch_dog_friend') }}
                </b-button>
              </div>
            </template>
            <b-loading :model-value="invitation == null"></b-loading>
          </section>
        </div>
      </div>
    </b-modal>
  </div>
</template>
