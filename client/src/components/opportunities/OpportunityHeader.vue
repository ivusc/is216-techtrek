<script setup>
const search = defineModel({ type: String, required: true })

defineProps({
  title: { type: String, default: 'Discover' },
  subtitle: { type: String, default: 'Internships, jobs and hackathons — pulled live from Adzuna and Devpost.' },
  type: { type: String, default: 'opportunities' }
})
</script>

<template>
  <div class="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
    <div>
      <h1 class="mb-1">{{ title }}</h1>
      <p class="text-body-secondary mb-0">{{ subtitle }}</p>
    </div>
    <div class="d-flex align-items-center gap-2 mw-100">
      <div class="search position-relative">
        <i class="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-body-tertiary"></i>
        <input
          v-model="search"
          type="text"
          class="form-control rounded-pill ps-5"
          :placeholder="'Search for ' + type"
        >
      </div>
      <button class="btn bg-white border p-0 size-36 flex-shrink-0"><i class="bi bi-bell"></i></button>
      <div class="size-36 flex-shrink-0 rounded-circle bg-tt-peach d-flex justify-content-center align-items-center small fw-semibold">J</div>
    </div>
  </div>
</template>
