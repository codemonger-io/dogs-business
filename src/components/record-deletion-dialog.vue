<template>
  <div
    class="modal"
    :class="modalClass"
  >
    <div class="modal-background" />
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title">
          Deleting a business record
        </p>
      </header>
      <section class="modal-card-body">
        <p>
          Are you sure to delete this business record?
        </p>
        <p class="business-record-row">
          <span class="business-record-column business-record-type">
            <figure class="image is-24x24">
              <img
                :src="iconPathOfType(businessRecordType)"
                :alt="businessRecordType"
              >
            </figure>
          </span>
          <span class="business-record-column business-record-date">
            on {{ businessRecordDate }}
          </span>
        </p>
      </section>
      <footer class="modal-card-foot modal-card-foot-pulled-right">
        <button
          class="button modal-button"
          @click="onCancelClicked"
        >
          Cancel
        </button>
        <button
          class="button modal-button is-primary"
          @click="onConfirmClicked"
        >
          Confirm
        </button>
      </footer>
    </div>
  </div>
</template>

<script>
import peePngPath from '@assets/images/pee.png'
import pooPngPath from '@assets/images/poo.png'

const ICON_PATH_OF_TYPES = {
  pee: peePngPath,
  poo: pooPngPath
}

/**
 * Vue component that confirms the user to delete a business record.
 *
 * Call `confirm` to show this dialog.
 *
 * @namespace RecordDeletionDialog
 *
 * @memberof module:components
 */
export default {
  name: 'RecordDeletionDialog',
  data () {
    return {
      isActive: false,
      businessRecord: null,
      result: null
    }
  },
  computed: {
    modalClass () {
      return {
        'is-active': this.isActive
      }
    },
    businessRecordType () {
      return this.businessRecord ? this.businessRecord.type : ''
    },
    businessRecordDate () {
      return this.businessRecord ? this.businessRecord.date : ''
    }
  },
  methods: {
    /**
     * Shows the dialog to confirm the user to delete a given business record.
     *
     * @function confirm
     *
     * @memberof module:components.RecordDeletionDialog
     *
     * @param {module:db/types/business-record.BusinessRecord}
     *
     *   Business record to delete.
     *
     * @return {Promise{boolean}}
     *
     *   Resolves to a flag that indicates whether the user has confirmed to
     *   delete the business record.
     */
    confirm (businessRecord) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('RecordDeletionDialog', 'confirming deletion of a business record', businessRecord)
      }
      if (this.isActive) {
        console.warn('previously shown dialog is canceled')
        this.result = {
          isConfirmed: false
        }
      }
      this.result = null
      this.businessRecord = businessRecord
      this.isActive = true
      let unwatchResult = () => {}
      const promise = new Promise(resolve => {
        // watches `result` to know the user selected an answer
        unwatchResult = this.$watch('result', result => {
          if (process.env.NODE_ENV !== 'production') {
            console.log('RecordDeletionDialog', 'got answer', result)
          }
          resolve(result.isConfirmed)
        })
      })
      // makes sure that result watcher is detached, and the dialog is closed
      // when the user answers.
      return promise
        .finally(() => {
          unwatchResult()
          this.isActive = false
          this.businessRecord = null
        })
    },
    iconPathOfType (type) {
      return ICON_PATH_OF_TYPES[type]
    },
    onConfirmClicked () {
      if (process.env.NODE_ENV !== 'production') {
        console.log('RecordDeletionDialog', 'confirm clicked')
      }
      this.result = {
        isConfirmed: true
      }
    },
    onCancelClicked () {
      if (process.env.NODE_ENV !== 'production') {
        console.log('RecordDeletionDialog', 'cancel clicked')
      }
      this.result = {
        isConfirmed: false
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.business-record-row {
  display: flex;
  align-items: center;
  margin-top: 1em;
  margin-left: 2em;

  .business-record-column {
    display: inline-block;

    &.business-record-type {
      margin-right: 1em;
    }
  }
}
</style>
