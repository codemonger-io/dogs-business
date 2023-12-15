<script setup lang="ts">
import mapboxgl from 'mapbox-gl'
import { ref, watch } from 'vue'

import mapboxConfig from '../configs/mapbox-config'
import { useAccountManager } from '../stores/account-manager'

const accountManager = useAccountManager()

const mapContainer = ref<HTMLElement>()

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

watch(mapContainer, (container) => {
  if (container == null) {
    return
  }
  const map = new mapboxgl.Map({
    container,
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [-74.5, 40],
    zoom: 9
  })
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
