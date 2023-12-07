<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="container is-max-desktop">
    <div class="box welcome-box paper">
      <section class="section">
        <h1 class="title is-3">{{ t('term.signup') }}</h1>
      </section>
    </div>
  </div>
</template>

<style scoped>
.box {
  --b-box-radius: 0px;
  min-height: 100vh;
}
</style>
