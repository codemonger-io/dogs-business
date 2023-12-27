<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  variant?: 'default' | 'inactive'
}>(), {
  variant: 'default'
})

const variantClass = computed(() => {
  return {
    'is-inactive-variant': props.variant === 'inactive'
  }
})
</script>

<template>
<svg height="100%" stroke-miterlimit="10" style="fill-rule:nonzero;clip-rule:evenodd;stroke-linecap:round;stroke-linejoin:round;" version="1.1" viewBox="0 0 24 24" width="100%" xml:space="preserve" xmlns="http://www.w3.org/2000/svg" xmlns:vectornator="http://vectornator.io" xmlns:xlink="http://www.w3.org/1999/xlink" :class="variantClass">
<defs/>
<g id="Layer-1" vectornator:layerName="Layer 1">
<path d="M1.70681 19.4476C1.49576 18.5315 1.74073 17.8016 2.9979 17.0653C5.02532 15.8779 4.11449 15.8809 6.46236 14.875C8.36325 14.0606 15.6504 14.4334 17.3757 14.781C20.4939 15.409 22.607 16.7274 22.5024 18.3021C22.3662 20.3528 21.2527 20.2529 20.4607 21.1679C18.3822 23.5689 13.0705 22.5224 10.5784 22.3948C7.38805 22.2315 2.30452 22.0423 1.70681 19.4476Z" fill="#fee663" fill-rule="nonzero" opacity="1" stroke="#9c9024" stroke-linecap="butt" stroke-linejoin="round" stroke-width="1" vectornator:layerName="Oval 1"/>
<path d="M7.8577 16.8942C7.04627 17.0304 6.77068 17.6033 6.74373 17.6865C6.50779 18.415 6.94952 18.7037 7.29228 18.9365C7.81553 19.292 8.92326 19.7689 10.3333 19.4565C9.13865 19.1227 8.19604 18.6027 7.74952 18.0928C7.5088 17.8179 7.63234 17.1709 7.8577 16.8942Z" fill="#9c9024" fill-rule="nonzero" opacity="1" stroke="none" vectornator:layerName="Shade"/>
<path d="M16.7635 17.0842C17.0466 17.415 17.1697 17.6919 16.5707 18.3995C18.1236 18.1842 17.939 17.415 17.7505 16.9293C17.4876 16.2516 16.4774 16.1534 15.0663 16.0812C15.9081 16.3688 16.6873 16.9951 16.7635 17.0842Z" fill="#9c9024" fill-rule="nonzero" opacity="1" stroke="none" vectornator:layerName="Shade"/>
<path d="M10.4521 17.069L10.4521 15.3897C10.4521 14.5613 11.1237 13.8897 11.9521 13.8897L11.9521 13.8897C12.7805 13.8897 13.4521 14.5613 13.4521 15.3897L13.4521 17.069" fill="#fee663" fill-rule="nonzero" opacity="1" stroke="#9c9024" stroke-linecap="round" stroke-linejoin="round" stroke-width="1" vectornator:layerName="Rectangle 3"/>
<path d="M18.2026 1.92508C18.907 1.48904 19.8315 1.70659 20.2675 2.41098L20.2675 2.41098C20.7036 3.11537 20.486 4.03986 19.7817 4.4759L18.2644 5.41514C17.56 5.85117 16.6355 5.63363 16.1994 4.92924L16.1994 4.92924C15.7634 4.22485 15.981 3.30035 16.6853 2.86432L18.2026 1.92508Z" fill="#fee663" fill-rule="nonzero" opacity="1" stroke="#9c9024" stroke-linecap="butt" stroke-linejoin="round" stroke-width="1" vectornator:layerName="Rectangle 2"/>
<path d="M12.137 7.92733C12.5652 7.21819 13.4873 6.99049 14.1964 7.41875L14.1964 7.41875C14.9056 7.84702 15.1333 8.76907 14.705 9.47821L14.1507 10.3959C13.7225 11.1051 12.8004 11.3328 12.0913 10.9045L12.0913 10.9045C11.3822 10.4763 11.1545 9.55421 11.5827 8.84507L12.137 7.92733Z" fill="#fee663" fill-rule="nonzero" opacity="1" stroke="#9c9024" stroke-linecap="butt" stroke-linejoin="round" stroke-width="1" vectornator:layerName="Rectangle 1"/>
</g>
</svg>
</template>

<style scoped>
svg {
  &.is-inactive-variant {
    & path {
      fill: #A8BCE4;
      stroke: #404E64;
    }
    & path {
      &[vectornator\:layerName="Shade"] {
        fill: #404E64;
        stroke: #404E64;
      }
    }
  }
}
</style>
