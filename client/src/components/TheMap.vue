<script setup lang="ts">
import { boxesIntersect, collectCollisionBoxesAndFeatures } from '@codemonger-io/maplibre-collision-boxes'
import { GeoCircleLayer } from '@codemonger-io/maplibre-geo-circle-layer'
import { useSnackbar, useToast } from 'buefy'
import maplibregl from 'maplibre-gl'
import type { GeoJSONSource } from 'maplibre-gl'
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
import { RouterLink } from 'vue-router'

import type { BusinessType } from '../lib/business-record-database'
import { convertBusinessRecordsToGeoJSON } from '../lib/business-record-database'
import { useAccountManager } from '../stores/account-manager'
import { useLocationTracker } from '../stores/location-tracker'
import type { MapViewerMode } from '../types/map-viewer-mode'
import {
  DOGS_BUSINESS_DANGER_RGB,
  DOGS_BUSINESS_PRIMARY,
  DOGS_BUSINESS_PRIMARY_RGB
} from '../utils/colors'
import MapActionsPopup from './MapActionsPopup.vue'

const ACTIVE_BUSINESS_SOURCE_ID = 'active-business'
const ACTIVE_BUSINESS_LAYER_ID = 'active-business'

const REMOTE_BUSINESS_SOURCE_ID = 'remote-business'
const REMOTE_BUSINESS_LAYER_ID = 'business-records'

const MARKER_RANGE_LAYER_ID = 'marker-range'
const MAX_MARKER_RANGE_IN_METERS = 50
const MARKER_RANGE_LAYER_ALPHA = 0.25

const props = defineProps<{
  viewerMode: MapViewerMode
}>()

const snackbar = useSnackbar()
const toast = useToast()

const { t } = useI18n()

const accountManager = useAccountManager()
const locationTracker = useLocationTracker()

const self = getCurrentInstance()
if (self == null) {
  throw new Error('TheMap: no current instance')
}

const mapContainer = ref<HTMLElement>()
const map = ref<maplibregl.Map>()
const isMapLoaded = ref(false)
const isActiveBusinessLayerReady = ref(false)
const locationMarker = ref<maplibregl.Marker>()
let jumpToLocation = true // intentionally non-reactive
const actionsPopupContainer = ref<HTMLElement>()
const actionsPopup = ref<maplibregl.Popup>()
const isDraggingMarker = ref(false)
const pinnedLocation = ref<maplibregl.LngLat>()
const isOutOfRange = ref(false)
// toast to tell the start of location tracking
const toastForTrackingStart = ref<{ close: () => void }>()

// layer to show the region within the user can adjust the marker
const markerRangeLayer = new GeoCircleLayer(MARKER_RANGE_LAYER_ID, {
  radiusInMeters: MAX_MARKER_RANGE_IN_METERS,
  center: { lat: 35.6812, lng: 139.7671 },
  fill: { ...DOGS_BUSINESS_PRIMARY_RGB, alpha: MARKER_RANGE_LAYER_ALPHA }
})

// current active dog
const currentDog = computed(() => {
  return accountManager.currentDog
})
const isLoadingDog = computed(() => {
  return accountManager.isLoadingDog
})

// lookup table of active business record IDs
// facilitates filtering remote business records
const activeBusinessRecordIdTable = computed(() => {
  const table: Record<string, true> = {}
  accountManager.activeBusinessRecords?.forEach((r) => {
    table[r.recordId] = true
  })
  return table
})

const activeBusinessRecordsGeoJson = computed(() => {
  if (process.env.NODE_ENV !== 'production') {
    if (accountManager.activeBusinessRecords == null) {
      console.log('TheMap', 'no active business records')
    }
  }
  const records = accountManager.activeBusinessRecords ?? []
  return markRaw(convertBusinessRecordsToGeoJSON(records))
})

const getBusinessIconUrl = (businessType: string) => {
  return new URL(`../assets/icons/${businessType}.png`, import.meta.url).href
}
const requestedImages = new Set<string>()

// initializes the map when necessary resources are changed
watchEffect(() => {
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
  if (process.env.NODE_ENV !== 'production') {
    console.log('TheMap', 'initializing the map')
  }
  map.value = markRaw(new maplibregl.Map({
    container: mapContainer.value,
    style: 'https://tiles.openfreemap.org/styles/bright',
    center: [139.7671, 35.6812], // Tokyo station
    zoom: 18
  }))
  map.value.setTransformRequest((url, resourceType) => {
    // adds Authorization header to requests for business records tiles
    if (
      resourceType === 'Tile' &&
      url.startsWith(import.meta.env.VITE_DOGS_BUSINESS_MAP_API_BASE_URL)
    ) {
      return {
        url,
        headers: {
          Authorization: 'Bearer dummy-api-token'
        }
      }
    } else {
      return { url }
    }
  });
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
      map.value!.loadImage(url)
        .then((res) => {
          if (process.env.NODE_ENV !== 'production') {
            console.log('TheMap', 'loaded image:', res)
          }
          map.value!.addImage(id, res.data)
        })
        .catch((err) => {
          console.error('TheMap', 'failed to load icon', err)
          requestedImages.delete(id)
          throw err
        })
      requestedImages.add(id)
    }
  })
  map.value.on('load', () => {
    isMapLoaded.value = true
  })
  actionsPopup.value = markRaw(new maplibregl.Popup())
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
  const viewerMode = props.viewerMode
  const source = map.value.getSource(ACTIVE_BUSINESS_SOURCE_ID)
  if (source != null) {
    if (source.type !== 'geojson') {
      throw new Error('active-business source must be "geojson"')
    }
    (source as GeoJSONSource).setData(activeBusinessRecordsGeoJson.value)
    map.value.setFilter(
      ACTIVE_BUSINESS_LAYER_ID,
      ['boolean', viewerMode === 'active-dog']
    )
  } else {
    if (process.env.NODE_ENV !== 'production') {
      console.log('TheMap', 'initializing active business records layer')
    }
    map.value.addSource(ACTIVE_BUSINESS_SOURCE_ID, {
      type: 'geojson',
      data: activeBusinessRecordsGeoJson.value
    })
    map.value.addLayer({
      id: ACTIVE_BUSINESS_LAYER_ID,
      type: 'symbol',
      source: ACTIVE_BUSINESS_SOURCE_ID,
      layout: {
        'icon-image': ['concat', 'dogs-business-', ['get', 'businessType']],
        'icon-size': 0.3
      },
      filter: ['boolean', viewerMode === 'active-dog']
    })
    // handles clicks on business records
    map.value.on('click', ACTIVE_BUSINESS_LAYER_ID, async (event) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('TheMap', 'active business record clicked', event)
      }
      const clickedRecordId = event.features?.[0].id
      console.log('clicked record ID', clickedRecordId)
      const collisionBoxes = await collectCollisionBoxesAndFeatures(
        map.value!,
        ACTIVE_BUSINESS_LAYER_ID
      )
      const clickedBox = collisionBoxes
        .find((box) => box.feature.id=== clickedRecordId)
      if (clickedBox == null) {
        console.warn('TheMap', 'clicked business record not found')
        return
      }
      const hiddenBoxes = collisionBoxes.filter((box) => {
        return box !== clickedBox && boxesIntersect(box.box, clickedBox.box)
      })
      for (const box of hiddenBoxes) {
        console.log('hidden record ID', box.feature.id)
      }
    })
    isActiveBusinessLayerReady.value = true
  }
})

// configures the layer for remote business records
watchEffect(() => {
  if (!isMapLoaded.value) {
    return
  }
  if (map.value == null) {
    console.error('TheMap', 'map is loaded but no instance exists')
    return
  }
  if (!isActiveBusinessLayerReady.value) {
    // active business layer must be ready first,
    // because the remote layer should be laid under it.
    if (process.env.NODE_ENV !== 'production') {
      console.log('TheMap', 'active business layer is not ready yet')
    }
    return
  }
  const viewerMode = props.viewerMode
  const source = map.value.getSource(REMOTE_BUSINESS_SOURCE_ID)
  if (source == null) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('TheMap', 'initializing remote business records layer')
    }
    map.value.addSource(REMOTE_BUSINESS_SOURCE_ID, {
      type: 'vector',
      tiles: [`${import.meta.env.VITE_DOGS_BUSINESS_MAP_API_BASE_URL}/tile/{z}/{x}/{y}/tile.mvt`]
    })
    map.value.addLayer({
      id: REMOTE_BUSINESS_LAYER_ID,
      type: 'symbol',
      source: REMOTE_BUSINESS_SOURCE_ID,
      'source-layer': 'business_records',
      layout: {
        'icon-image': viewerMode === 'global'
          ? ['concat', 'dogs-business-', ['get', 'businessType']]
          : ['concat', 'dogs-business-', ['get', 'businessType'], '-inactive'],
        'icon-size': 0.3
      },
      // excludes business records in the active business records
      ...(viewerMode !== 'global' ? { filter: ['!', ['has', ['get', 'recordId'], ['literal', activeBusinessRecordIdTable.value]]] } : {})
    }, ACTIVE_BUSINESS_LAYER_ID)
    // handles clicks on business records
    map.value.on('click', REMOTE_BUSINESS_LAYER_ID, async (event) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('TheMap', 'remote business record clicked', event)
      }
      const clickedRecordId = event.features?.[0].id
      console.log('clicked record ID', clickedRecordId)
      const collisionBoxes = await collectCollisionBoxesAndFeatures(
        map.value!,
        REMOTE_BUSINESS_LAYER_ID
      )
      const clickedBox = collisionBoxes
        .find((box) => box.feature.id=== clickedRecordId)
      if (clickedBox == null) {
        console.warn('TheMap', 'clicked business record not found')
        return
      }
      const hiddenBoxes = collisionBoxes.filter((box) => {
        return box !== clickedBox && boxesIntersect(box.box, clickedBox.box)
      })
      for (const box of hiddenBoxes) {
        console.log('hidden record ID', box.feature.id, box.feature.properties?.recordId)
      }
    })

  } else {
    if (process.env.NODE_ENV !== 'production') {
      console.log('TheMap', 'source for remote business records already exists')
    }
    map.value.setLayoutProperty(
      REMOTE_BUSINESS_LAYER_ID,
      'icon-image',
      viewerMode === 'global'
        ? ['concat', 'dogs-business-', ['get', 'businessType']]
        : ['concat', 'dogs-business-', ['get', 'businessType'], '-inactive']
    )
    map.value.setFilter(
      REMOTE_BUSINESS_LAYER_ID,
      viewerMode !== 'global' ? ['!', ['has', ['get', 'recordId'], ['literal', activeBusinessRecordIdTable.value]]] : null
    )
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
      if (!locationTracker.isTracking) {
        try {
          if (toastForTrackingStart.value == null) {
            toastForTrackingStart.value = toast.open({
              message: t('message.starting_location_tracking'),
              type: 'is-info',
              indefinite: true
            })
          }
          locationTracker.startTracking()
        } catch (err) {
          console.error('TheMap', 'failed to start tracking:', err)
          toastForTrackingStart.value?.close()
          toastForTrackingStart.value = undefined
        }
      }
      break
    case 'hidden':
      // stops tracking the current location
      try {
        toastForTrackingStart.value?.close()
        toastForTrackingStart.value = undefined
        locationTracker.stopTracking()
      } catch (err) {
        console.error('TheMap', 'failed to stop tracking:', err)
      }
      isDraggingMarker.value = false
      pinnedLocation.value = undefined
      isOutOfRange.value = false
      // TODO: prohibit the user from placing business records until the
      //       location is updated
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
// won't update the location if the marker is pinned
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
  if (pinnedLocation.value != null) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('TheMap', 'location is pinned')
    }
    return
  }
  if (locationMarker.value == null) {
    locationMarker.value = markRaw(new maplibregl.Marker({
      color: DOGS_BUSINESS_PRIMARY,
      draggable: true
    }))
    locationMarker.value
      .setLngLat([coords.longitude, coords.latitude])
      .setPopup(actionsPopup.value)
      .addTo(map.value)
    // shows the marker range while dragging
    locationMarker.value.on('dragstart', () => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('TheMap', 'marker dragstart')
      }
      isDraggingMarker.value = true
      if (pinnedLocation.value == null) {
        pinnedLocation.value = locationMarker.value!.getLngLat()
      }
      checkMarkerRange()
    })
    locationMarker.value.on('drag', () => {
      checkMarkerRange()
    })
    locationMarker.value.on('dragend', () => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('TheMap', 'marker dragend')
      }
      isDraggingMarker.value = false
      checkMarkerRange()
    })
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

// checks if the dragged marker is in the acceptable range.
const checkMarkerRange = () => {
  if (locationMarker.value == null) {
    console.warn('TheMap', 'location marker is unavailable')
    return
  }
  if (pinnedLocation.value == null) {
    console.warn('TheMap', 'location must have been pinned')
    return
  }
  const location = locationMarker.value.getLngLat()
  const distance = location.distanceTo(pinnedLocation.value)
  isOutOfRange.value = distance > MAX_MARKER_RANGE_IN_METERS
  if (isOutOfRange.value) {
    locationMarker.value.addClassName('marker-out-of-range')
    locationMarker.value.removeClassName('marker-within-range')
  } else {
    locationMarker.value.addClassName('marker-within-range')
    locationMarker.value.removeClassName('marker-out-of-range')
  }
}

watchEffect(() => {
  if (map.value == null) {
    return
  }
  if (locationMarker.value == null) {
    return
  }
  if (isDraggingMarker.value) {
    if (pinnedLocation.value == null) {
      console.warn('TheMap', 'location must have been pinned')
      return
    }
    markerRangeLayer.fill = isOutOfRange.value
      ? { ...DOGS_BUSINESS_DANGER_RGB, alpha: MARKER_RANGE_LAYER_ALPHA }
      : { ...DOGS_BUSINESS_PRIMARY_RGB, alpha: MARKER_RANGE_LAYER_ALPHA }
    if (map.value.getLayer(MARKER_RANGE_LAYER_ID) == null) {
      markerRangeLayer.center = pinnedLocation.value
      // inserts under the business records
      if (map.value.getLayer(ACTIVE_BUSINESS_LAYER_ID) != null) {
        map.value.addLayer(markerRangeLayer, ACTIVE_BUSINESS_LAYER_ID)
      } else {
        map.value.addLayer(markerRangeLayer)
      }
    }
  } else {
    if (map.value.getLayer(MARKER_RANGE_LAYER_ID) != null) {
      map.value.removeLayer(MARKER_RANGE_LAYER_ID)
    }
    // resets the marker range state if the location is not pinned
    if (pinnedLocation.value == null) {
      locationMarker.value.removeClassName('marker-within-range')
      locationMarker.value.removeClassName('marker-out-of-range')
    }
  }
})

watch(() => locationTracker.state, (state) => {
  switch (state) {
    case 'untracking':
    case 'starting_tracking':
      break
    case 'tracking':
      toastForTrackingStart.value?.close()
      toastForTrackingStart.value = undefined
      break // OK
    case 'permission_denied':
      toastForTrackingStart.value?.close()
      toastForTrackingStart.value = undefined
      toast.open({
        message: t('message.enable_location_tracking'),
        type: 'is-danger'
      })
      break
    case 'unavailable':
      toastForTrackingStart.value?.close()
      toastForTrackingStart.value = undefined
      toast.open({
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

const hideActionsPopup = () => {
  const popup = actionsPopup.value
  if (popup != null && popup.isOpen()) {
    popup.remove()
  }
}

const placePee = () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('TheMap', 'placing pee')
  }
  addBusinessRecordAtCurrentMarker('pee')
  hideActionsPopup()
  askCleanup()
}

const placePoo = () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('TheMap', 'placing poo')
  }
  addBusinessRecordAtCurrentMarker('poo')
  hideActionsPopup()
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
    },
    timestamp: Math.floor(Date.now() / 1000)
  })
}

const askCleanup = () => {
  const dogName = currentDog.value?.name || t('term.your_dog_friend')
  snackbar.open({
    message: t('message.clean_up_after', [dogName]),
    type: 'is-info',
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
      <template v-if="currentDog != null">
        <MapActionsPopup
          v-if="!isOutOfRange"
          :dog="currentDog"
          @pee="placePee"
          @poo="placePoo"
        />
        <p v-else>
          {{ t('message.too_far_from_your_detected_location') }}
        </p>
      </template>
      <template v-else>
        <p v-if="!isLoadingDog">
          <router-link :to="{ name: 'new-profile' }">
            {{ t('message.register_your_dog_friend') }}
          </router-link>
        </p>
        <p v-else class="block">
          {{ t('message.loading_data') }}
        </p>
      </template>
    </div>
  </div>
</template>

<style scoped>
.map-container {
  width: 100%;
  height: 100%;
}

.hidden {
  display: none;
}
</style>
