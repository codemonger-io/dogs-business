<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
import TheAuthenticator from './components/TheAuthenticator.vue'
</script>

<template>
  <TheAuthenticator>
    <RouterView />
  </TheAuthenticator>
</template>
