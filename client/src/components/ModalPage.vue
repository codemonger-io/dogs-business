<script setup lang="ts">
import { BModal } from 'buefy'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const isOpen = ref(false)

onMounted(() => {
  isOpen.value = true
})

const back = () => {
  isOpen.value = false
  setTimeout(() => {
    router.back()
  }, 150)
}
</script>

<template>
  <div class="container is-max-desktop">
    <b-modal
      custom-class="is-full-screen-mobile"
      :model-value="isOpen"
      @cancel="back"
    >
      <slot></slot>
    </b-modal>
  </div>
</template>
