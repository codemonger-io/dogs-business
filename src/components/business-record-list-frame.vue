<template>
  <article
    ref="business-record-list-frame"
    class="message is-dogs-theme business-record-list-frame"
  >
    <div class="message-header">
      <p class="capitalized-sentence">
        {{ possessiveFormOfDog }} Records
      </p>
      <button
        class="delete"
        aria-label="delete"
        @click="onDeleteClicked"
      />
    </div>
    <div
      ref="business-record-list-frame-body"
      class="message-body business-record-list-frame-body"
    >
      <business-record-list
        :business-records="businessRecords"
        @business-record-selected="$emit('business-record-selected', $event)"
        @deleting-business-record="$emit('deleting-business-record', $event)"
      />
      <b-loading
        :active="!businessRecordsReady"
        :is-full-page="false"
      />
    </div>
  </article>
</template>

<script>
import {
  mapGetters,
} from 'vuex'

import BusinessRecordList from '@components/business-record-list'
import {
  getPossessiveFormOfDog,
} from '@db/types/dog'

/**
 * Vue component that renders a frame whose content is a business record list.
 *
 * @namespace BusinessRecordListFrame
 *
 * @memberof module:components
 *
 * @vue-prop {Array<Object>} business-records
 *
 *   Business records to be listed.
 *
 * @vue-prop {Boolean} business-records-ready
 *
 *   Whether the business records are ready.
 *
 * @vue-prop {Number} [resize-trigger=0]
 *
 *   Change to this property triggers the process necessary for this component
 *   after resizing it.
 *   The value itself does not matter.
 *
 *   **NOTE**: If a component individually reacts to a resize event from
 *   `window`, its parent component may not have been resized yet.
 *   An incorrect size will be calculated in that case.
 *   This property is introduced to address this problem.
 *
 * @vue-event {object} business-record-selected
 *
 *   Notified when one of listed business records is selected.
 *   The argument is an object with the following field,
 *   - `businessRecord`: {@linkcode module:db/types/business-record.BusinessRecord}
 *     Selected business record.
 *
 * @vue-event {object} deleting-business-record
 *
 *   Notified when the user tries to delete a business record.
 *   The argument is an object with the following field,
 *   - `businessRecord`: {@linkcode module:db/types/business-record.BusinessRecord}
 *     Selected business record.
 *
 * @vue-event {nothing} closing-frame
 *
 *   Notified when a user is trying to close this component.
 */
export default {
  name: 'BusinessRecordListFrame',
  components: {
    BusinessRecordList,
  },
  props: {
    businessRecords: {
      type: Array,
      required: true,
    },
    businessRecordsReady: {
      type: Boolean,
      required: true,
    },
    resizeTrigger: {
      type: Number,
      default: 0,
    },
  },
  emits: [
    'business-record-selected',
    'closing-frame',
    'deleting-business-record',
  ],
  computed: {
    ...mapGetters('user', [
      'dogOfId',
    ]),
    firstRecord () {
      return this.businessRecords[0] || {}
    },
    firstDog () {
      return this.dogOfId(this.firstRecord.dogId) || {}
    },
    possessiveFormOfDog () {
      return getPossessiveFormOfDog(this.firstDog)
    },
  },
  watch: {
    resizeTrigger () {
      if (process.env.NODE_ENV !== 'production') {
        console.log('BusinessRecordListFrame', 'resizing was triggered')
      }
      this.resizeBusinessRecordListFrameBody()
    },
  },
  mounted () {
    if (process.env.NODE_ENV !== 'production') {
      console.log('BusinessRecordListFrame', 'mounted')
    }
    this.resizeBusinessRecordListFrameBody()
  },
  methods: {
    resizeBusinessRecordListFrameBody () {
      if (process.env.NODE_ENV !== 'production') {
        console.log('BusinessRecordListFrame', 'resizing business record list frame body')
      }
      const frame = this.$refs['business-record-list-frame']
      const {
        top: frameTop,
        bottom: frameBottom,
      } = frame.getBoundingClientRect()
      const body = this.$refs['business-record-list-frame-body']
      const {
        top: bodyTop,
      } = body.getBoundingClientRect()
      const bodyHeight = frameBottom - bodyTop
      body.style.height = `${bodyHeight}px`
    },
    onDeleteClicked () {
      this.$emit('closing-frame')
    },
  },
}
</script>

<style lang="scss" scoped>
.business-record-list-frame {
  width: 100%;
  height: 100%;

  .business-record-list-frame-body {
    position: relative; /* for loading spinner */
    padding: 0 0;
    overflow-x: hidden;
    overflow-y: auto;
  }
}
</style>
