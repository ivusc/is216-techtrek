<script setup>
defineProps({
  stats: { type: Array, required: true }
})
</script>

<template>
  <div class="row g-3 mb-3">
    <div v-for="stat in stats" :key="stat.label" class="col-6 col-xl-3">
      <!-- each number links to where it comes from -->
      <RouterLink :to="stat.to" class="card home-stat-card card-hover h-100 text-decoration-none text-body">
        <div class="d-flex justify-content-between align-items-start mb-2">
          <span class="home-stat-icon rounded-3 d-flex align-items-center justify-content-center" :class="stat.tile">
            <i :class="`bi ${stat.icon}`"></i>
          </span>
          <span class="text-caption text-body-tertiary text-end">{{ stat.note }}</span>
        </div>
        <div class="text-stat">{{ stat.value }}</div>
        <div class="small text-body-secondary">{{ stat.label }}</div>
      </RouterLink>
    </div>
  </div>
</template>
