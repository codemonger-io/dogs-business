<template>
  <div class="map-pane">
    <div
      ref="mapbox-container"
      class="mapbox-container"
    />
  </div>
</template>

<script>
import mapboxgl from 'mapbox-gl'

// obtains the access token from the URL
const paramString = window.location.search
const urlParams = new URLSearchParams(paramString)
if (urlParams.has('access-token')) {
  mapboxgl.accessToken = urlParams.get('access-token')
} else {
  console.error('specify a Mapbox access token to access-token parameter')
}

export default {
  name: 'MapPane',
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
      const EARTH_CIRCUMFERENCE =40075 * 1000
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
      const marker = new mapboxgl.Marker()
      marker.setLngLat([
        longitude,
        latitude
      ])
      marker.addTo(map)
    }
  }
}
</script>

<style lang="scss" scoped>
.mapbox-container {
  width: 400px;
  height: 400px;
}
</style>
