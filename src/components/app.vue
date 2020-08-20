<template>
  <div>
    <h1>Dog's Business</h1>
    <div
      class="map-container"
    >
      <map-pane />
    </div>
  </div>
</template>

<script>
import MapPane from '@components/map-pane'

export default {
  name: 'App',
  components: {
    MapPane
  }
}
</script>

<style lang="scss" scoped>
.map-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: -1; /* shows as the background. */
}
</style>
