<script setup>
import { computed } from 'vue'
import { useUserStore } from '@/store/user'
import UserAvatar from '@/components/UserAvatar.vue'

const auth = useUserStore()
const name = computed(() => auth.displayName ?? auth.username ?? '')

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
    <div class="page-title me-auto">
      <h1 class="mb-1">{{ title }}</h1>
      <p class="text-body-secondary mb-0 d-none d-md-block">{{ subtitle }}</p>
    </div>
    <div v-if="showSearch" class="search position-relative order-last order-xl-0">
      <i class="bi bi-search position-absolute top-50 start-0 translate-middle-y ms-3 text-body-tertiary"></i>
      <input
        v-model="search"
        type="text"
        class="form-control rounded-pill ps-5"
        :placeholder="`Search ${type}...`"
        :aria-label="`Search ${type}`"
      >
    </div>
    <!-- bell and avatar stay together so the avatar never drops onto a line by itself -->
    <div class="d-flex align-items-center gap-2 flex-shrink-0">
      <button class="btn bg-white border p-0 size-36 flex-shrink-0" aria-label="Notifications"><i class="bi bi-bell"></i></button>
      <RouterLink to="/profile" class="flex-shrink-0 text-decoration-none" aria-label="Your profile">
        <UserAvatar
          :user-id="auth._id ?? ''"
          :name="name"
          :avatar-updated-at="auth.avatarUpdatedAt"
          :size="36"
          class="bg-primary text-white"
        />
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
/* the title takes the space that is left (and wraps its own text), so the bell and avatar
   always stay on the same row as the title; the search box moves to its own row when there is no room */
.page-title {
  flex: 1 1 0;
  min-width: 0;
}
</style>
