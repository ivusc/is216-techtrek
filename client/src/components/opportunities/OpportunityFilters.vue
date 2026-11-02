<script setup>
import { computed, ref } from 'vue'

const location = defineModel('location', { type: String, required: true })
const paidOnly = defineModel('paidOnly', { type: Boolean, required: true })
const sortBy = defineModel('sortBy', { type: String, required: true })

// the parent also clears the search box, so it does the clearing
defineEmits(['clear'])

const sortOptions = [
  { value: 'closing', label: 'Closing soonest' },
  { value: 'pay', label: 'Highest pay / prize' },
  { value: 'title', label: 'Title (A–Z)' }
]

// phones only: the filters are hidden behind the "Filters" button until it is clicked
const showFilters = ref(false)

// shown on the "Filters" button, e.g. "Filters · 2"
const activeFilterCount = computed(() => {
  let count = 0
  if (location.value !== '') {
    count++
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

  <!-- always shown from tablets up, on phones only after the Filters button is clicked -->
  <div
    id="opportunity-filters"
    class="flex-wrap align-items-center gap-2 mb-3"
    :class="showFilters ? 'd-flex' : 'd-none d-md-flex'"
  >
    <span class="small text-body-secondary d-none d-md-inline"><i class="bi bi-funnel"></i> Filters</span>

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

    <!-- on phones the sort dropdown sits next to the Filters button instead -->
    <div class="d-none d-md-flex align-items-center ms-auto small text-body-tertiary">
      Sort by
      <select v-model="sortBy" class="form-select form-select-sm w-auto border-0 bg-transparent shadow-none fw-semibold">
        <option v-for="option in sortOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
      </select>
    </div>
  </div>
</template>
