<script setup>
const legend = [
  { kind: 'job', label: 'Job deadline' },
  { kind: 'hackathon', label: 'Hackathon' },
  { kind: 'competition', label: 'Competition' },
  { kind: 'interview', label: 'Interview' }
]
</script>

<template>
  <section class="card calendar-panel calendar-legend">
    <h3 class="h4 mb-0">Legend</h3>
    <div v-for="item in legend" :key="item.kind" class="d-flex align-items-center gap-2">
      <span class="legend-swatch" :class="'event-' + item.kind"></span>
      <span class="small fw-normal text-body-secondary">{{ item.label }}</span>
    </div>
  </section>
</template>
