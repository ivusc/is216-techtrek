<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  total: { type: Number, required: true }, // applications shown on the board
  dueThisWeek: { type: Number, required: true },
  boardCounts: { type: Object, default: () => ({ jobs: 0, hackathons: 0 }) },
  historyCount: { type: Number, default: 0 } // how many have moved to History
})

const viewMode = defineModel('viewMode', { type: String, required: true })
const typeFilter = defineModel('type', { type: String, required: true })
const deadlineFilter = defineModel('deadline', { type: String, required: true })
const hideRejected = defineModel('hideRejected', { type: Boolean, required: true })
// 'jobs' or 'hackathons': which kanban board is shown
const board = defineModel('board', { type: String, default: 'jobs' })

defineEmits(['add', 'clear'])

// value '' = no filter; on a board only that board's types make sense, the calendar shows all of them
const allTypeOptions = [
  { value: '', label: 'All' },
  { value: 'job', label: 'Job', board: 'jobs' },
  { value: 'internship', label: 'Internship', board: 'jobs' },
  { value: 'hackathon', label: 'Hackathon', board: 'hackathons' },
  { value: 'competition', label: 'Competition', board: 'hackathons' }
]
const typeOptions = computed(() => {
  if (viewMode.value !== 'board') return allTypeOptions
  return allTypeOptions.filter((option) => option.value === '' || option.board === board.value)
})

const boardOptions = [
  { value: 'jobs', label: 'Jobs & internships', short: 'Jobs', icon: 'bi-briefcase' },
  { value: 'hackathons', label: 'Hackathons & competitions', short: 'Hackathons', icon: 'bi-trophy' }
]
// "Hide rejected" only means something on the jobs board
const showHideRejected = computed(() => viewMode.value === 'calendar' || (viewMode.value === 'board' && board.value === 'jobs'))

const deadlineOptions = [
  { value: '', label: 'Any deadline' },
  { value: 'week', label: 'Due this week' },
  { value: 'overdue', label: 'Overdue' }
]

// phones only: shown on the "Filters" button, e.g. "Filters · 2"
const showFilters = ref(false)
const activeFilterCount = computed(() => {
  let count = 0
  for (const value of [typeFilter.value, deadlineFilter.value]) {
    if (value !== '') {
      count++
    }
  }
  if (hideRejected.value) {
    count++
  }
  return count
})

const summary = computed(() => {
  const isEvents = viewMode.value === 'board' && board.value === 'hackathons'
  const noun = isEvents ? (props.total === 1 ? 'event' : 'events') : props.total === 1 ? 'application' : 'applications'
  if (viewMode.value === 'history') return props.total + ' in history'
  return props.total + ' ' + noun + ' · ' + props.dueThisWeek + ' due this week'
})
</script>

<template>
  <div class="d-flex flex-wrap align-items-center gap-2 mb-4">
    <!-- board / calendar toggle -->
    <div class="btn-group tracker-views bg-body-secondary rounded p-1">
      <button
        class="btn btn-sm border-0 rounded-1"
        :class="viewMode === 'board' ? 'bg-white shadow-sm fw-semibold' : 'text-body-secondary'"
        @click="viewMode = 'board'"
      >
        <i class="bi bi-kanban me-1"></i> Board
      </button>
      <button
        class="btn btn-sm border-0 rounded-1"
        :class="viewMode === 'calendar' ? 'bg-white shadow-sm fw-semibold' : 'text-body-secondary'"
        @click="viewMode = 'calendar'"
      >
        <i class="bi bi-calendar me-1"></i> Calendar
      </button>
      <button
        class="btn btn-sm border-0 rounded-1"
        :class="viewMode === 'history' ? 'bg-white shadow-sm fw-semibold' : 'text-body-secondary'"
        @click="viewMode = 'history'"
      >
        <i class="bi bi-clock-history me-1"></i> History
        <span class="badge ms-1 rounded-pill bg-body-secondary text-body-secondary fw-medium">{{ historyCount }}</span>
      </button>
    </div>

    <!-- which board: jobs and hackathons have different steps, so they get their own columns -->
    <div v-if="viewMode === 'board'" class="btn-group bg-body-secondary rounded p-1" role="tablist" aria-label="Board">
      <button
        v-for="option in boardOptions"
        :key="option.value"
        class="btn btn-sm border-0 rounded-1 d-flex align-items-center gap-1"
        :class="board === option.value ? 'bg-white shadow-sm fw-semibold' : 'text-body-secondary'"
        role="tab"
        :aria-selected="board === option.value"
        @click="board = option.value"
      >
        <i :class="'bi ' + option.icon"></i>
        <span class="d-none d-xl-inline">{{ option.label }}</span>
        <span class="d-xl-none">{{ option.short }}</span>
        <span class="badge rounded-pill bg-body-secondary text-body-secondary fw-medium">{{ boardCounts[option.value] }}</span>
      </button>
    </div>

    <!-- phones: filters are hidden behind this button until it is clicked -->
    <button
      class="btn btn-sm rounded-pill d-md-none"
      :class="activeFilterCount > 0 ? 'bg-primary-subtle border-primary text-primary-emphasis' : 'bg-white border'"
      :aria-expanded="showFilters"
      aria-controls="tracker-filters"
      @click="showFilters = !showFilters"
    >
      Filters<span v-if="activeFilterCount > 0"> · {{ activeFilterCount }}</span>
    </button>

    <!-- always shown from tablets up, on phones only after the Filters button is clicked -->
    <div
      id="tracker-filters"
      class="flex-wrap align-items-center gap-2"
      :class="showFilters ? 'd-flex w-100' : 'd-none d-md-flex'"
    >
      <span class="small text-body-secondary d-none d-md-inline"><i class="bi bi-funnel"></i> Filters</span>

      <select
        v-model="typeFilter"
        class="form-select form-select-sm rounded-pill w-auto"
        :class="{ 'bg-primary-subtle border-primary text-primary-emphasis': typeFilter !== '' }"
        aria-label="Type"
      >
        <option v-for="option in typeOptions" :key="option.value" :value="option.value">
          {{ option.value === '' ? 'Type' : 'Type: ' + option.label }}
        </option>
      </select>

      <select
        v-if="viewMode !== 'history'"
        v-model="deadlineFilter"
        class="form-select form-select-sm rounded-pill w-auto"
        :class="{ 'bg-primary-subtle border-primary text-primary-emphasis': deadlineFilter !== '' }"
        aria-label="Deadline"
      >
        <option v-for="option in deadlineOptions" :key="option.value" :value="option.value">
          {{ option.value === '' ? 'Deadline' : 'Deadline: ' + option.label }}
        </option>
      </select>

      <button
        v-if="showHideRejected"
        class="btn btn-sm rounded-pill"
        :class="hideRejected ? 'btn-light border-primary' : 'bg-white border'"
        type="button"
        :aria-pressed="hideRejected"
        @click="hideRejected = !hideRejected"
      >
        Hide rejected
      </button>

      <button class="btn btn-sm btn-link fw-semibold text-decoration-none" type="button" @click="$emit('clear')">Clear all</button>
    </div>

    <span class="small fw-medium text-body-tertiary ms-auto">{{ summary }}</span>

    <button class="btn btn-tt-accent fw-semibold btn-cta" type="button" @click="$emit('add')">
      <i class="bi bi-plus-lg me-2"></i>{{ viewMode === 'board' && board === 'hackathons' ? 'Add event' : 'Add application' }}
    </button>
  </div>
</template>

<style scoped>
/* phones: the view toggle spans the row with equal buttons, and the add button is full width */
@media (max-width: 767.98px) {
  .tracker-views { width: 100%; }
  .tracker-views > .btn { flex: 1 1 0; white-space: nowrap; }
  .btn-cta { width: 100%; }
}
/* 320px phones: the labels alone fill the toggle, so the icons go */
@media (max-width: 399.98px) {
  .tracker-views .bi { display: none; }
}
</style>
