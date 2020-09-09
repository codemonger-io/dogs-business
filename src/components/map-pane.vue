<template>
  <div class="map-pane">
    <div
      ref="mapbox-container"
      class="mapbox-container"
    />
    <!-- DEBUG -->
    <svg
      v-if="debugMode"
      xmlns:svg="http://www.w3.org/2000/svg"
      ref="debug-pane"
      class="debug-pane"
      :class="debugPaneClass"
      :width="debugPane.width"
      :height="debugPane.height"
      @click="hideDebugPane"
    >
      <g class="debug-pane-contents" />
      <text
        x="10"
        y="80"
        font-size="18"
        fill="red"
        font-weight="bold"
      >
        DEBUG PANE IS SHOWN. Click to hide.
      </text>
    </svg>
    <!-- icon buttons shown bottom right -->
    <div class="map-overlay map-overlay-bottom-right">
      <div class="map-overlay-contents">
        <map-controller
          :is-tracking-location="isTrackingLocation"
          @toggling-location-tracking="toggleLocationTracking"
          @centering-current-location="centerCurrentLocation"
        />
      </div>
    </div>
    <!-- popup elements -->
    <div
      ref="business-record-input-popup"
      class="mapbox-popup dogs-business-body"
    >
      <business-record-input
        :dog="currentDog"
        @adding-business-record="onAddingBusinessRecord"
      />
    </div>
    <div
      ref="business-statistics-popup"
      class="mapbox-popup dogs-business-body"
    >
      <business-statistics
        :business-records="selectedBusinessRecords"
        :business-records-ready="selectedBusinessRecordsReady"
        @listing-business-records="onListingBusinessRecords"
      />
    </div>
    <!-- business-record-list precedes other popups-->
    <div
      v-if="showsBusinessRecordList"
      class="map-overlay map-overlay-top-left business-record-list-container"
    >
      <div class="map-overlay-contents">
        <business-record-list-frame
          ref="business-record-list-frame"
          :business-records="selectedBusinessRecords"
          :resize-trigger="resizeTrigger"
          @business-record-selected="onBusinessRecordSelected"
          @closing-frame="onBusinessRecordListFrameClosing"
        />
      </div>
    </div>
  </div>
</template>

<script>
import {
  select as d3Select
} from 'd3-selection'
import mapboxgl from 'mapbox-gl'
import {
  mapActions,
  mapGetters,
  mapState
} from 'vuex'

import { formatDate } from '@db/types/date'
import { getObjectiveFormOfDog } from '@db/types/dog'
import GeolocationTracker from '@utils/geolocation-tracker'
import {
  boxesIntersect,
  collectCollisionBoxesAndFeatures
} from '@utils/mapbox/collision-boxes'
import promiseLoadImage from '@utils/mapbox/promise-load-image'

import BusinessRecordInput from './business-record-input'
import BusinessRecordListFrame from './business-record-list-frame'
import BusinessStatistics from './business-statistics'
import MapController from './map-controller'
import ReleaseEventListenerOnDestroy from '@components/mixins/release-event-listener-on-destroy'

import peePngPath from '@assets/images/pee.png'
import pooPngPath from '@assets/images/poo.png'

// the circumference of the earth
const EARTH_CIRCUMFERENCE = 40075 * 1000
function circumferenceAtLatitude (latitude) {
  const k = Math.cos(Math.PI * (latitude / 180.0))
  return k * EARTH_CIRCUMFERENCE
}

// obtains the access token from the URL
const paramString = window.location.search
const urlParams = new URLSearchParams(paramString)
if (urlParams.has('access-token')) {
  mapboxgl.accessToken = urlParams.get('access-token')
} else {
  console.error('specify a Mapbox access token to access-token parameter')
}

// turns on the debug mode if `debug-mode` is 'true'.
let debugMode = false
if (urlParams.has('debug-mode')) {
  debugMode = urlParams.get('debug-mode').toLowerCase() === 'true'
}

/**
 * Creates a function that returns a non-reactive object.
 *
 * @function makeNonReactive
 *
 * @param {object} obj
 *
 *   Object to be non-reactive.
 *
 * @return {function}
 *
 *   A function that returns `obj`.
 */
function makeNonReactive (obj) {
  return () => obj
}

/**
 * Vue component that displays a map.
 *
 * The map fills the parent element.
 *
 * @namespace MapPane
 *
 * @memberof module:components
 *
 * @vue-prop {number} [resize-trigger=0]
 *
 *   Change to this property triggers the process necessary for this component
 *   after it is resized.
 *   The value itself does not matter.
 *
 *   **NOTE**: If a component individually reacts to a resize event from
 *   `window`, its parent component may not have been resized yet.
 *   An incorrect size will be calculated in that case.
 *   This property is introduced to address this problem.
 */
export default {
  name: 'MapPane',
  mixins: [
    ReleaseEventListenerOnDestroy
  ],
  components: {
    BusinessRecordInput,
    BusinessRecordListFrame,
    BusinessStatistics,
    MapController
  },
  props: {
    resizeTrigger: {
      type: Number,
      default: 0
    }
  },
  data () {
    return {
      isMapInitialized: false,
      isTrackingLocation: false,
      selectedBusinessRecords: [],
      selectedBusinessRecordsReady: true,
      showsBusinessRecordList: false,
      // Mapbox objects should not become reactive.
      getNonReactive: makeNonReactive({
        locationTracker: null,
        map: null,
        marker: null,
        statisticsPopup: null
      }),
      debugMode: debugMode,
      showsDebugPane: debugMode,
      debugPane: {
        width: 100,
        height: 100
      }
    }
  },
  computed: {
    ...mapState('user', [
      'businessRecords',
      'dogs'
    ]),
    ...mapGetters('user', [
      'dogOfId'
    ]),
    currentDog () {
      return (this.dogs.length > 0) ? this.dogs[0] : {}
    },
    currentDogId () {
      return this.currentDog.dogId
    },
    objectiveFormOfCurrentDog () {
      return getObjectiveFormOfDog(this.currentDog)
    },
    // sorts the business records by date in descending order
    // TODO: make it more efficient
    businessRecordsSortedByDate () {
      return this.businessRecords.sort((r1, r2) => {
        if (r1.date < r2.date) {
          return 1
        } else if (r1.date > r2.date) {
          return -1
        } else {
          // newer recordId precedes
          if (r1.recordId < r2.recordId) {
            return 1
          } else if (r1.recordId > r2.recordId) {
            return -1
          } else {
            return 0
          }
        }
      })
    },
    // TODO: make it more efficient
    mappedBusinessRecords () {
      return {
        type: 'FeatureCollection',
        features: this.businessRecordsSortedByDate.map(record => {
          const {
            date,
            dogId,
            location,
            recordId,
            type
          } = record
          const {
            longitude,
            latitude
          } = location
          return {
            type: 'Feature',
            properties: {
              recordId,
              dogId,
              type,
              date
            },
            geometry: {
              type: 'Point',
              coordinates: [
                longitude,
                latitude
              ]
            }
          }
        })
      }
    },
    debugPaneClass () {
      return {
        'is-active': this.showsDebugPane
      }
    }
  },
  watch: {
    resizeTrigger () {
      if (process.env.NODE_ENV !== 'production') {
        console.log('MapPane', 'resizing was triggered')
      }
      if (this.debugMode) {
        this.resizeDebugPane()
      }
    },
    mappedBusinessRecords (newRecords) {
      this.promiseMapInitialized()
        .then(() => {
          const { map } = this.getNonReactive()
          map.getSource('business-records')
            .setData(newRecords)
        })
    }
  },
  mounted () {
    if (process.env.NODE_ENV !== 'production') {
      console.log('MapPane', 'mounted')
    }
    // initializes a geolocation tracker
    this.initializeLocationTracker()
    const { locationTracker } = this.getNonReactive()
    locationTracker.getCurrentPosition()
      .then(position => {
        if (process.env.NODE_ENV !== 'production') {
          console.log('obtained location', position)
        }
        this.initializeMap(position)
        // keeps tracking the location
        this.registerLocationWatcher()
        this.startTrackingLocation()
      })
      .catch(err => console.error(err))
    // initializes the debug pane
    if (this.debugMode) {
      this.resizeDebugPane()
    }
  },
  // makes sure that location tracking is stopped.
  beforeDestroy () {
    const { locationTracker } = this.getNonReactive()
    locationTracker.stopTracking()
  },
  methods: {
    ...mapActions('user', [
      'appendBusinessRecord'
    ]),
    initializeMap ({ coords }) {
      const {
        latitude,
        longitude,
        accuracy
      } = coords
      if (process.env.NODE_ENV !== 'production') {
        console.log('coords', latitude, longitude, accuracy)
      }
      const viewRange = 10 * accuracy
      const zoom = Math.log2(EARTH_CIRCUMFERENCE / viewRange)
      if (process.env.NODE_ENV !== 'production') {
        console.log('zoom', zoom)
      }
      const map = new mapboxgl.Map({
        container: this.$refs['mapbox-container'],
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [
          longitude,
          latitude
        ],
        zoom
      })
      if (this.debugMode) {
        map.showCollisionBoxes = true
      }
      map.on('load', () => {
        const imagesToLoad = [
          {
            name: 'pee',
            path: peePngPath
          },
          {
            name: 'poo',
            path: pooPngPath
          }
        ]
        Promise.all(imagesToLoad.map(info => promiseLoadImage(map, info.path)))
          .then(images => {
            images.forEach((image, i) => {
              map.addImage(imagesToLoad[i].name, image)
            })
            map.addSource('business-records', {
              type: 'geojson',
              data: this.mappedBusinessRecords
            })
            map.addLayer({
              id: 'business-records',
              type: 'symbol',
              source: 'business-records',
              layout: {
                'icon-image': ['get', 'type'],
                'icon-size': 0.375
              }
            })
            map.on('click', 'business-records', record => {
              if (process.env.NODE_ENV !== 'production') {
                console.log('MapPane', 'click', record)
              }
              const { recordId } = record.features[0].properties
              // selects records hidden by the clicked icon
              this.selectedBusinessRecords = []
              this.selectedBusinessRecordsReady = false
              collectCollisionBoxesAndFeatures(
                map,
                'business-records')
                .then(collisionBoxes => {
                  // locates the clicked collision box
                  // and collects boxes intersecting it
                  const clickedBox = collisionBoxes
                    .find(box => box.feature.properties.recordId === recordId)
                  if (!clickedBox) {
                    throw new Error(`clicked record ${recordId} was not in ${collisionBoxes.map(box => box.feature.properties.recordId)}`)
                  }
                  const groupedBoxes = collisionBoxes.filter(box => {
                    return boxesIntersect(
                      clickedBox.collisionBox,
                      box.collisionBox)
                  })
                  this.selectedBusinessRecords = groupedBoxes.map(box => {
                    const {
                      recordId
                    } = box.feature.properties
                    return this.businessRecords
                      .find(r => r.recordId === recordId)
                  })
                  this.selectedBusinessRecordsReady = true
                  // visualizes collision boxes in the debug mode
                  if (this.debugMode) {
                    const svg = d3Select(this.$refs['debug-pane'])
                    const contents = svg.select('g.debug-pane-contents')
                    contents.selectAll('rect').remove()
                    contents.selectAll('rect')
                      .data(groupedBoxes)
                      .join('rect')
                        .attr('x', b => b.collisionBox.x1)
                        .attr('y', b => b.collisionBox.y1)
                        .attr('width', b => b.collisionBox.x2 - b.collisionBox.x1)
                        .attr('height', b => b.collisionBox.y2 - b.collisionBox.y1)
                        .attr('fill-opacity', 0.25)
                        .attr('fill', 'red')
                    this.showsDebugPane = true
                  }
                })
                .catch(err => {
                  console.error(err)
                  if (this.debugMode) {
                    const svg = d3Select(this.$refs['debug-pane'])
                    const contents = svg.select('g.debug-pane-contents')
                    contents.selectAll('text').remove()
                    contents.append('text')
                      .attr('x', 10)
                      .attr('y', 150)
                      .attr('font-size', 9)
                      .attr('fill', 'black')
                      .text('' + err)
                    this.showsDebugPane = true
                  }
                })
              // shows a stats popup anyway
              const position = record.features[0].geometry.coordinates
              this.showBusinessStatisticsPopup(position)
            })
            // notifies that the map is initialized.
            this.isMapInitialized = true
          })
          .catch(error => {
            console.error('failed to load images', error)
          })
      })
      const marker = new mapboxgl.Marker()
      marker.setLngLat([
        longitude,
        latitude
      ])
      marker.addTo(map)
      const inputPopup = new mapboxgl.Popup()
      inputPopup.setDOMContent(this.$refs['business-record-input-popup'])
      marker.setPopup(inputPopup)
      marker.togglePopup() // should open the popup
      // saves Mapbox related instances in the non-reactive object
      const nonReactive = this.getNonReactive()
      nonReactive.map = map
      nonReactive.marker = marker
      // initializes a business statistics popup
      this.initializeBusinessStatisticsPopup()
    },
    initializeBusinessStatisticsPopup () {
      const popup = new mapboxgl.Popup({
        closeOnMove: true
      })
      popup.setDOMContent(this.$refs['business-statistics-popup'])
      const nonReactive = this.getNonReactive()
      nonReactive.statisticsPopup = popup
    },
    // makes sure that initialization of the map has finished.
    // returns a Promise that
    // resolves immediately if the map has been initialized at the call
    // otherwise waits until the map is initialized.
    promiseMapInitialized () {
      if (this.isMapInitialized) {
        return Promise.resolve(true)
      } else {
        let unwatch
        return new Promise(resolve => {
          unwatch = this.$watch('isMapInitialized', flag => {
            resolve(flag)
          })
        })
          .finally(unwatch)
      }
    },
    setPopupOpen (isOpen) {
      const { marker } = this.getNonReactive()
      if (marker.getPopup().isOpen() !== isOpen) {
        marker.togglePopup()
      }
    },
    showBusinessStatisticsPopup (position) {
      const {
        map,
        statisticsPopup
      } = this.getNonReactive()
      statisticsPopup
        .setLngLat(position)
        .addTo(map)
    },
    initializeLocationTracker () {
      const tracker = new GeolocationTracker({
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 1000,
        retryCount: 3
      })
      const nonReactive = this.getNonReactive()
      nonReactive.locationTracker = tracker
    },
    registerLocationWatcher () {
      if (process.env.NODE_ENV !== 'production') {
        console.log('registering location watcher')
      }
      const { locationTracker } = this.getNonReactive()
      console.log(locationTracker)
      locationTracker.addEventListener('tracking-started', event => {
        if (process.env.NODE_ENV !== 'production') {
          console.log('MapPane', 'tracking-started', event)
        }
        this.isTrackingLocation = true
      })
      locationTracker.addEventListener('tracking-stopped', event => {
        if (process.env.NODE_ENV !== 'production') {
          console.log('MapPane', 'tracking-stopped', event)
        }
        this.isTrackingLocation = false
      })
      locationTracker.addEventListener('location-updated', event => {
        if (process.env.NODE_ENV !== 'production') {
          console.log('MapPane', 'location-updated', event)
        }
        this.updateLocation(event.position)
      })
      locationTracker.addEventListener('location-error', event => {
        if (process.env.NODE_ENV !== 'production') {
          console.log('MapPane', 'location-error', event)
        }
      })
      // toggles location tracking when the visibility changes.
      // - stops location tracking when the application is hidden.
      // - starts location tracking when the application is shown again.
      //   and centers the current location.
      this.registerEventListener(document, 'visibilitychange', event => {
        if (process.env.NODE_ENV !== 'production') {
          console.log('visibilitychange', event, document.hidden)
        }
        if (document.hidden) {
          locationTracker.stopTracking()
        } else {
          locationTracker.getCurrentPosition()
            .then(position => {
              this.updateLocation(position)
              this.centerCurrentLocation()
              locationTracker.startTracking()
            })
            .catch(err => console.error(err))
        }
      })
    },
    startTrackingLocation () {
      if (process.env.NODE_ENV !== 'production') {
        console.log('start tracking location')
      }
      const { locationTracker } = this.getNonReactive()
      locationTracker.startTracking()
    },
    stopTrackingLocation () {
      if (process.env.NODE_ENV !== 'production') {
        console.log('stop tracking location')
      }
      const { locationTracker } = this.getNonReactive()
      locationTracker.stopTracking()
    },
    updateLocation ({ coords }) {
      const {
        latitude,
        longitude
      } = coords
      const { marker } = this.getNonReactive()
      marker.setLngLat([
        longitude,
        latitude
      ])
    },
    toggleLocationTracking () {
      const { locationTracker } = this.getNonReactive()
      if (this.isTrackingLocation) {
        this.stopTrackingLocation()
      } else {
        this.startTrackingLocation()
      }
    },
    // centers the current location on the map.
    // opens a business popup if it is closed after centering.
    centerCurrentLocation () {
      if (process.env.NODE_ENV !== 'production') {
        console.log('centering current location')
      }
      const {
        map,
        marker
      } = this.getNonReactive()
      this.centerLocation(marker.getLngLat())
      map.once('moveend', () => {
        this.setPopupOpen(true)
      })
    },
    centerLocation ({ lng, lat }) {
      const { map } = this.getNonReactive()
      map.flyTo({
        center: [lng, lat],
        curve: 0
      })
    },
    onAddingBusinessRecord (type) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('adding a business record', type)
      }
      this.addBusinessRecord(type)
        .then(() => this.showCleanUpMessage())
      this.setPopupOpen(false)
    },
    // returns Promise that resolves
    // when a business record is successfully appended.
    addBusinessRecord (type) {
      const { marker } = this.getNonReactive()
      const {
        lng: longitude,
        lat: latitude
      } = marker.getLngLat()
      const location = {
        longitude,
        latitude
      }
      const date = formatDate(new Date())
      return this.appendBusinessRecord({
        dogId: this.currentDogId,
        type,
        location,
        date
      })
        .catch(err => console.error(err))
    },
    showCleanUpMessage () {
      this.$buefy.toast.open({
        type: 'is-info',
        position: 'is-top',
        duration: 2000, // 2s
        // TODO: how to directly specify an element for a toast message?
        //       if I could directly use BToast, I could specifiy its slot.
        //       but it seems that buefy does not expose BToast.
        message: `<span style="font-weight:bold;">Clean up after ${getObjectiveFormOfDog(this.currentDog)}.</span>`
      })
    },
    onListingBusinessRecords () {
      if (process.env.NODE_ENV !== 'production') {
        console.log('MapPane', 'listing-business-records')
      }
      this.showsBusinessRecordList = true
    },
    onBusinessRecordSelected ({ businessRecord }) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('MapPane', 'business-record-selected', businessRecord)
      }
      // centers the business record
      const {
        longitude,
        latitude
      } = businessRecord.location
      this.centerLocation({
        lng: longitude,
        lat: latitude
      })
    },
    onBusinessRecordListFrameClosing () {
      if (process.env.NODE_ENV !== 'production') {
        console.log('MapPane', 'closing-frame')
      }
      this.showsBusinessRecordList = false
    },
    // DEBUG
    resizeDebugPane () {
      const mapContainer = this.$refs['mapbox-container']
      const {
        width,
        height
      } = mapContainer.getBoundingClientRect()
      this.debugPane.width = width
      this.debugPane.height = height
    },
    // DEBUG
    hideDebugPane () {
      const svg = d3Select(this.$refs['debug-pane'])
      const contents = svg.select('g.debug-pane-contents')
      contents.selectAll('rect').remove()
      contents.selectAll('text').remove()
      this.showsDebugPane = false
    }
  }
}
</script>

<style lang="scss" scoped>
@import "~bulma/sass/utilities/initial-variables.sass";

.map-pane {
  position: relative;
  width: 100%;
  height: 100%;

  .debug-pane {
    display: none;
    position: absolute;
    top: 0;
    left: 0;

    &.is-active {
      display: block;
    }
  }

  .mapbox-container {
    width: 100%;
    height: 100%;
  }

  .map-overlay {
    position: absolute;

    &.map-overlay-top-left {
      top: 0;
      left: 0;
    }

    &.map-overlay-bottom-right {
      bottom: 0;
      right: 0;
    }

    .map-overlay-contents {
      padding: 0.75em;
      padding-bottom: 3.0em;
    }
  }

  .business-record-list-container {
    width: 20rem;
    min-width: 20rem;
    max-width: 20rem;
    height: 100%;

    .map-overlay-contents {
      width: 100%;
      height: 100%;
    }
  }
  @media screen and (max-width: $tablet) {
    .business-record-list-container {
      width: 100%;
      min-width: 100%;
      max-width: 100%;
    }
  }
}
</style>
