<template>
  <nav
    class="navbar is-dogs-theme dogs-business-navbar"
    role="navigation"
    aria-label="main navigation"
  >
    <div class="navbar-brand">
      <a class="navbar-item">
        <img src="@assets/images/dogs-business.svg" />
      </a>
      <a
        class="navbar-item dogs-business-title"
        href="#"
      >
        <h1 class="title is-5">
          Dog's Business
        </h1>
      </a>
      <a
        role="button"
        class="navbar-burger"
        :class="burgerClass"
        aria-label="menu"
        aria-expanded="false"
        :data-target="navbarMenuId"
        @click="onBurgerClicked"
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </a>
    </div>
    <div
      :id="navbarMenuId"
      class="navbar-menu"
      :class="navbarMenuClass"
    >
      <div class="navbar-start">
        <a
          class="navbar-item"
          @click.prevent="onEditDogProfileClicked"
        >
          Edit dog profile
        </a>
      </div>
    </div>
  </nav>
</template>

<script>
import { makeRandomId } from '@utils/random-id'

/**
 * Vue component that renders a navigation bar.
 *
 * @namespace NavigationBar
 *
 * @memberof module:components
 */
export default {
  name: 'NavigationBar',
  data () {
    return {
      navbarMenuId: 'navbar-menu',
      isMenuActive: false
    }
  },
  computed: {
    burgerClass () {
      return {
        'is-active': this.isMenuActive
      }
    },
    navbarMenuClass () {
      return {
        'is-active': this.isMenuActive
      }
    }
  },
  created () {
    if (process.env.NODE_ENV !== 'production') {
      console.log('NavigationBar', 'created')
    }
    // makes a unique id for this navbar
    this.navbarMenuId = `navbar-menu-${makeRandomId()}`
  },
  methods: {
    onBurgerClicked () {
      if (process.env.NODE_ENV !== 'production') {
        console.log('NavigationBar', 'burger clicked')
      }
      this.isMenuActive = !this.isMenuActive
    },
    onEditDogProfileClicked () {
      if (process.env.NODE_ENV !== 'production') {
        console.log('NavigationBar', 'edit dog profile clicked')
      }
    }
  }
}
</script>
