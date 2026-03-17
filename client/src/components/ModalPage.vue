<script setup lang="ts">
import { BModal } from 'buefy'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps<{
  // suppresses the default behavior of going back when the modal is closed.
  // handle the "closed" event if you want to customize the behavior
  noRewindOnClose?: boolean
}>()

const emit = defineEmits<{
  closed: []
}>()

const router = useRouter()

const isOpen = ref(false)

onMounted(() => {
  isOpen.value = true
})

const back = () => {
  isOpen.value = false
  const noRewind = props.noRewindOnClose
  setTimeout(() => {
    emit('closed')
    if (!noRewind) {
      router.back()
    }
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
