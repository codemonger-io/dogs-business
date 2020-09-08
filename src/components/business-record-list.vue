<template>
  <ul class="business-record-list">
    <li
      v-for="(record, i) in businessRecords"
      :key="`record-${i}`"
      class="business-record-row"
    >
      <a
        href="#"
        @click="onBusinessRecordClicked(record)"
      >
        <span class="business-record-column business-record-column-type">
          {{ record.type }}
        </span>
        <span class="business-record-column business-record-column-date">
          on {{ record.date }}
        </span>
      </a>
    </li>
  </ul>
</template>

<script>
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
 */
export default {
  name: 'BusinessRecordList',
  props: {
    businessRecords: {
      type: Array,
      required: true
    }
  },
  methods: {
    onBusinessRecordClicked (record) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('BusinessRecordList', 'business record clicked', record)
      }
    }
  }
}
</script>
