<script setup>
import { computed } from 'vue'

const props = defineProps({
  total: { type: Number, required: true }, // applications shown on the board
  dueThisWeek: { type: Number, required: true }
})

const viewMode = defineModel('viewMode', { type: String, required: true })
const typeFilter = defineModel('type', { type: String, required: true })
const deadlineFilter = defineModel('deadline', { type: String, required: true })
const hideRejected = defineModel('hideRejected', { type: Boolean, required: true })

defineEmits(['add'])

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

const typeLabel = computed(() => typeOptions.find((option) => option.value === typeFilter.value).label)

// the chip just says "Deadline" until a filter is picked
const deadlineLabel = computed(() => {
  if (deadlineFilter.value === '') {
    return 'Deadline'
  }
  return deadlineOptions.find((option) => option.value === deadlineFilter.value).label
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

    <div class="dropdown">
      <button
        class="btn btn-sm rounded-pill chip"
        :class="typeFilter !== '' ? 'btn-light border-primary' : 'bg-white'"
        type="button"
        data-bs-toggle="dropdown"
        aria-expanded="false"
      >
        Type: {{ typeLabel }} <i class="bi bi-chevron-down ms-1"></i>
      </button>
      <ul class="dropdown-menu">
        <li v-for="option in typeOptions" :key="option.value">
          <button class="dropdown-item" :class="{ active: typeFilter === option.value }" type="button" @click="typeFilter = option.value">
            {{ option.label }}
          </button>
        </li>
      </ul>
    </div>

    <div class="dropdown">
      <button
        class="btn btn-sm rounded-pill chip"
        :class="deadlineFilter !== '' ? 'btn-light border-primary' : 'bg-white'"
        type="button"
        data-bs-toggle="dropdown"
        aria-expanded="false"
      >
        {{ deadlineLabel }} <i class="bi bi-chevron-down ms-1"></i>
      </button>
      <ul class="dropdown-menu">
        <li v-for="option in deadlineOptions" :key="option.value">
          <button class="dropdown-item" :class="{ active: deadlineFilter === option.value }" type="button" @click="deadlineFilter = option.value">
            {{ option.label }}
          </button>
        </li>
      </ul>
    </div>

    <button
      class="btn btn-sm rounded-pill chip"
      :class="hideRejected ? 'btn-light border-primary' : 'bg-white'"
      type="button"
      :aria-pressed="hideRejected"
      @click="hideRejected = !hideRejected"
    >
      Hide rejected
    </button>

    <span class="small fw-medium text-body-tertiary ms-auto">{{ summary }}</span>

    <button class="btn btn-tt-accent fw-semibold btn-cta" type="button" @click="$emit('add')">
      <i class="bi bi-plus-lg me-2"></i>Add application
    </button>
  </div>
</template>
