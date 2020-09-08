<template>
  <article
    ref="business-record-list-frame"
    class="message business-record-list-frame"
  >
    <div class="message-header">
      <p>Your Dog's Records</p>
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
      />
    </div>
  </article>
</template>

<script>
import BusinessRecordList from '@components/business-record-list'

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
 * @vue-event {nothing} closing-frame
 *
 *   Notified when a user is trying to close this component.
 */
export default {
  name: 'BusinessRecordListFrame',
  components: {
    BusinessRecordList
  },
  props: {
    businessRecords: {
      type: Array,
      required: true
    },
    resizeTrigger: {
      type: Number,
      default: 0
    }
  },
  watch: {
    resizeTrigger () {
      if (process.env.NODE_ENV !== 'production') {
        console.log('BusinessRecordListFrame', 'resizing was triggered')
      }
      this.resizeBusinessRecordListFrameBody()
    }
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
        bottom: frameBottom
      } = frame.getBoundingClientRect()
      const body = this.$refs['business-record-list-frame-body']
      const {
        top: bodyTop
      } = body.getBoundingClientRect()
      const bodyHeight = frameBottom - bodyTop
      body.style.height = `${bodyHeight}px`
    },
    onDeleteClicked () {
      this.$emit('closing-frame')
    }
  }
}
</script>

<style lang="scss" scoped>
.business-record-list-frame {
  width: 100%;
  height: 100%;

  .business-record-list-frame-body {
    overflow-x: hidden;
    overflow-y: auto;
  }
}
</style>
