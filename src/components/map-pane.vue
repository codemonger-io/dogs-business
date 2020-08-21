<template>
  <div class="map-pane">
    <div
      ref="mapbox-container"
      class="mapbox-container"
    />
    <!-- popup elements -->
    <div
      ref="event-popup"
      class="mapbox-popup"
    >
      <p>Here your dog did</p>
      <div class="level">
        <p class="level-item">
          <button class="button circle-button">
            <span class="icon">
              <img
                class="image is-24x24"
                src="@assets/images/pee.svg"
              />
            </span>
          </button>
        </p>
        <p class="level-item">
          <button
            class="button circle-button"
            @click="onPooButtonClicked"
          >
            <span class="icon">
              <img
                class="image is-24x24"
                src="@assets/images/poo.svg"
              />
            </span>
          </button>
        </p>
      </div>
    </div>
  </div>
</template>

<script>
import mapboxgl from 'mapbox-gl'

import pooPngPath from '@assets/images/poo.png'

// obtains the access token from the URL
const paramString = window.location.search
const urlParams = new URLSearchParams(paramString)
if (urlParams.has('access-token')) {
  mapboxgl.accessToken = urlParams.get('access-token')
} else {
  console.error('specify a Mapbox access token to access-token parameter')
}

// generates a random point that fits in give ranges.
function generatePoint (ranges) {
  const {
    minLongitude,
    maxLongitude,
    minLatitude,
    maxLatitude
  } = ranges
  const longitudinalExtent = maxLongitude - minLongitude
  const latitudinalExtent = maxLatitude - minLatitude
  const longitude = (longitudinalExtent * Math.random()) + minLongitude
  const latitude = (latitudinalExtent * Math.random()) + minLatitude
  return [
    longitude,
    latitude
  ]
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
  data () {
    return {
      pooSpotsData: {
        type: 'FeatureCollection',
        features: []
      },
      // Mapbox objects should not become reactive.
      getNonReactive: makeNonReactive({
        map: null,
        marker: null
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
  methods: {
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
      const EARTH_CIRCUMFERENCE = 40075 * 1000
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
        map.loadImage(
          pooPngPath,
          (error, image) => {
            if (error) {
              console.error('failed to load image', error)
              throw error
            }
            map.addImage('poo', image)
            map.addSource('poo-spots', {
              type: 'geojson',
              data: this.pooSpotsData
            })
            map.addLayer({
              id: 'poo-spots',
              type: 'symbol',
              source: 'poo-spots',
              layout: {
                'icon-image': 'poo',
                'icon-size': 0.375
              }
            })
            map.on('click', 'poo-spots', event => {
              console.log(event)
              console.log(`you stepped in ${event.features[0].properties.name}`)
            })
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
    onPooButtonClicked () {
      if (process.env.NODE_ENV !== 'production') {
        console.log('poo button clicked')
      }
      const {
        map,
        marker
      } = this.getNonReactive()
      const {
        lng,
        lat
      } = marker.getLngLat()
      const range = 360.0 * (300 / (40075 * 1000)) // scatters around 300 meters
      const point = generatePoint({
        minLongitude: lng - range,
        maxLongitude: lng + range,
        minLatitude: lat - range,
        maxLatitude: lat + range
      })
      this.pooSpotsData.features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: point
        },
        properties: {
          name: `poo-${this.pooSpotsData.features.length}`
        }
      })
      map.getSource('poo-spots')
        .setData(this.pooSpotsData)
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
}

.button {
  &.circle-button {
    border-radius: 50%;
  }
}
</style>
