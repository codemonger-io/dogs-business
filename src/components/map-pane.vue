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
          <button
            class="button circle-button"
            @click="onPeeButtonClicked"
          >
            <span class="icon">
              <img
                class="image is-24x24"
                src="@assets/images/pee.png"
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
                src="@assets/images/poo.png"
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

import promiseLoadImage from '@utils/mapbox/promise-load-image'

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
      eventsData: {
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
            map.addSource('events', {
              type: 'geojson',
              data: this.eventsData
            })
            map.addLayer({
              id: 'events',
              type: 'symbol',
              source: 'events',
              layout: {
                'icon-image': ['get', 'type'],
                'icon-size': 0.375
              }
            })
            map.on('click', 'events', event => {
              console.log(event)
              console.log(`you stepped in ${event.features[0].properties.name}`)
            })
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
    onPooButtonClicked () {
      if (process.env.NODE_ENV !== 'production') {
        console.log('poo button clicked')
      }
      this.addEvent('poo')
    },
    onPeeButtonClicked () {
      if (process.env.NODE_ENV !== 'production') {
        console.log('pee button clicked')
      }
      this.addEvent('pee')
    },
    addEvent (type) {
      const {
        map,
        marker
      } = this.getNonReactive()
      const {
        lng,
        lat
      } = marker.getLngLat()
      // scatters around 300 meters
      const lngRange = 360.0 * (300 / circumferenceAtLatitude(lat))
      const latRange = 360.0 * (300 / EARTH_CIRCUMFERENCE)
      const point = generatePoint({
        minLongitude: lng - lngRange,
        maxLongitude: lng + lngRange,
        minLatitude: lat - latRange,
        maxLatitude: lat + latRange
      })
      this.eventsData.features.push({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: point
        },
        properties: {
          type,
          name: `${type}-${this.eventsData.features.length}`
        }
      })
      map.getSource('events')
        .setData(this.eventsData)
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
