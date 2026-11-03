<script setup>
import { computed } from 'vue'
import { useUserStore } from '@/store/user'

const auth = useUserStore()
const initial = computed(() => (auth.username ?? '?').charAt(0).toUpperCase())

const search = defineModel({ type: String, required: true })

defineProps({
  title: { type: String, default: 'Opportunities' },
  subtitle: { type: String, default: 'Internships, jobs and hackathons — pulled live from Adzuna and Devpost.' },
  type: { type: String, default: 'opportunities' }
})
</script>

<template>
  <!-- on phones the search box wraps onto its own full-width row under the title -->
  <div class="d-flex flex-wrap align-items-center gap-2 mb-4">
    <div class="me-auto">
      <h1 class="mb-1">{{ title }}</h1>
      <p class="text-body-secondary mb-0 d-none d-md-block">{{ subtitle }}</p>
    </div>
    <div class="search position-relative order-last order-md-0">
      <i class="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-body-tertiary"></i>
      <input
        v-model="search"
        type="text"
        class="form-control rounded-pill ps-5"
        :placeholder="`Search ${type}...`"
        :aria-label="`Search ${type}`"
      >
    </div>
    <button class="btn bg-white border p-0 size-36 flex-shrink-0" aria-label="Notifications"><i class="bi bi-bell"></i></button>
    <div class="size-36 flex-shrink-0 rounded-circle bg-tt-peach d-flex justify-content-center align-items-center small fw-semibold">{{ initial }}</div>
  </div>
</template>
