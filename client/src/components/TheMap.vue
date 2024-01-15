<script setup lang="ts">
import { boxesIntersect, collectCollisionBoxesAndFeatures } from 'mapbox-collision-boxes'
import mapboxgl from 'mapbox-gl'
import {
  computed,
  getCurrentInstance,
  markRaw,
  onMounted,
  onUnmounted,
  ref,
  watch,
  watchEffect
} from 'vue'
import { useI18n } from 'vue-i18n'

import type { BusinessType } from '../lib/business-record-database'
import { convertBusinessRecordsToGeoJSON } from '../lib/business-record-database'
import { useAccountManager } from '../stores/account-manager'
import { useLocationTracker } from '../stores/location-tracker'
import MapActionsPopup from './MapActionsPopup.vue'

const ACTIVE_BUSINESS_SOURCE_ID = 'active-business'
const ACTIVE_BUSINESS_LAYER_ID = 'active-business'

const { t } = useI18n()

const accountManager = useAccountManager()
const locationTracker = useLocationTracker()

const self = getCurrentInstance()
if (self == null) {
  throw new Error('TheMap: no current instance')
}

const mapContainer = ref<HTMLElement>()
const map = ref<mapboxgl.Map>()
const isMapLoaded = ref(false)
const actionsPopupContainer = ref<HTMLElement>()
const actionsPopup = ref<mapboxgl.Popup>()

// current active dog
const currentDog = computed(() => {
  return accountManager.currentDog
})

// current Mapbox access token
const mapboxAccessToken = computed(() => {
  const accountInfo = accountManager.accountInfo
  if (accountInfo == null) {
    return undefined
  }
  switch (accountInfo.type) {
    case 'guest':
      return accountInfo.mapboxAccessToken
    case 'no-account':
      return undefined
    default: {
      // exhaustive cases must not lead here
      const unreachable: never = accountInfo
      throw new Error(`unknown account type: ${unreachable}`)
    }
  }
})

const getBusinessIconUrl = (businessType: string) => {
  return new URL(`../assets/icons/${businessType}.png`, import.meta.url).href
}
const requestedImages = new Set<string>()

// initializes the map when the Mapbox access token becomes available
watchEffect(() => {
  if (mapboxAccessToken.value == null) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('TheMap', 'Mapbox access token is not ready')
    }
    return
  }
  mapboxgl.accessToken = mapboxAccessToken.value
  // initializes the map if the map is not initialized yet
  if (map.value != null) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('TheMap', 'map has already been initialized')
    }
    return
  }
  if (mapContainer.value == null) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('TheMap', 'map container is unavailable')
    }
    return
  }
  if (actionsPopupContainer.value == null) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('TheMap', 'actions popup container is unavailable')
    }
    return
  }
  map.value = markRaw(new mapboxgl.Map({
    container: mapContainer.value,
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [139.7671, 35.6812], // Tokyo station
    zoom: 15
  }))
  map.value.on('styleimagemissing', (e) => {
    const { id } = e
    if (requestedImages.has(id)) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('TheMap', 'image has already been requested:', id)
      }
      return
    }
    if (id.startsWith('dogs-business-')) {
      const businessType = id.slice('dogs-business-'.length)
      const url = getBusinessIconUrl(businessType)
      if (process.env.NODE_ENV !== 'production') {
        console.log('TheMap', 'loading image:', url)
      }
      map.value!.loadImage(url, (err, image) => {
        if (process.env.NODE_ENV !== 'production') {
          console.log('TheMap', 'loaded image:', image)
        }
        if (err != null || image == null) {
          console.error('TheMap', 'failed to load icon', err)
          requestedImages.delete(id)
          throw err
        }
        map.value!.addImage(id, image)
      })
      requestedImages.add(id)
    }
  })
  map.value.on('load', () => {
    isMapLoaded.value = true
  })
  actionsPopup.value = markRaw(new mapboxgl.Popup())
  actionsPopup.value
    .setDOMContent(actionsPopupContainer.value)
    .addClassName('paper')
})

// configures the layer for active business records
// updates the layer source if the source has already been attached,
// otherwise, attaches the source and the layer
watchEffect(() => {
  if (!isMapLoaded.value) {
    return
  }
  if (map.value == null) {
    console.error('TheMap', 'map is loaded but no instance exists')
    return
  }
  if (accountManager.activeBusinessRecords == null) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('TheMap', 'no active business records')
    }
    return
  }
  const data =
    convertBusinessRecordsToGeoJSON(accountManager.activeBusinessRecords)
  const source = map.value.getSource(ACTIVE_BUSINESS_SOURCE_ID)
  if (source != null) {
    if (source.type !== 'geojson') {
      throw new Error('active-business source must be "geojson"')
    }
    source.setData(data)
  } else {
    map.value.addSource(ACTIVE_BUSINESS_SOURCE_ID, {
      type: 'geojson',
      data
    })
    map.value.addLayer({
      id: ACTIVE_BUSINESS_LAYER_ID,
      type: 'symbol',
      source: ACTIVE_BUSINESS_SOURCE_ID,
      layout: {
        'icon-image': ['concat', 'dogs-business-', ['get', 'businessType']],
        'icon-size': 0.25
      }
    })
    // handles clicks on business records
    map.value.on('click', ACTIVE_BUSINESS_LAYER_ID, async (event) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('TheMap', 'business record clicked', event)
      }
      const clickedRecordKey = event.features?.[0].id
      console.log('clicked record key', clickedRecordKey)
      const collisionBoxes = await collectCollisionBoxesAndFeatures(
        map.value!,
        ACTIVE_BUSINESS_LAYER_ID
      )
      const clickedBox = collisionBoxes
        .find((box) => box.feature.id=== clickedRecordKey)
      if (clickedBox == null) {
        console.warn('TheMap', 'clicked business record not found')
        return
      }
      const hiddenBoxes = collisionBoxes.filter((box) => {
        return box !== clickedBox && boxesIntersect(box.box, clickedBox.box)
      })
      for (const box of hiddenBoxes) {
        console.log('hidden record key', box.feature.id)
      }
    })
  }
})

// tracks/untracks the current location when the tab visibility changes
const onVisibilityChanged = async () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('TheMap', 'visibility changed:', document.visibilityState)
  }
  switch (document.visibilityState) {
    case 'visible':
      // resumes tracking the current location
      jumpToLocation = true
      try {
        locationTracker.startTracking()
      } catch (err) {
        console.error('TheMap', 'failed to start tracking:', err)
      }
      break
    case 'hidden':
      // stops tracking the current location
      try {
        locationTracker.stopTracking()
      } catch (err) {
        console.error('TheMap', 'failed to stop tracking:', err)
      }
      break
    default: {
      // exhaustive cases must not lead here
      const unreachable: never = document.visibilityState
      console.warn('TheMap', `unknown visibility state: ${unreachable}`)
    }
  }
}
onMounted(() => {
  document.addEventListener('visibilitychange', onVisibilityChanged)
  onVisibilityChanged()
})
onUnmounted(() => {
  document.removeEventListener('visibilitychange', onVisibilityChanged)
})

// starts tracking the current location when the map is ready
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
    console.log('TheMap', 'tracking location:', coords)
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
      throw new RangeError(`unknown location tracking state: ${unreachable}`)
    }
  }
}, { immediate: true })

const placePee = () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('TheMap', 'placing pee')
  }
  addBusinessRecordAtCurrentMarker('pee')
  askCleanup()
}

const placePoo = () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('TheMap', 'placing poo')
  }
  addBusinessRecordAtCurrentMarker('poo')
  askCleanup()
}

const addBusinessRecordAtCurrentMarker = (businessType: BusinessType) => {
  if (locationMarker.value == null) {
    throw new Error('location marker is unavailable')
  }
  const { lng, lat } = locationMarker.value.getLngLat()
  accountManager.addBusinessRecord({
    businessType,
    location: {
      longitude: lng,
      latitude: lat
    }
  })
}

const askCleanup = () => {
  // @ts-ignore
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
      <MapActionsPopup
        v-if="currentDog != null"
        :dog="currentDog"
        @pee="placePee"
        @poo="placePoo"
      />
      <p v-else class="block">
        <router-link :to="{ name: 'profile' }">
          {{ t('message.register_your_dog_friend') }}
        </router-link>
      </p>
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
