<script setup lang="ts">
import ControlsOverlay from '../components/ControlsOverlay.vue'
import TheMap from '../components/TheMap.vue'
</script>

<template>
  <main class="fullscreen">
    <TheMap />
    <div class="map-overlay pointer-pass-through">
      <ControlsOverlay />
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
  @supports (width: 100dvw) {
    width: 100dvw;
  }
  /* 100vh ignores the address bar on Safari */
  @supports (height: 100dvh) {
    height: 100dvh;
  }
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
