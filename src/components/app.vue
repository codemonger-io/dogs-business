<template>
  <div>
    <div class="level is-mobile app-title">
      <div class="level-left">
        <div class="level-item">
          <img
            class="image is-48x48"
            src="@assets/images/dogs-business.svg"
          />
        </div>
        <div class="level-item">
          <h1 class="title is-5 dogs-business-title">
            Dog's Business
          </h1>
        </div>
      </div>
    </div>
    <div
      class="map-container"
    >
      <map-pane />
    </div>
    <dog-registration-modal
      ref="dog-registration-modal"
      @registering-dog="onRegisteringDog"
      @registration-omitted="onRegistrationOmitted"
    />
  </div>
</template>

<script>
import MapPane from '@components/map-pane'
import DogRegistrationModal from '@components/dog-registration-modal'

/**
 * Application component.
 *
 * @namespace App
 *
 * @memberof module:components
 */
export default {
  name: 'App',
  components: {
    MapPane,
    DogRegistrationModal
  },
  mounted () {
    if (process.env.NODE_ENV !== 'production') {
      console.log('App', 'mounted')
    }
    this.showDogRegistrationModal()
  },
  methods: {
    showDogRegistrationModal () {
      this.$refs['dog-registration-modal'].show()
    },
    hideDogRegistrationModal () {
      this.$refs['dog-registration-modal'].hide()
    },
    onRegisteringDog (dog) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('registering dog', dog)
      }
      this.hideDogRegistrationModal()
    },
    onRegistrationOmitted () {
      if (process.env.NODE_ENV !== 'production') {
        console.log('registration omitted')
      }
      this.hideDogRegistrationModal()
    }
  }
}
</script>

<style lang="scss" scoped>
.app-title {
  display: inline-block;
  padding: 0.5em 1.0em;
  background-color: #299250;
  box-shadow: 0 0 2px 1px gray;
}

.map-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: -1; /* shows as the background. */
}
</style>
