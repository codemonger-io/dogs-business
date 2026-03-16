<script setup lang="ts">
import { ref } from 'vue'

import ControlsOverlay from '../../components/ControlsOverlay.vue'
import TheMap from '../../components/TheMap.vue'
import type { LocationMarkerState } from '../../types/location-marker-state'
import type { MapViewerMode } from '../../types/map-viewer-mode'

const mapParameters = ref<{
  viewerMode: MapViewerMode,
  locationMarkerState: LocationMarkerState | undefined,
  resumeTrackingRequested: boolean
}>({
  viewerMode: 'active-dog',
  locationMarkerState: undefined,
  resumeTrackingRequested: false
})

const updateLocationMarkerState = (state: LocationMarkerState | undefined) => {
  mapParameters.value.locationMarkerState = state
}

const resumeTracking = () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('MapView', 'resuming location tracking')
  }
  mapParameters.value.resumeTrackingRequested = true
}
</script>

<template>
  <main class="fullscreen">
    <TheMap
      v-model:resume-tracking-requested="mapParameters.resumeTrackingRequested"
      :viewer-mode="mapParameters.viewerMode"
      @location-marker-state-changed="updateLocationMarkerState"
    />
    <div class="map-overlay pointer-pass-through">
      <ControlsOverlay
        v-model:viewer-mode="mapParameters.viewerMode"
        :location-marker-state="mapParameters.locationMarkerState"
        @resume-tracking="resumeTracking"
      />
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
