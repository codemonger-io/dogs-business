<script setup lang="ts">
import { BModal } from 'buefy'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { useAccountManager } from '../../../stores/account-manager'

const props = defineProps<{
  // ID of the dog to show the profile
  dogId: string
}>()

const router = useRouter()
const { t } = useI18n()

const accountManager = useAccountManager()

const dogName = computed(() => accountManager.currentDog?.name)

const dogNameInitial = computed(() => {
  const name = dogName.value
  if (name != null && name.length > 0) {
    return name.charAt(0)
  } else {
    return null
  }
})

const inviteNewHumanFriend = async () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('ProfileView', `inviting a new human friend on behalf of the dog ${props.dogId}...`)
  }
  // TODO: create an invitation for props.dogId instead of the current dog
  const invitation = await accountManager.inviteNewHumanFriendForCurrentDog()
  router.push({
    name: 'show-invitation',
    params: {
      dogId: props.dogId,
      invitationId: invitation.invitationId
    },
    query: {
      expiresAt: invitation.payload.expiresAt,
      dogName: accountManager.currentDog?.name
    }
  })
}

const close = () => {
  // we cannot simply goes back, because the user may have landed here by
  // accepting an invitation
  // TODO: is the map always the right place to go back to?
  router.push({ name: 'map' })
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
            <div class="block is-flex is-justify-content-center">
              <div class="avatar">
                <!-- TODO: show an image in the future -->
                <span class="icon">{{ dogNameInitial }}</span>
              </div>
            </div>
            <div class="block is-flex is-justify-content-center">
              <span class="is-size-2"><strong>{{ dogName }}</strong></span>
            </div>
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

<style scoped>
.avatar {
  --dogs-avatar-size: 128px;
  --dogs-avatar-font-size: 64px;

  display: inline-flex;
  align-items: center;

  font-size: var(--dogs-avatar-font-size);

  border-radius: 9999px;
  border: 1px solid;
  border-color: var(--paper-invert);

  margin: 0;
  padding: 0;

  .icon {
    width: var(--dogs-avatar-size);
    height: var(--dogs-avatar-size);
  }
}
</style>
