<template>
  <ul class="business-record-list">
    <li
      v-for="(record, i) in businessRecords"
      :key="`record-${i}`"
      class="business-record-list-item"
      :class="businessRecordListItemClass(record)"
    >
      <a
        href="#"
        class="business-record-row"
        @click.prevent="onBusinessRecordClicked(record)"
      >
        <div class="business-record-information">
          <span class="business-record-column business-record-column-type">
            <figure class="image is-24x24">
              <img
                :src="iconPathOfType(record.type)"
                :alt="record.type"
              />
            </figure>
          </span>
          <span class="business-record-column business-record-column-date">
            on {{ record.date }}
          </span>
        </div>
        <span class="business-record-column business-record-column-delete">
          <button
            v-if="record.recordId === selectedRecordId"
            class="button is-small"
            @click.stop="onDeleteBusinessRecordClicked(record)"
          >
            <span class="icon">
              <i class="mdi mdi-18px mdi-trash-can-outline" />
            </span>
          </button>
        </span>
      </a>
    </li>
  </ul>
</template>

<script>
import peePngPath from '@assets/images/pee.png'
import pooPngPath from '@assets/images/poo.png'

const ICON_PATH_OF_TYPES = {
  pee: peePngPath,
  poo: pooPngPath
}

/**
 * Vue component that lists business records.
 *
 * @namespace BusinessRecordList
 *
 * @memberof module:components
 *
 * @vue-prop {Array<Object>} business-records
 *
 *   Business records to be listed.
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
 *     Business record to delete.
 */
export default {
  name: 'BusinessRecordList',
  props: {
    businessRecords: {
      type: Array,
      required: true
    }
  },
  data () {
    return {
      selectedRecord: null
    }
  },
  computed: {
    selectedRecordId () {
      return this.selectedRecord ? this.selectedRecord.recordId : undefined
    }
  },
  methods: {
    iconPathOfType (type) {
      return ICON_PATH_OF_TYPES[type]
    },
    businessRecordListItemClass ({ recordId }) {
      return {
        'is-selected': recordId === this.selectedRecordId
      }
    },
    onBusinessRecordClicked (record) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('BusinessRecordList', 'business record clicked', record)
      }
      this.selectedRecord = record
      this.$emit('business-record-selected', {
        businessRecord: record
      })
    },
    onDeleteBusinessRecordClicked (record) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('BusinessRecordList', 'deleting business record', record)
      }
      this.$emit('deleting-business-record', {
        businessRecord: record
      })
    }
  }
}
</script>

<style lang="scss" scoped>
.business-record-list {
  .business-record-list-item {
    padding: 0.5em 0.5em;
    border-bottom: 1px solid gray;

    &:last-child {
      border-bottom: none;
    }

    &.is-selected {
      background-color: #83CCFC;
    }

    a {
      &.business-record-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        height: 2.5em;
        text-decoration: none;

        &:active,
        &:visited {
          text-decoration: none;
        }
      }
    }

    .business-record-information {
      display: flex;
      align-items: center;
    }

    .business-record-column {
      display: inline-block;
      margin-right: 1em;
      &:last-child {
        margin-right: 0;
      }

      &.business-record-column-type {
        width: 24px;
      }

      &.business-record-column-date {
        width: 8em;
      }
    }
  }
}
</style>
