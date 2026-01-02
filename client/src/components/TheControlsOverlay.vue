<script setup lang="ts">
import { RouterLink } from 'vue-router'

const openDogProfile = () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('TheControlsOverlay', 'opening dog profile')
  }
}
</script>

<template>
  <div class="control-container fullscreen">
    <div class="right-control-container">
      <router-link :to="{ name: 'show-profile' }" custom v-slot="{ navigate }">
        <button
          class="button is-primary is-rounded is-circle-icon"
          @click="navigate()"
        >
          <span class="icon">も</span>
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

.right-control-container {
  position: absolute;
  pointer-events: auto;
  right: 0;
  bottom: 5rem;
  margin-right: 1rem;
}
</style>
