<script setup lang="ts">
import { computed } from 'vue'
import type { PropType } from 'vue'
import { RouterLink } from 'vue-router'

import IconGlobe from '../components/icons/IconGlobe.vue'
import IconLocationMarker from '../components/icons/IconLocationMarker.vue'
import IconPaw from '../components/icons/IconPaw.vue'
import IconUserCog from '../components/icons/IconUserCog.vue'
import { useAccountManager } from '../stores/account-manager'
import type { LocationMarkerState } from '../types/location-marker-state'
import type { MapViewerMode } from '../types/map-viewer-mode'

const props = defineProps<{
  locationMarkerState: LocationMarkerState | undefined
}>()

const viewerMode = defineModel('viewerMode', {
  type: String as PropType<MapViewerMode>,
  required: true
})

const emit = defineEmits<{
  'resume-tracking': []
}>()

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

const markerButtonClass = computed(() => {
  const classes = []
  switch (props.locationMarkerState) {
    case 'tracking':
      classes.push('is-primary')
      break
    case 'pinned-within-range':
      classes.push('is-warning')
      break
    case 'pinned-out-of-range':
      classes.push('is-danger')
      break
    case undefined:
      classes.push('is-static')
      break
    default: {
      const unreachable: never = props.locationMarkerState
      throw new RangeError(`unknown location marker state: ${unreachable}`)
    }
  }
  return classes
})

const jumpToLocation = () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('ControlsOverlay', 'resuming location tracking')
  }
  emit('resume-tracking')
}

const rotateViewerMode = () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('ControlsOverlay', 'rotating viewer mode:', viewerMode.value)
  }
  let newMode: MapViewerMode
  switch (viewerMode.value) {
    case 'global':
      newMode = 'active-dog'
      break
    case 'active-dog':
      newMode = 'global'
      break
    default: {
      const unreachable: never = viewerMode.value
      throw new RangeError(`unknown map viewer mode: ${unreachable}`)
    }
  }
  if (process.env.NODE_ENV !== 'production') {
    console.log('ControlsOverlay', 'rotated viewer mode:', newMode)
  }
  viewerMode.value = newMode
}
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
      <button
        class="button is-rounded is-circle-icon"
        :class="markerButtonClass"
        :disabled="locationMarkerState == null"
        @click="jumpToLocation()"
      >
        <icon-location-marker></icon-location-marker>
      </button>
      <button
        class="button is-primary is-rounded is-circle-icon"
        @click="rotateViewerMode()"
      >
        <icon-globe v-if="viewerMode === 'global'"></icon-globe>
        <icon-paw v-else-if="viewerMode === 'active-dog'"></icon-paw>
        <span v-else type="icon">?</span>
      </button>
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
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  pointer-events: auto;
  right: 0;
  bottom: 5rem;
  margin-right: 1rem;
}
</style>
