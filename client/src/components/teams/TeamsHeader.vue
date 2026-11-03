<script setup>
import { getInitials } from '@/utils/team'

const search = defineModel({ type: String, required: true })

defineProps({
  userName: { type: String, default: '' },
  hasNewRequests: { type: Boolean, default: false }
})

defineEmits(['bell'])
</script>

<template>
  <div class="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
    <div>
      <h1 class="mb-1">Teammate finder</h1>
      <p class="text-body-secondary mb-0">Find teammates for hackathons and competitions — or advertise your open slots.</p>
    </div>

    <div class="d-flex align-items-center gap-2">
      <div class="team-search position-relative">
        <i class="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-body-tertiary"></i>
        <input
          v-model="search"
          type="text"
          class="form-control rounded-pill ps-5"
          placeholder="Search teams"
          aria-label="Search teams"
        >
      </div>

      <button class="btn bg-white border rounded-3 position-relative size-40 p-0" title="Requests" aria-label="Requests" @click="$emit('bell')">
        <i class="bi bi-bell"></i>
        <span v-if="hasNewRequests" class="position-absolute top-0 end-0 mt-1 me-1 p-1 bg-tt-accent rounded-circle"></span>
      </button>

      <RouterLink
        v-if="userName !== ''"
        to="/profile"
        class="size-40 rounded-circle d-flex justify-content-center align-items-center fw-semibold small bg-tt-peach text-body text-decoration-none"
        :title="userName"
        aria-label="Your profile"
      >
        {{ getInitials(userName) }}
      </RouterLink>
    </div>
  </div>
</template>
