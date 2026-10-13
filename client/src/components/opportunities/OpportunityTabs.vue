<script setup>
defineProps({
  counts: { type: Object, required: true } // { all: 12, jobs: 8, hackathons: 4 }
})

const activeTab = defineModel('tab', { type: String, required: true })
const viewMode = defineModel('viewMode', { type: String, required: true })

const tabs = [
  { id: 'all', label: 'All' },
  { id: 'jobs', label: 'Jobs & internships' },
  { id: 'hackathons', label: 'Hackathons' }
]

</script>

<template>
  <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 border-bottom mb-3">
    <nav class="nav nav-underline column-gap-4">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="nav-link d-flex align-items-center gap-2 fw-semibold py-3"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
        <!-- the count is highlighted on the active tab -->
        <span
          class="badge rounded-pill fw-medium"
          :class="activeTab === tab.id ? 'bg-primary-subtle text-primary-emphasis' : 'bg-body-secondary text-body-secondary'"
        >
          {{ counts[tab.id] }}
        </span>
      </button>
    </nav>

    <!-- grid / list toggle -->
    <div class="btn-group bg-body-secondary rounded p-1">
      <button
        class="btn btn-sm border-0 rounded-1"
        :class="viewMode === 'grid' ? 'bg-white shadow-sm fw-semibold' : 'text-body-secondary'"
        @click="viewMode = 'grid'"
      >
        <i class="bi bi-grid"></i> Grid
      </button>
      <button
        class="btn btn-sm border-0 rounded-1"
        :class="viewMode === 'list' ? 'bg-white shadow-sm fw-semibold' : 'text-body-secondary'"
        @click="viewMode = 'list'"
      >
        <i class="bi bi-three-dots"></i> List
      </button>
    </div>
  </div>
</template>
