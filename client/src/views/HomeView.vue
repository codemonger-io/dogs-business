<script setup lang="ts">
import { watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'

import TheAuthenticator from '../components/TheAuthenticator.vue'
import { useAccountManager } from '../stores/account-manager'

const route = useRoute()
const router = useRouter()
const accountManager = useAccountManager()

// if the user is identified,
// redirects to the map unless it is already under /map
watch(
  () => accountManager.accountInfo,
  (account) => {
    if (account == null) {
      return
    }
    switch (account.type) {
      case 'guest':
      case 'online':
        if (!route.path.startsWith('/map')) {
          router.push({ name: 'map' })
        }
        break
      case 'no-account':
        break // does nothing
      default: {
        // exhaustive cases must not lead here
        const unreachable: never = account
        throw new Error(`unknown account type: ${unreachable}`)
      }
    }
  },
  { immediate: true }
)
</script>

<template>
  <TheAuthenticator>
    <RouterView />
  </TheAuthenticator>
</template>
