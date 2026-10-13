<script setup>
// location filter, "Paid only" toggle, Clear all and Sort by
const location = defineModel('location', { type: String, required: true })
const paidOnly = defineModel('paidOnly', { type: Boolean, required: true })
const sortBy = defineModel('sortBy', { type: String, required: true })

// the parent also clears the search box, so it does the clearing
defineEmits(['clear'])
</script>

<template>
  <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
    <span class="small text-body-secondary"><i class="bi bi-funnel"></i> Filters</span>

    <select
      v-model="location"
      class="form-select form-select-sm rounded-pill w-auto"
      :class="{ 'bg-primary-subtle border-primary text-primary-emphasis': location !== '' }"
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

    <div class="d-flex align-items-center ms-sm-auto small text-body-tertiary">
      Sort by
      <select v-model="sortBy" class="form-select form-select-sm w-auto border-0 bg-transparent shadow-none fw-semibold">
        <option value="closing">Closing soonest</option>
        <option value="pay">Highest pay / prize</option>
        <option value="title">Title (A–Z)</option>
      </select>
    </div>
  </div>
</template>
