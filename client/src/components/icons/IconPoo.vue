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
<defs>
<path d="M11 1C12.5495 4.2161 10.4332 6.26025 9.10534 6.73058C7.24092 7.39099 5 9.13792 5 10.5C5 10.7964 5.20507 11.0689 5.34375 11.3438C3.92156 12.0511 3 12.9767 3 14C3 14.5898 3.32808 15.1522 3.84375 15.6562C2.26014 16.4375 1.1875 17.4017 1.1875 18.5C1.1875 20.9853 6.07246 23 12.0938 23C18.115 23 23 20.9853 23 18.5C23 17.3749 21.9037 16.3827 20.25 15.5938C20.7218 15.108 21 14.5627 21 14C21 12.9767 20.0784 12.0511 18.6562 11.3438C18.7949 11.0689 19 10.7964 19 10.5C19 9.23376 17.5217 7.53129 15.9771 6.90219C15.1675 6.57244 14.9863 5.57386 14.4327 4.04065C13.9461 2.69319 12.7269 1.23632 11 1Z" id="Fill"/>
</defs>
<g id="Poo" vectornator:layerName="Poo">
<use fill="#ab7421" fill-rule="nonzero" opacity="1" stroke="#614213" stroke-linecap="round" stroke-linejoin="miter" stroke-width="0.5" vectornator:layerName="Body" xlink:href="#Fill"/>
<clipPath clip-rule="nonzero" id="ClipPath">
<use xlink:href="#Fill"/>
</clipPath>
<g clip-path="url(#ClipPath)">
<path d="M3.92375 9.5111C4.49363 11.2787 7.99018 13.1912 12.8776 12.3219C9.86402 12.0128 8.02882 11.4526 7.19814 10.7185C6.01992 9.67725 5.87635 8.74503 7.46789 6.72474C7.95541 6.10589 3.46642 8.09259 3.92375 9.5111Z" fill="#614213" fill-rule="nonzero" opacity="1" stroke="#614213" stroke-linecap="round" stroke-linejoin="miter" stroke-width="0.5" vectornator:layerName="Shade"/>
<path d="M2.10786 13.9735C3.04478 16.2627 9.97993 18.5616 14.7322 16.8809C8.99472 16.6877 6.63302 15.5615 5.80725 15.1036C4.46589 14.3599 3.7915 13.0745 4.98302 11.1573C5.39887 10.4882 1.54332 12.5942 2.10786 13.9735Z" fill="#614213" fill-rule="nonzero" opacity="1" stroke="#614213" stroke-linecap="round" stroke-linejoin="miter" stroke-width="0.5" vectornator:layerName="Shade"/>
<path d="M0.693926 19.1262C1.63085 21.4154 10.2034 24.5354 18.786 22.1807C11.3558 22.6229 6.77071 21.2008 4.93274 20.0847C3.68163 19.325 2.32853 17.369 3.52005 15.4518C3.9359 14.7827 0.129383 17.7469 0.693926 19.1262Z" fill="#614213" fill-rule="nonzero" opacity="1" stroke="#614213" stroke-linecap="round" stroke-linejoin="miter" stroke-width="0.5" vectornator:layerName="Shade"/>
</g>
</g>
</svg>
</template>

<style scoped>
svg {
  &.is-inactive-variant {
    path, use {
      &[vectornator\:layerName="Body"] {
        fill: #A8BCE4;
        stroke: #404E64;
      }
      &[vectornator\:layerName="Shade"] {
        fill: #404E64;
        stroke: #404E64;
      }
    }
  }
}
</style>
