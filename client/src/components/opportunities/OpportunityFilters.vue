<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  // which tab is open, so only the filters that apply to it are shown
  tab: { type: String, required: true },
  // theme names found in the loaded hackathons, most common first
  themes: { type: Array, required: true },
  // [{ key, label }] IT roles from the server
  roles: { type: Array, default: () => [] }
})

// job filters (sent to the server)
const jobField = defineModel('jobField', { type: String, required: true })
const jobType = defineModel('jobType', { type: String, required: true })
// hackathon filters (done in the browser, the hackathon list is small)
const theme = defineModel('theme', { type: String, required: true })
const closingWithin = defineModel('closingWithin', { type: String, required: true })
// shared filters
const location = defineModel('location', { type: String, required: true })
const paidOnly = defineModel('paidOnly', { type: Boolean, required: true })
const sortBy = defineModel('sortBy', { type: String, required: true })

// the parent also clears the search box, so it does the clearing
defineEmits(['clear'])

// each tab only shows its own filters, the Overview tab only shows the shared ones
const showJobFilters = computed(() => props.tab === 'jobs')
const showHackathonFilters = computed(() => props.tab === 'hackathons')

// filters picked on the Jobs / Hackathons tab keep applying on the Overview tab, so say so there
const hasTabFilters = computed(() => {
  return jobField.value !== '' || jobType.value !== '' || theme.value !== '' || closingWithin.value !== ''
})

const sortOptions = [
  { value: 'closing', label: 'Closing soonest' },
  { value: 'pay', label: 'Highest pay / prize' },
  { value: 'title', label: 'Title (A-Z)' }
]

// phones only: the filters are hidden behind the "Filters" button until it is clicked
const showFilters = ref(false)

// shown on the "Filters" button
const activeFilterCount = computed(() => {
  let count = 0
  for (const value of [jobField.value, jobType.value, theme.value, closingWithin.value, location.value]) {
    if (value !== '') {
      count++
    }
  }
  if (paidOnly.value) {
    count++
  }
  return count
})
</script>

<template>
  <!-- phones: Filters button + sort dropdown -->
  <div class="d-flex d-md-none gap-2 mb-2">
    <button
      class="btn btn-sm rounded-pill"
      :class="activeFilterCount > 0 ? 'bg-primary-subtle border-primary text-primary-emphasis' : 'bg-white border'"
      :aria-expanded="showFilters"
      aria-controls="opportunity-filters"
      @click="showFilters = !showFilters"
    >
      Filters<span v-if="activeFilterCount > 0"> · {{ activeFilterCount }}</span>
    </button>

    <select v-model="sortBy" class="form-select form-select-sm rounded-pill w-auto" aria-label="Sort by">
      <option v-for="option in sortOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
    </select>
  </div>

  <div
    id="opportunity-filters"
    class="flex-wrap align-items-center gap-2 mb-3"
    :class="showFilters ? 'd-flex' : 'd-none d-md-flex'"
  >
    <span class="small text-body-secondary d-none d-md-inline"><i class="bi bi-funnel"></i> Filters</span>

    <!-- jobs tab only -->
    <template v-if="showJobFilters">
      <select
        v-if="roles.length > 0"
        v-model="jobField"
        class="form-select form-select-sm rounded-pill w-auto"
        :class="{ 'bg-primary-subtle border-primary text-primary-emphasis': jobField !== '' }"
        aria-label="Role"
      >
        <option value="">Role: Any</option>
        <option v-for="option in roles" :key="option.key" :value="option.key">Role: {{ option.label }}</option>
      </select>

      <select
        v-model="jobType"
        class="form-select form-select-sm rounded-pill w-auto"
        :class="{ 'bg-primary-subtle border-primary text-primary-emphasis': jobType !== '' }"
        aria-label="Work type"
      >
        <option value="">Work type</option>
        <option value="fulltime">Full-time</option>
        <option value="intern">Internship</option>
      </select>
    </template>

    <!-- hackathons tab only -->
    <template v-if="showHackathonFilters">
      <select
        v-model="theme"
        class="form-select form-select-sm rounded-pill w-auto"
        :class="{ 'bg-primary-subtle border-primary text-primary-emphasis': theme !== '' }"
        aria-label="Theme"
      >
        <option value="">Theme</option>
        <option v-for="name in themes" :key="name" :value="name">Theme: {{ name }}</option>
      </select>

      <select
        v-model="closingWithin"
        class="form-select form-select-sm rounded-pill w-auto"
        :class="{ 'bg-primary-subtle border-primary text-primary-emphasis': closingWithin !== '' }"
        aria-label="Deadline"
      >
        <option value="">Deadline</option>
        <option value="7">Deadline: next 7 days</option>
        <option value="30">Deadline: next 30 days</option>
      </select>
    </template>

    <!-- shared: apply to every card -->
    <select
      v-model="location"
      class="form-select form-select-sm rounded-pill w-auto"
      :class="{ 'bg-primary-subtle border-primary text-primary-emphasis': location !== '' }"
      aria-label="Location"
    >
      <option value="">Location</option>
      <option value="Singapore">Singapore</option>
      <option value="Online">Online / remote</option>
      <option value="Other">Elsewhere</option>
    </select>

    <button
      class="btn btn-sm rounded-pill"
      :class="paidOnly ? 'btn-light border-primary' : 'bg-white border'"
      @click="paidOnly = !paidOnly"
    >
      Paid only
    </button>

    <button class="btn btn-sm btn-link fw-semibold text-decoration-none" @click="$emit('clear')">Clear all</button>

    <small v-if="tab === 'overview'" class="text-body-tertiary">
      {{ hasTabFilters ? 'Filters from the Jobs / Hackathons tabs still apply here' : 'Role, work type, theme and deadline filters are on each tab' }}
    </small>

    <!-- on phones the sort dropdown sits next to the Filters button instead -->
    <div class="d-none d-md-flex align-items-center ms-auto small text-body-tertiary">
      Sort by
      <select v-model="sortBy" class="form-select form-select-sm w-auto border-0 bg-transparent shadow-none fw-semibold">
        <option v-for="option in sortOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
      </select>
    </div>
  </div>
</template>
