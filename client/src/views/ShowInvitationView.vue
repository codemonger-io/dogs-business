<script setup lang="ts">
import { BModal } from 'buefy'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'

import { SvgOptions, initFastQr, qrSvg } from '../lib/fast_qr_wrapper'
import { capitalize } from '../utils/strings'

const router = useRouter()
const { t } = useI18n()

const props = defineProps<{
  invitationId: string,
  dogName: string,
  expiresAt: number
}>()

const invitationUrl = computed(() => {
  const path = router.resolve({
    name: 'accept-invitation',
    params: { invitationId: props.invitationId }
  }).href
  const url = new URL(path, window.location.origin)
  return url.toString()
})

const expirationDatetime = computed(() => {
  return new Date(props.expiresAt * 1000)
})

const invitationQrData = ref<string | undefined>(undefined)

// generates a QR code for the invitation URL
onMounted(async () => {
  await initFastQr()
  const svg = qrSvg(
    invitationUrl.value,
    new SvgOptions()
      .module_color('#FFF')
      .background_color('#000')
  )
  invitationQrData.value = 'data:image/svg+xml;base64,' + btoa(svg)
})

const close = () => {
  router.back()
}
</script>

<template>
  <div class="container is-max-desktop">
    <b-modal
      custom-class="is-full-screen-mobile"
      :model-value="true"
      @cancel="close"
    >
      <div class="card paper">
        <div v-if="invitationQrData" class="card-image">
          <figure class="image is-square qr-code">
            <img :src="invitationQrData" alt="Invitation QR Code"></img>
          </figure>
        </div>
        <div class="card-content">
          <section class="section">
            <div class="block">
              <i18n-t keypath="message.access_qr_code_or_url_below_to_be_friend_of_dog" tag="p">
                <span class="has-text-weight-bold">{{ props.dogName }}</span>
              </i18n-t>
            </div>
            <div class="block">
              <a :href="invitationUrl">{{ invitationUrl }}</a>
            </div>
            <div class="block">
              <p>{{ t('message.valid_until', { expiresAt: expirationDatetime }) }}</p>
            </div>
            <div class="block">
              <p class="is-size-7">{{ t('message.qr_code_is_registered_trademark') }}</p>
            </div>
          </section>
        </div>
      </div>
    </b-modal>
  </div>
</template>

<style scoped>
.image.qr-code {
  max-width: 256px;
  margin: auto;

  img {
    margin-top: 1.5rem;
  }
}
</style>
