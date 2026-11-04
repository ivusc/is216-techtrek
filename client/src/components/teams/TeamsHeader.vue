<script setup>
import { useUserStore } from '@/store/user'
import UserAvatar from '@/components/UserAvatar.vue'

const auth = useUserStore()

const search = defineModel({ type: String, required: true })

defineProps({
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

    <div class="d-flex align-items-center gap-2 min-w-0">
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

      <RouterLink to="/profile" class="flex-shrink-0 text-decoration-none" aria-label="Your profile">
        <UserAvatar
          :user-id="auth._id ?? ''"
          :name="auth.displayName ?? ''"
          :avatar-updated-at="auth.avatarUpdatedAt"
          :size="40"
          class="bg-primary text-white"
        />
      </RouterLink>
    </div>
  </div>
</template>
