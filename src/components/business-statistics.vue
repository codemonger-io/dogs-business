<template>
  <div class="business-statistics">
    <p class="capitalized-sentence">
      {{ possessiveFormOfDog }} business around here.
    </p>
    <p class="svg-container">
      <svg
        ref="svg-root"
        xmlns:svg="http://www.w3.org/2000/svg"
        xmlns:xlink="http://www.w3.org/1999/xlink"
        :width="svgWidth"
        :height="svgHeight"
      >
        <g :transform="barGraphTransform">
          <g class="bar-graph-contents" />
          <rect
            class="bar-graph-frame"
            x="0"
            y="0"
            :width="barGraphWidth"
            :height="barGraphHeight"
          />
        </g>
      </svg>
    </p>
    <p>
      Out of <strong>{{ businessRecords.length }}</strong> records
    </p>
    <p>
      From <strong>{{ startDateString }}</strong>
    </p>
    <p>
      To <strong>{{ stopDateString }}</strong>
    </p>
    <p>
      <a
        href="#"
        @click.prevent="onListBusinessRecordsClicked"
      >
        <span class="icon">
          <i class="mdi mdi-view-list" />
        </span>
        View records list
      </a>
    </p>
    <b-loading
      :active="!businessRecordsReady"
      :is-full-page="false"
    />
  </div>
</template>

<script>
import {
  max as d3Max,
  min as d3Min,
} from 'd3-array'
import {
  scaleLinear as d3ScaleLinear,
} from 'd3-scale'
import {
  select as d3Select,
} from 'd3-selection'
import {
  mapGetters,
} from 'vuex'

import {
  getPossessiveFormOfDog,
} from '@db/types/dog'

import peePngPath from '@assets/images/pee.png'
import pooPngPath from '@assets/images/poo.png'

const RECORD_TYPES = [
  'pee',
  'poo',
]

const TYPED_ICON_PATHS = {
  pee: peePngPath,
  poo: pooPngPath,
}

/**
 * Vue component that shows statistics of business records.
 *
 * @namespace BusinessStatistics
 *
 * @memberof module:components
 *
 * @vue-prop {Array} business-records
 *
 *   Business records from which the statistics are to be derived.
 *
 * @vue-prop {Boolean} business-records-ready
 *
 *   Whether the business records are ready to be used.
 *
 * @vue-prop {Number} [svg-width=200]
 *
 *   Width of the SVG element that renders statistics.
 *
 * @vue-prop {Number} [svg-height=50]
 *
 *   Height of the SVG element that renders statistics.
 *
 * @vue-event {nothing} listing-business-records
 *
 *   Notified when a user clicks the "List records" link.
 */
export default {
  name: 'BusinessStatistics',
  props: {
    businessRecords: {
      type: Array,
      required: true,
    },
    businessRecordsReady: {
      type: Boolean,
      required: true,
    },
    svgWidth: {
      type: Number,
      default: 200,
    },
    svgHeight: {
      type: Number,
      default: 50, // barGraphHeight + margin
    },
  },
  emits: ['listing-business-records'],
  data () {
    return {
      barGraphTopPadding: 2,
      barGraphHorizontalPadding: 30,
      barGraphHeight: 32,
    }
  },
  computed: {
    ...mapGetters('user', [
      'dogOfId',
    ]),
    barGraphWidth () {
      return this.svgWidth - this.barGraphHorizontalPadding
    },
    barGraphTransform () {
      const x = 0.5 * (this.svgWidth - this.barGraphWidth)
      return `translate(${x}, ${this.barGraphTopPadding})`
    },
    statistics () {
      const stats = {}
      this.businessRecords.forEach(record => {
        const { type } = record
        if (!(type in stats)) {
          stats[type] = {
            frequency: 0,
          }
        }
        ++stats[type].frequency
      })
      return stats
    },
    dates () {
      return this.businessRecords.map(r => new Date(r.date))
    },
    startDate () {
      return d3Min(this.dates)
    },
    stopDate () {
      return d3Max(this.dates)
    },
    startDateString () {
      return this.formatDate(this.startDate)
    },
    stopDateString () {
      return this.formatDate(this.stopDate)
    },
    firstDogId () {
      return (this.businessRecords.length > 0) ?
        this.businessRecords[0].dogId :
        undefined
    },
    firstDog () {
      return this.dogOfId(this.firstDogId) || {
        name: '',
        sex: 'n/a',
      }
    },
    possessiveFormOfDog () {
      return getPossessiveFormOfDog(this.firstDog)
    },
    graphData () {
      const stats = this.statistics
      const data = RECORD_TYPES
        .map(type => {
          const typeStats = stats[type] || { frequency: 0 }
          const ratio = typeStats.frequency / Math.max(1, this.businessRecords.length) // avoid zero division
          return {
            ...typeStats,
            type,
            ratio,
            get percentage () {
              return 100 * this.ratio
            },
          }
        })
        .filter(d => d.frequency > 0)
      let cumulativeFrequency = 0
      for (let i = 0; i < data.length; ++i) {
        data[i].cumulativeFrequency = cumulativeFrequency
        cumulativeFrequency += data[i].frequency
      }
      return data
    },
  },
  watch: {
    graphData () {
      if (process.env.NODE_ENV !== 'production') {
        console.log('BusinessStatistics', 'graphData updated')
      }
      this.renderBarGraph()
    },
  },
  mounted () {
    if (process.env.NODE_ENV !== 'production') {
      console.log('BusinessStatistics', 'mounted')
    }
    this.renderBarGraph()
  },
  methods: {
    frequency (type) {
      const stats = this.statistics
      if (type in stats) {
        return stats[type].frequency
      } else {
        return 0
      }
    },
    renderBarGraph () {
      const data = this.graphData
      const scaleX = d3ScaleLinear()
        .domain([0, this.businessRecords.length])
        .range([0, this.barGraphWidth])
      const svg = d3Select(this.$refs['svg-root'])
      const contents = svg.select('g.bar-graph-contents')
      const graphAreaUpdate = contents.selectAll('g.bar-graph-area')
        .data(data)
        .join('g')
          .attr('class', d => `bar-graph-area bar-graph-area-${d.type}`)
          .attr(
            'transform',
            d => `translate(${scaleX(d.cumulativeFrequency)}, 0)`)
      graphAreaUpdate.selectAll('rect')
        .data(d => [d]) // to avoid appending multiple rects
        .join('rect')
          .attr('x', 0)
          .attr('y', 0)
          .attr('width', d => scaleX(d.frequency))
          .attr('height', this.barGraphHeight)
      graphAreaUpdate.selectAll('image')
        .data(d => [d]) // to avoid appending multiple images
        .join('image')
          .attr('x', d => 0.5 * (scaleX(d.frequency) - 24))
          .attr('y', 0.5 * (this.barGraphHeight - 24))
          .attr('width', 24)
          .attr('height', 24)
          .attr('preserveAspectRatio', true)
          .attr('xlink:href', d => TYPED_ICON_PATHS[d.type])
      graphAreaUpdate.selectAll('text')
        .data(d => [d]) // to avoid appending multiple texts
        .join('text')
          .attr('x', d => 0.5 * scaleX(d.frequency))
          .attr('y', this.barGraphHeight + 2)
          .text(d => `${d.percentage.toFixed(0)}%`)
    },
    onListBusinessRecordsClicked () {
      this.$emit('listing-business-records')
    },
    formatDate (date) {
      return date ? date.toLocaleDateString() : '?'
    },
  },
}
</script>

<style lang="scss">
/* should not be scoped because Vue does not give a scope id to SVG elements. */
.business-statistics {
  position: relative;

  .svg-container {
    display: flex;
    justify-content: center;
  }

  .bar-graph-contents {
    .bar-graph-area {
      rect {
        stroke: none;
      }

      text {
        text-anchor: middle;
        alignment-baseline: hanging;
      }

      &.bar-graph-area-pee {
        rect {
          fill: #FFEE57;
        }
      }

      &.bar-graph-area-poo {
        rect {
          fill: #CD7E4B;
        }
      }
    }
  }

  .bar-graph-frame {
    stroke: gray;
    stroke-width: 1;
    fill: none;;
  }
}
</style>
