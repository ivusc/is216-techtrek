<script setup>
import { computed } from 'vue'
import { useUserStore } from '@/store/user'
import { getInitials } from '@/utils/team'

const auth = useUserStore()
const initials = computed(() => getInitials(auth.displayName ?? auth.username ?? ''))

const search = defineModel({ type: String, default: '' })

defineProps({
  title: { type: String, default: 'Opportunities' },
  subtitle: { type: String, default: 'Internships, jobs and hackathons — pulled live from Adzuna and Devpost.' },
  type: { type: String, default: 'opportunities' },
  showSearch: { type: Boolean, default: true }
})
</script>

<template>
  <!-- on phones the search box wraps onto its own full-width row under the title -->
  <div class="d-flex flex-wrap align-items-center gap-2 mb-4">
    <div class="me-auto">
      <h1 class="mb-1">{{ title }}</h1>
      <p class="text-body-secondary mb-0 d-none d-md-block">{{ subtitle }}</p>
    </div>
    <div v-if="showSearch" class="search position-relative order-last order-md-0">
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
    <RouterLink
      to="/profile"
      class="size-36 flex-shrink-0 rounded-circle bg-tt-peach d-flex justify-content-center align-items-center small fw-semibold text-body text-decoration-none"
      :title="auth.displayName"
      aria-label="Your profile"
    >{{ initials }}</RouterLink>
  </div>
</template>
