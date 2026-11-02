<script setup>
defineProps({
  // { jobs, hackathons }; a tab without a count (Overview) shows no badge
  counts: { type: Object, required: true }
})

const activeTab = defineModel('tab', { type: String, required: true })
const viewMode = defineModel('viewMode', { type: String, required: true })

// shortLabel is used for the chips on phones
const tabs = [
  { id: 'overview', label: 'Overview', shortLabel: 'Overview' },
  { id: 'jobs', label: 'Jobs & internships', shortLabel: 'Jobs' },
  { id: 'hackathons', label: 'Hackathons', shortLabel: 'Hackathons' }
]

</script>

<template>
  <!-- phones: a row of chips that scrolls sideways, no grid / list toggle (cards are 1 per row anyway) -->
  <nav class="chip-row d-flex d-md-none gap-2 overflow-x-auto mb-3">
    <button
      v-for="tab in tabs"
      :key="tab.id"
      class="btn rounded-pill fw-semibold text-nowrap"
      :class="activeTab === tab.id ? 'btn-primary' : 'bg-white border'"
      :aria-pressed="activeTab === tab.id"
      @click="activeTab = tab.id"
    >
      {{ tab.shortLabel }}<span v-if="counts[tab.id] !== undefined"> · {{ counts[tab.id] }}</span>
    </button>
  </nav>

  <!-- tablets and up: underlined tabs with the grid / list toggle -->
  <div class="d-none d-md-flex justify-content-between align-items-center flex-wrap gap-2 border-bottom mb-3">
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
          v-if="counts[tab.id] !== undefined"
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

<style scoped>
/* the chips still scroll sideways, just without a visible scrollbar */
.chip-row {
  scrollbar-width: none;
}
</style>
