<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

import IconUserCog from '../components/icons/IconUserCog.vue'
import { useAccountManager } from '../stores/account-manager'

const accountManager = useAccountManager()

const dogId = computed(() => accountManager.currentDog?.dogId)

const dogNameInitial = computed(() => {
  const dogName = accountManager.currentDog?.name
  if (dogName != null && dogName.length > 0) {
    return dogName.charAt(0)
  } else {
    return null
  }
})
</script>

<template>
  <div class="control-container fullscreen">
    <div class="top-right-control-container">
      <router-link
        :to="{ name: 'settings' }"
        custom
        v-slot="{ navigate }"
      >
        <button
          class="button is-primary is-rounded is-circle-icon"
          @click="navigate()"
        >
          <icon-user-cog></icon-user-cog>
        </button>
      </router-link>
    </div>
    <div class="bottom-right-control-container">
      <router-link
        v-if="dogId != null && dogNameInitial != null"
        :to="{ name: 'profile', params: { dogId } }"
        custom
        v-slot="{ navigate }"
      >
        <button
          class="button is-primary is-rounded is-circle-icon"
          @click="navigate()"
        >
          <span class="icon">{{ dogNameInitial }}</span>
        </button>
      </router-link>
    </div>
  </div>
</template>

<style scoped>
.fullscreen {
  width: 100vw;
  height: 100vh;
}

.control-container {
  position: relative;

  .button {
    box-shadow: 0 1px 1px rgba(0, 0, 0, 0.1);
  }
}

.top-right-control-container {
  position: absolute;
  pointer-events: auto;
  right: 0;
  top: 1rem;
  margin-right: 1rem;
}

.bottom-right-control-container {
  position: absolute;
  pointer-events: auto;
  right: 0;
  bottom: 5rem;
  margin-right: 1rem;
}
</style>
