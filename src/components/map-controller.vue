<template>
  <div>
    <!-- location tracking state -->
    <div class="button-container">
      <button
        class="button circle-button"
        @click.stop="onLocationTrackingButtonClicked"
      >
        <span class="icon is-small">
          <img
            class="image is-16x16"
            :src="locationTrackingImage"
          >
        </span>
      </button>
    </div>
    <!-- current location -->
    <div class="button-container">
      <button
        class="button circle-button"
        @click.stop="onCurrentLocationButtonClicked"
      >
        <span class="icon is-small">
          <i class="mdi mdi-18px mdi-crosshairs-gps" />
        </span>
      </button>
    </div>
  </div>
</template>

<script>
import navigationOnSvg from '@assets/images/navigation-on.svg'
import navigationOffSvg from '@assets/images/navigation-off.svg'

/**
 * Component to control the map.
 *
 * @namespace MapController
 *
 * @memberof module:components
 *
 * @vue-prop {Boolean} is-tracking-location
 *
 *   Whether location tracking is active.
 *
 * @vue-event {nothing} toggling-location-tracking
 *
 *   Notified when the location tracking button is clicked.
 *
 * @vue-event {nothing} centering-current-location
 *
 *   Notified when the current location button is clicked.
 */
export default {
  name: 'MapController',
  props: {
    isTrackingLocation: {
      type: Boolean,
      required: true,
    },
  },
  emits: ['centering-current-location', 'toggling-location-tracking'],
  computed: {
    locationTrackingImage () {
      return this.isTrackingLocation ? navigationOnSvg : navigationOffSvg
    },
  },
  methods: {
    onLocationTrackingButtonClicked () {
      if (process.env.NODE_ENV !== 'production') {
        console.log('location tracking button clicked')
      }
      this.$emit('toggling-location-tracking')
    },
    onCurrentLocationButtonClicked () {
      if (process.env.NODE_ENV !== 'production') {
        console.log('current location button clicked')
      }
      this.$emit('centering-current-location')
    },
  },
}
</script>

<style lang="scss" scoped>
.button-container {
  &:not(:last-child) {
    margin-bottom: 1.5em;
  }
}
</style>
