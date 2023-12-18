<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

import TheMap from '../components/TheMap.vue'

const router = useRouter()

onMounted(() => {
  // TODO: show the profile only when no profile exists
  router.push({ name: 'profile' })
})
</script>

<template>
  <main class="fullscreen">
    <TheMap />
    <div class="map-overlay">
      <RouterView />
    </div>
  </main>
</template>

<style scoped>
.fullscreen {
  position: relative;
  width: 100vw;
  height: 100vh;
}

.map-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
}
</style>
