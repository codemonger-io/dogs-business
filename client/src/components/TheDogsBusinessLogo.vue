<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import logoPng from '@/assets/dogs-business-logo.png'

const { t } = useI18n()
</script>

<template>
  <div class="logo-container">
    <div class="logo-title">
      <p>Dog's Business</p>
    </div>
    <div class="logo-image">
      <img :src="logoPng" alt="Dog's Business" />
    </div>
    <div class="logo-copy">
      <p>{{ t('message.you_remove_it_we_remember_it') }}</p>
    </div>
  </div>
</template>

<style scoped>
.logo-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100vh;
  line-height: 1.0;

  .logo-image {
    /*
     * (3rem + 1.5rem): line-height * (title + copy)
     * 6rem: additional margin for mobile browsers.
     */
    height: calc(100vh - (3rem + 1.5rem) - 6rem);
    max-height: min(100vw, 512px);

    & img {
      height: 100%;
      object-fit: contain;
    }
  }

  .logo-title {
    font-size: 3rem;
  }

  .logo-copy {
    font-size: 1.5rem;
  }
}
</style>
