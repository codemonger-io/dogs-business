<template>
  <div class="map-pane">
    <div
      ref="mapbox-container"
      class="mapbox-container"
    />
    <!-- icon buttons shown bottom right -->
    <div class="map-overlay map-overlay-bottom-right">
      <div class="map-overlay-contents">
        <map-controller
          @centering-current-location="centerCurrentLocation"
        />
      </div>
    </div>
    <!-- popup elements -->
    <div
      ref="event-popup"
      class="mapbox-popup dogs-business-body"
    >
      <business-record-input
        :dog="currentDog"
        @adding-business-record="onAddingBusinessRecord"
      />
    </div>
  </div>
</template>

<script>
import mapboxgl from 'mapbox-gl'
import {
  mapActions,
  mapGetters,
  mapState
} from 'vuex'

import { formatDate } from '@db/types/date'
import promiseLoadImage from '@utils/mapbox/promise-load-image'

import BusinessRecordInput from './business-record-input'
import MapController from './map-controller'

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
 */
export default {
  name: 'MapPane',
  components: {
    BusinessRecordInput,
    MapController
  },
  data () {
    return {
      locationWatcherId: undefined,
      isMapInitialized: false,
      // Mapbox objects should not become reactive.
      getNonReactive: makeNonReactive({
        map: null,
        marker: null
      })
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
    // TODO: make it more efficient
    mappedBusinessRecords () {
      return {
        type: 'FeatureCollection',
        features: this.businessRecords.map(record => {
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
    }
  },
  watch: {
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
    // tests the Geolocation API
    navigator.geolocation.getCurrentPosition(
      // success
      position => {
        if (process.env.NODE_ENV !== 'production') {
          console.log('obtained location', position)
        }
        this.initializeMap(position)
        // keeps tracking the location
        this.registerLocationWatcher()
      },
      // error
      err => {
        console.error(err)
      },
      // options
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      }
    )
  },
  beforeDestroy () {
    if (this.locationWatcherId !== undefined) {
      navigator.geolocation.clearWatch(this.locationWatcherId)
    }
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
              console.log(record)
              const {
                recordId,
                dogId,
                type,
                date
              } = record.features[0].properties
              console.log(`you stepped in ${type}-${recordId} made by ${this.dogOfId(dogId).name} on ${date}`)
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
      const eventPopup = new mapboxgl.Popup()
      eventPopup.setDOMContent(this.$refs['event-popup'])
      marker.setPopup(eventPopup)
      marker.togglePopup() // should open the popup
      // saves map and marker in the non-reactive object
      const nonReactive = this.getNonReactive()
      nonReactive.map = map
      nonReactive.marker = marker
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
    registerLocationWatcher (locationOptions) {
      this.locationWatcherId = navigator.geolocation.watchPosition(
        // success
        position => {
          if (process.env.NODE_ENV !== 'production') {
            console.log('updating the location', position)
          }
          this.updateLocation(position)
        },
        // error
        error => {
          console.error('failed to get the location', error)
        },
        // options
        // TODO: test on a mobile device
        {
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 1000
        }
      )
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
    // centers the current location on the map.
    // opens a business popup if it is closed after centering.
    centerCurrentLocation () {
      if (process.env.NODE_ENV !== 'production') {
        console.log('cetering current location')
      }
      const {
        map,
        marker
      } = this.getNonReactive()
      const {
        lng,
        lat
      } = marker.getLngLat()
      map.flyTo({
        center: [lng, lat],
        curve: 0
      })
      map.on('moveend', () => {
        this.setPopupOpen(true)
      })
    },
    onAddingBusinessRecord (type) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('adding a business record', type)
      }
      this.addBusinessRecord(type)
      this.setPopupOpen(false)
    },
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
      this.appendBusinessRecord({
        dogId: this.currentDogId,
        type,
        location,
        date
      })
        .then(() => {
          // TODO: show "Please clean up after your dog" message.
          console.log('please clean up after your dog!')
        })
        .catch(err => console.error(err))
    }
  }
}
</script>

<style lang="scss" scoped>
.map-pane {
  width: 100%;
  height: 100%;

  .mapbox-container {
    width: 100%;
    height: 100%;
  }

  .map-overlay {
    position: absolute;

    &.map-overlay-bottom-right {
      bottom: 0;
      right: 0;

      .map-overlay-contents {
        padding-bottom: 3.0em;
      }
    }

    .map-overlay-contents {
      padding: 0.75em;
    }
  }
}
</style>
