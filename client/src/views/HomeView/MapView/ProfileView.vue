<script setup lang="ts">
import { computedAsync } from '@vueuse/core'
import { BSkeleton, BTooltip } from 'buefy'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import ModalPage from '../../../components/ModalPage.vue'
import IconCircleUser from '../../../components/icons/IconCircleUser.vue'
import IconHeartShield from '../../../components/icons/IconHeartShield.vue'
import IconPee from '../../../components/icons/IconPee.vue'
import IconPoo from '../../../components/icons/IconPoo.vue'
import { useAccountManager } from '../../../stores/account-manager'
import { capitalize } from '../../../utils/strings'

const props = defineProps<{
  // ID of the dog to show the profile
  dogId: string
}>()

const router = useRouter()
const { d, t } = useI18n()

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

const userId = computed(() => {
  if (accountManager.accountInfo.type !== 'online') {
    return undefined
  }
  return accountManager.accountInfo.publicKeyInfo.userHandle
})

const QUERY_HOURS = 8
const recentBusinessRecords = computed(() => {
  const fromTimestamp = (Date.now() / 1000) - QUERY_HOURS * 60 * 60
  const records = accountManager.activeBusinessRecords ?? []
  return records
    .filter((r) => r.timestamp >= fromTimestamp)
    .map((r) => {
      const datetime = new Date(r.timestamp * 1000)
      return {
        ...r,
        datetime,
      }
    })
})

// queries human friends of the current dog
const isFetchingHumanFriends = ref(false)
const humanFriends = computedAsync(async () => {
  if (accountManager.accountInfo.type !== 'online') {
    return
  }
  const currentDogId = accountManager.currentDog?.dogId
  if (currentDogId == null) {
    console.warn('ProfileView', 'no dog is active')
    return
  }
  if (typeof currentDogId !== 'string') {
    console.warn('ProfileView', 'current dog ID must be a string')
    return
  }
  try {
    isFetchingHumanFriends.value = true
    const friendsRes = await accountManager.resourceApi.getHumanFriendsOfDog(currentDogId)
    if (friendsRes.ok) {
      return await friendsRes.parse()
    } else {
      console.error('ProfileView', 'failed to query human friends of the dog', await friendsRes.text())
    }
  } catch (err) {
    console.error('ProfileView', 'failed to query human friend of the dog', err)
  } finally {
    isFetchingHumanFriends.value = false
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
  <ModalPage no-rewind-on-close @closed="close">
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
            <h2 class="title is-4">
              {{ capitalize(t('term.business_in_the_last_n_hours', QUERY_HOURS)) }}
            </h2>
            <div v-if="recentBusinessRecords.length > 0">
              <div
                v-for="record in recentBusinessRecords"
                :key="`record-${record.recordId}`"
                class="business-record"
              >
                <div class="business-record-type">
                  <span class="icon">
                    <IconPoo v-if="record.businessType === 'poo'" />
                    <IconPee v-else-if="record.businessType === 'pee'" />
                    <template v-else>?</template>
                  </span>
                </div>
                <div class="business-record-datetime">
                  <span class="date-part">
                    {{ d(record.datetime, 'date') }}
                  </span>
                  <span class="time-part">
                    {{ d(record.datetime, 'time') }}
                  </span>
                </div>
              </div>
            </div>
            <div v-else>
              {{ t('message.no_business_recorded_in_the_last_n_hours', QUERY_HOURS) }}
            </div>
          </div>
          <div class="block">
            <h2 class="title is-4">
              {{ capitalize(t('term.human_friend', humanFriends?.length ?? 0)) }}
            </h2>
            <div>
              <div
                v-for="(friend, i) in humanFriends"
                :key="`friend-${i}`"
                class="human-friend-item"
              >
                <div class="human-friend-name">
                  {{ friend.userName }}
                </div>
                <div class="human-friend-identity">
                  <b-tooltip
                    v-if="userId === friend.userId"
                    type="is-info"
                    :label="t('tooltip.this_user_is_you')"
                    position="is-top"
                    multilined
                    :triggers="['click']"
                    :auto-close="['inside', 'outside']"
                  >
                    <IconCircleUser />
                  </b-tooltip>
                </div>
                <div class="human-friend-guardian">
                  <b-tooltip
                    v-if="friend.isGuardian"
                    type="is-info"
                    :label="t('tooltip.this_user_is_a_guardian_of_the_dog', { dogName: dogName })"
                    position="is-top"
                    multilined
                    :triggers="['click']"
                    :auto-close="['inside', 'outside']"
                  >
                    <IconHeartShield v-if="friend.isGuardian" />
                  </b-tooltip>
                </div>
              </div>
              <b-skeleton
                :active="isFetchingHumanFriends"
                size="is-large"
              >
              </b-skeleton>
            </div>
          </div>
          <div class="block control-block">
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
  </ModalPage>
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

.business-record {
  display: flex;
  align-items: center;
  gap: 1em;

  &:not(:first-child) {
    margin-top: 0.75em;
  }

  .business-record-type {
    display: inline-block;
    width: 2em;
    max-width: 2em;
    min-width: 2em;
  }

  .business-record-datetime {
    display: block;

    .date-part {
      display: inline-block;
      margin-right: 0.5em;
    }
    .time-part {
      display: inline-block;
    }
  }
}

.human-friend-item {
  display: flex;
  align-items: center;
  gap: 1em;

  &:not(:first-child) {
    margin-top: 0.75em;
  }

  .human-friend-name {
    max-width: 150px;
  }

  .human-friend-identity {
    color: var(--dogs-theme);
  }

  .human-friend-guardian {
    color: var(--dogs-theme);
  }
}

.control-block {
  margin-top: 3rem;
}
</style>
