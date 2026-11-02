<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  total: { type: Number, required: true }, // applications shown on the board
  dueThisWeek: { type: Number, required: true }
})

const viewMode = defineModel('viewMode', { type: String, required: true })
const typeFilter = defineModel('type', { type: String, required: true })
const deadlineFilter = defineModel('deadline', { type: String, required: true })
const hideRejected = defineModel('hideRejected', { type: Boolean, required: true })

defineEmits(['add', 'clear'])

// value '' = no filter
const typeOptions = [
  { value: '', label: 'All' },
  { value: 'job', label: 'Job' },
  { value: 'internship', label: 'Internship' },
  { value: 'hackathon', label: 'Hackathon' },
  { value: 'competition', label: 'Competition' }
]

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
  const noun = props.total === 1 ? 'application' : 'applications'
  return props.total + ' ' + noun + ' · ' + props.dueThisWeek + ' due this week'
})
</script>

<template>
  <div class="d-flex flex-wrap align-items-center gap-2 mb-4">
    <!-- board / calendar toggle -->
    <div class="btn-group bg-body-secondary rounded p-1">
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
      <i class="bi bi-plus-lg me-2"></i>Add application
    </button>
  </div>
</template>
