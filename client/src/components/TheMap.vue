<script setup lang="ts">
import mapboxgl from 'mapbox-gl'
import { markRaw, onMounted, ref, watch, watchEffect } from 'vue'

import mapboxConfig from '../configs/mapbox-config'
import { useAccountManager } from '../stores/account-manager'
import { useLocationTracker } from '../stores/location-tracker'

const props = defineProps({
  easeDurationInMs: {
    type: Number,
    default: 800,
    validator: (ms: number) => ms >= 0
  }
})

const accountManager = useAccountManager()
const locationTracker = useLocationTracker()

const mapContainer = ref<HTMLElement>()
const map = ref<mapboxgl.Map>()

// configures `mapboxgl` whenever the account info is updated
watch(
  () => accountManager.accountInfo,
  (accountInfo) => {
    if (accountInfo == null) {
      // loading
      return
    }
    switch (accountInfo.type) {
      case 'guest':
        mapboxgl.accessToken = accountInfo.mapboxAccessToken
        break
      case 'no-account':
        // TODO: is it legitimate to make the token empty?
        mapboxgl.accessToken = ''
        break
      default:
        // exhaustive cases must not lead here
        const unreachable: never = accountInfo
        throw new RangeError(`unknown account type: ${accountInfo}`)
    }
  },
  { immediate: true }
)

onMounted(() => {
  if (mapContainer.value == null) {
    throw new Error('map container is unavailable')
  }
  if (map.value != null) {
    throw new Error('map has already been initialized')
  }
  map.value = markRaw(new mapboxgl.Map({
    container: mapContainer.value,
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [139.7671, 35.6812], // Tokyo station
    zoom: 15
  }))
})

let initialJump = true
watchEffect(() => {
  if (map.value == null) {
    return
  }
  let coords = locationTracker.currentLocation?.coords
  if (coords == null) {
    return
  }
  if (initialJump) {
    map.value.jumpTo({
      center: [coords.longitude, coords.latitude]
    })
    initialJump = false
  } else {
    map.value.easeTo({
      center: [coords.longitude, coords.latitude],
      duration: props.easeDurationInMs
    })
  }
})
</script>

<template>
  <div ref="mapContainer" class="map-container"></div>
</template>

<style scope>
.map-container {
  position: relative;
  width: 100%;
  height: 100%;
}
</style>
