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
    <nav class="nav nav-underline column-gap-4">
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
