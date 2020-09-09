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
 *   - `businessRecord`: {`module:db/types/business-record.BusinessRecord`}
 *     Selected business record.
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
        text-decoration: none;

        &:active,
        &:visited {
          text-decoration: none;
        }
      }
    }

    .business-record-column {
      display: inline-block;
      margin-right: 1em;

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
