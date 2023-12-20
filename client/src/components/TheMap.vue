<script setup lang="ts">
import mapboxgl from 'mapbox-gl'
import {
  getCurrentInstance,
  markRaw,
  onMounted,
  onUnmounted,
  ref,
  watch,
  watchEffect
} from 'vue'
import { useI18n } from 'vue-i18n'

import mapboxConfig from '../configs/mapbox-config'
import { useAccountManager } from '../stores/account-manager'
import { useLocationTracker } from '../stores/location-tracker'

const props = defineProps({
  // duration in milliseconds of easing delay to track the current location
  easeDurationInMs: {
    type: Number,
    default: 500,
    validator: (ms: number) => ms >= 0
  }
})

const { t } = useI18n()

const accountManager = useAccountManager()
const locationTracker = useLocationTracker()

const self = getCurrentInstance()
if (self == null) {
  throw new Error('TheMap: no current instance')
}

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
      default: {
        // exhaustive cases must not lead here
        const unreachable: never = accountInfo
        throw new RangeError(`unknown account type: ${accountInfo}`)
      }
    }
  },
  { immediate: true }
)

const onVisibilityChanged = async () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('visibility changed:', document.visibilityState)
  }
  switch (document.visibilityState) {
    case 'visible':
      // resumes tracking the current location
      jumpToLocation = true
      try {
        locationTracker.startTracking()
      } catch (err) {
        console.error('TheMap: failed to start tracking:', err)
      }
      break
    case 'hidden':
      // stops tracking the current location
      try {
        locationTracker.stopTracking()
      } catch (err) {
        console.error('TheMap: failed to stop tracking:', err)
      }
      break
    default: {
      // exhaustive cases must not lead here
      const unreachable: never = document.visibilityState
      console.warn(`unknown visibility state: ${document.visibilityState}`)
    }
  }
}

onMounted(() => {
  if (mapContainer.value == null) {
    throw new Error('map container is unavailable')
  }
  if (map.value != null) {
    console.warn('map has already been initialized')
    return
  }
  if (!mapboxgl.accessToken) {
    console.warn('no Mapbox access token')
    return
  }
  map.value = markRaw(new mapboxgl.Map({
    container: mapContainer.value,
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [139.7671, 35.6812], // Tokyo station
    zoom: 15
  }))
})

// tracks/untracks the current location when the tab visibility changes
onMounted(() => {
  document.addEventListener('visibilitychange', onVisibilityChanged)
  onVisibilityChanged()
})
onUnmounted(() => {
  document.removeEventListener('visibilitychange', onVisibilityChanged)
})

let jumpToLocation = true
watchEffect(() => {
  if (map.value == null) {
    return
  }
  let coords = locationTracker.currentLocation?.coords
  if (coords == null) {
    return
  }
  if (process.env.NODE_ENV !== 'production') {
    console.log('TheMap: tracking location:', coords)
  }
  if (jumpToLocation) {
    map.value.jumpTo({
      center: [coords.longitude, coords.latitude]
    })
    jumpToLocation = false
  } else {
    map.value.easeTo({
      center: [coords.longitude, coords.latitude],
      duration: props.easeDurationInMs
    })
  }
})

watch(() => locationTracker.state, (state) => {
  switch (state) {
    case 'untracking':
    case 'starting_tracking':
    case 'tracking':
      break // OK
    case 'permission_denied':
      // @ts-ignore
      self.proxy?.$buefy.toast.open({
        message: t('message.enable_location_tracking'),
        type: 'is-danger'
      })
      break
    case 'unavailable':
      // @ts-ignore
      self.proxy?.$buefy.toast.open({
        message: t('message.location_tracking_unavailable'),
        type: 'is-danger'
      })
      break
    default: {
      // exhaustive cases must not lead here
      const unreachable: never = state
      throw new RangeError(`unknown location tracking state: ${state}`)
    }
  }
}, { immediate: true })
</script>

<template>
  <div ref="mapContainer" class="map-container"></div>
</template>

<style scope>
.map-container {
  width: 100%;
  height: 100%;
}
</style>
