<script setup lang="ts">
import { useRouter } from 'vue-router'

import SignInForm from '../components/SignInForm.vue'

const router = useRouter()

const authenticated = () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('authenticated')
  }
  router.push({ name: 'profile' })
}
</script>

<template>
  <SignInForm @authenticated="authenticated" />
</template>
