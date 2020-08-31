<template>
  <nav
    class="navbar dogs-business-navbar"
    role="navigation"
    aria-label="main navigation"
  >
    <div class="navbar-brand">
      <a
        class="navbar-item"
        href="#"
      >
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
        aria-label="menu"
        aria-expanded="false"
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </a>
    </div>
  </nav>
</template>

<script>
/**
 * Vue component that renders a navigation bar.
 *
 * @namespace NavigationBar
 *
 * @memberof module:components
 */
export default {
  name: 'NavigationBar'
}
</script>
