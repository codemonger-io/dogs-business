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
import MapActionsPopup from './MapActionsPopup.vue'

const { t } = useI18n()

const accountManager = useAccountManager()
const locationTracker = useLocationTracker()

const self = getCurrentInstance()
if (self == null) {
  throw new Error('TheMap: no current instance')
}

const mapContainer = ref<HTMLElement>()
const map = ref<mapboxgl.Map>()
const actionsPopupContainer = ref<HTMLElement>()
const actionsPopup = ref<mapboxgl.Popup>()

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
  if (actionsPopupContainer.value == null) {
    throw new Error('actions popup container is unavailable')
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
  actionsPopup.value = markRaw(new mapboxgl.Popup())
  actionsPopup.value
    .setDOMContent(actionsPopupContainer.value)
    .addClassName('paper')
})

// tracks/untracks the current location when the tab visibility changes
onMounted(() => {
  document.addEventListener('visibilitychange', onVisibilityChanged)
  onVisibilityChanged()
})
onUnmounted(() => {
  document.removeEventListener('visibilitychange', onVisibilityChanged)
})

const locationMarker = ref<mapboxgl.Marker>()
let jumpToLocation = true
watchEffect(() => {
  if (map.value == null) {
    return
  }
  if (actionsPopup.value == null) {
    return
  }
  let coords = locationTracker.currentLocation?.coords
  if (coords == null) {
    return
  }
  if (process.env.NODE_ENV !== 'production') {
    console.log('TheMap: tracking location:', coords)
  }
  if (locationMarker.value == null) {
    locationMarker.value = markRaw(new mapboxgl.Marker({
      color: '#37C49F'
    }))
    locationMarker.value
      .setLngLat([coords.longitude, coords.latitude])
      .setPopup(actionsPopup.value)
      .addTo(map.value)
  } else {
    locationMarker.value
      .setLngLat([coords.longitude, coords.latitude])
  }
  actionsPopup.value
    .setLngLat([coords.longitude, coords.latitude])
  if (jumpToLocation) {
    map.value.jumpTo({
      center: [coords.longitude, coords.latitude]
    })
    actionsPopup.value.addTo(map.value)
    jumpToLocation = false
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

const placePee = () => {
  console.log('placing pee')
  askCleanup()
}

const placePoo = () => {
  console.log('placing poo')
  askCleanup()
}

const askCleanup = () => {
  self.proxy?.$buefy.snackbar.open({
    message: t('message.clean_up_after', [t('term.your_dog_friend')]),
    type: 'is-warning',
    position: 'is-top',
    actionText: t('term.undo'),
    duration: 3000,
    onAction: () => {
      console.log('undoing')
    }
  })
}
</script>

<template>
  <div ref="mapContainer" class="map-container"></div>
  <div class="hidden">
    <div ref="actionsPopupContainer">
      <MapActionsPopup @pee="placePee" @poo="placePoo" />
    </div>
  </div>
</template>

<style scope>
.map-container {
  width: 100%;
  height: 100%;
}

.hidden {
  display: none;
}
</style>
