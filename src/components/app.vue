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
      ref="map-container"
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
import {
  mapActions,
  mapGetters,
  mapState
} from 'vuex'

import MapPane from '@components/map-pane'
import DogRegistrationModal from '@components/dog-registration-modal'
import ReleaseEventListenerOnDestroy from '@components/mixins/release-event-listener-on-destroy'

/**
 * Application component.
 *
 * @namespace App
 *
 * @memberof module:components
 */
export default {
  name: 'App',
  mixins: [
    ReleaseEventListenerOnDestroy
  ],
  components: {
    MapPane,
    DogRegistrationModal
  },
  computed: {
    ...mapState('user', [
      'isLoaded'
    ]),
    ...mapGetters('user', [
      'dogCount'
    ])
  },
  mounted () {
    if (process.env.NODE_ENV !== 'production') {
      console.log('App', 'mounted')
    }
    // makes the map exactly fill the window.
    // this is necessary because `100vh` may include the height of
    // a navigation bar on a mobile device.
    this.resizeMapContainer()
    this.registerEventListener(
      window,
      'resize',
      () => this.resizeMapContainer())
    // shows a dog registration modal if no dog is registered
    this.promiseLoaded()
      .then(() => {
        if (this.dogCount === 0) {
          this.showDogRegistrationModal()
        }
      })
  },
  methods: {
    ...mapActions('user', [
      'appendDog'
    ]),
    promiseLoaded () {
      if (process.env.NODE_ENV !== 'production') {
        console.log('waiting for data loaded', this.isLoaded)
      }
      if (this.isLoaded) {
        return Promise.resolve(true)
      } else {
        // waits until `isLoaded` turns into true
        // makes sure unwatching `isLoaded`
        let unwatch
        return new Promise(resolve => {
          unwatch = this.$watch('isLoaded', isLoaded => {
            if (process.env.NODE_ENV !== 'production') {
              console.log('data loaded', isLoaded)
            }
            resolve(isLoaded)
          })
        })
          .finally(unwatch)
      }
    },
    resizeMapContainer () {
      if (process.env.NODE_ENV !== 'production') {
        console.log('resizing the map container')
      }
      const mapContainer = this.$refs['map-container']
      const { innerHeight } = window
      mapContainer.style.height = `${innerHeight}px`
    },
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
      this.appendDog(dog)
        .catch(err => console.log(err))
        .finally(() => this.hideDogRegistrationModal())
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
  position: absolute;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: -1; /* shows as the background. */
}
</style>
