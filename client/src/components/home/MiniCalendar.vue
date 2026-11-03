<script setup>
import { ref, computed } from 'vue'

// events: [{ date, kind }] where kind is 'deadline' or 'interview'; each one adds a dot under its day
const props = defineProps({
  events: { type: Array, default: () => [] }
})

const weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const today = new Date()
const shownMonth = ref(new Date(today.getFullYear(), today.getMonth(), 1))

const monthLabel = computed(() =>
  shownMonth.value.toLocaleDateString('en-SG', { month: 'long', year: 'numeric' })
)

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

// 6 rows of 7 days, starting on the Monday on or before the 1st (days from the next/previous month are greyed out)
const days = computed(() => {
  const first = shownMonth.value
  const offset = (first.getDay() + 6) % 7 // Monday = 0
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - offset)

  const result = []
  for (let i = 0; i < 42; i++) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    const kinds = []
    for (const event of props.events) {
      if (sameDay(new Date(event.date), date) && !kinds.includes(event.kind)) {
        kinds.push(event.kind)
      }
    }
    result.push({
      date,
      inMonth: date.getMonth() === first.getMonth(),
      isToday: sameDay(date, today),
      kinds,
    })
  }
  return result
})

function changeMonth(step) {
  shownMonth.value = new Date(shownMonth.value.getFullYear(), shownMonth.value.getMonth() + step, 1)
}
</script>

<template>
  <div class="card p-3">
    <div class="d-flex justify-content-between align-items-center mb-2">
      <h2 class="h6 fw-semibold mb-0">{{ monthLabel }}</h2>
      <div class="d-flex">
        <button class="btn btn-sm border-0 px-1" type="button" aria-label="Previous month" @click="changeMonth(-1)">
          <i class="bi bi-chevron-left"></i>
        </button>
        <button class="btn btn-sm border-0 px-1" type="button" aria-label="Next month" @click="changeMonth(1)">
          <i class="bi bi-chevron-right"></i>
        </button>
      </div>
    </div>

    <div class="mini-grid text-center">
      <span v-for="(weekday, index) in weekdays" :key="'w' + index" class="text-caption text-body-tertiary py-1">{{ weekday }}</span>
      <div v-for="day in days" :key="day.date.toISOString()" class="d-flex flex-column align-items-center">
        <span
          class="mini-day rounded-circle d-flex align-items-center justify-content-center small"
          :class="{ 'bg-primary text-white fw-semibold': day.isToday, 'text-body-tertiary': !day.inMonth }"
        >
          {{ day.date.getDate() }}
        </span>
        <span class="d-flex gap-1 mini-dots">
          <span v-for="kind in day.kinds" :key="kind" class="mini-dot rounded-circle" :class="'dot-' + kind"></span>
        </span>
      </div>
    </div>

    <div class="d-flex gap-3 mt-2 text-caption text-body-secondary">
      <span class="d-flex align-items-center gap-1"><span class="mini-dot rounded-circle dot-deadline"></span>Deadline</span>
      <span class="d-flex align-items-center gap-1"><span class="mini-dot rounded-circle dot-interview"></span>Interview</span>
    </div>
  </div>
</template>

<style scoped>
.mini-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}
.mini-day {
  width: 26px;
  height: 26px;
}
.mini-dots {
  height: 6px;
}
.mini-dot {
  display: inline-block;
  width: 5px;
  height: 5px;
}
.dot-deadline {
  background-color: var(--tt-accent);
}
.dot-interview {
  background-color: var(--bs-primary);
}
</style>
