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

// generates random points.
function generatePoints (params) {
  const {
    numPoints,
    minLongitude,
    maxLongitude,
    minLatitude,
    maxLatitude
  } = params
  const longitudinalExtent = maxLongitude - minLongitude
  const latitudinalExtent = maxLatitude - minLatitude
  const points = []
  for (let i = 0; i < numPoints; ++i) {
    const longitude = (longitudinalExtent * Math.random()) + minLongitude
    const latitude = (latitudinalExtent * Math.random()) + minLatitude
    points.push([
      longitude,
      latitude
    ])
  }
  console.log(points)
  return points
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
      const EARTH_CIRCUMFERENCE = 40075 * 1000
      const zoom = Math.log2(EARTH_CIRCUMFERENCE / viewRange)
      if (process.env.NODE_ENV !== 'production') {
        console.log('zoom', zoom)
      }
      const scatterRange = 360.0 * (300 / (40075 * 1000)) // scatters around 300 meters
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
          './assets/images/poo.png',
          (error, image) => {
            if (error) {
              console.error('failed to load image', error)
              throw error
            }
            map.addImage('poo', image)
            map.addSource('point', {
              type: 'geojson',
              data: {
                type: 'FeatureCollection',
                features: generatePoints({
                  numPoints: 20,
                  minLongitude: longitude - scatterRange,
                  maxLongitude: longitude + scatterRange,
                  minLatitude: latitude - scatterRange,
                  maxLatitude: latitude + scatterRange
                }).map((p, i) => {
                  return {
                    type: 'Feature',
                    properties: {
                      name: `poo-${i}`
                    },
                    geometry: {
                      type: 'Point',
                      coordinates: p
                    }
                  }
                })
              }
            })
            map.addLayer({
              id: 'poo-spots',
              type: 'symbol',
              source: 'point',
              layout: {
                'icon-image': 'poo',
                'icon-size': 0.5
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
