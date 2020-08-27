<template>
  <div>
    <!-- current location -->
    <div>
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
/**
 * Component to control the map.
 *
 * @namespace MapController
 *
 * @memberof module:components
 *
 * @vue-event {nothing} centering-current-location
 *
 *   Notified when the current location button is clicked.
 */
export default {
  name: 'MapController',
  methods: {
    onCurrentLocationButtonClicked () {
      if (process.env.NODE_ENV !== 'production') {
        console.log('current location button clicked')
      }
      this.$emit('centering-current-location')
    }
  }
}
</script>
