<script setup>

defineProps({
  counts: { type: Object, required: true }
})

const tab = defineModel('tab', { type: String, required: true })

defineEmits(['create'])

const tabs = [
  { key: 'browse', label: 'Browse teams' },
  { key: 'mine', label: 'My teams' },
  { key: 'requests', label: 'Requests' }
]
</script>

<template>
  <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 border-bottom mb-3">
    <nav class="nav nav-underline flex-nowrap column-gap-2 column-gap-md-4 tabs-scroll">
      <button
        v-for="item in tabs"
        :key="item.key"
        class="nav-link bg-transparent border-0 d-flex align-items-center gap-2 fw-semibold py-3"
        :class="{ active: tab === item.key }"
        @click="tab = item.key"
      >
        {{ item.label }}
        <span class="badge rounded-pill fw-medium bg-primary-subtle text-primary-emphasis">{{ counts[item.key] }}</span>
      </button>
    </nav>

    <button class="btn btn-tt-accent fw-semibold mb-2" @click="$emit('create')">
      <i class="bi bi-plus-lg"></i> Create team post
    </button>
  </div>
</template>

<style scoped>
/* on phones the three tabs stay on one line and scroll sideways if they ever don't fit */
.tabs-scroll {
  overflow-x: auto;
  scrollbar-width: none;
}
.tabs-scroll .nav-link {
  white-space: nowrap;
}
/* small phones: the tabs share the full width and use slightly smaller text so all three fit */
@media (max-width: 575.98px) {
  .tabs-scroll {
    width: 100%;
  }
  .tabs-scroll .nav-link {
    flex: 1 1 auto;
    justify-content: center;
    gap: .375rem !important;
    font-size: .875rem;
  }
}
</style>
