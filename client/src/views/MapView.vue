<script setup lang="ts">
import TheControlsOverlay from '../components/TheControlsOverlay.vue'
import TheMap from '../components/TheMap.vue'
</script>

<template>
  <main class="fullscreen">
    <TheMap />
    <div class="map-overlay pointer-pass-through">
      <TheControlsOverlay />
    </div>
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

  &.pointer-pass-through {
    pointer-events: none;
  }
}
</style>
