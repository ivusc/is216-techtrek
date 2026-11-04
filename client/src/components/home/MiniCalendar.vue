<script setup>
import { ref, computed } from 'vue'
import { formatTime } from '@/utils/date'

// events: [{ date, kind, title, organisation }] where kind is 'deadline' or 'interview';
// each one adds a dot under its day, and clicking a day lists that day's events below the calendar
const props = defineProps({
  events: { type: Array, default: () => [] }
})

const weekdays = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const today = new Date()
const shownMonth = ref(new Date(today.getFullYear(), today.getMonth(), 1))
const selectedDate = ref(new Date(today.getFullYear(), today.getMonth(), today.getDate()))

const monthLabel = computed(() =>
  shownMonth.value.toLocaleDateString('en-SG', { month: 'long', year: 'numeric' })
)

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function eventsOn(date) {
  return props.events.filter((event) => sameDay(new Date(event.date), date))
}

// 6 rows of 7 days, starting on the Monday on or before the 1st (days from the next/previous month are greyed out)
const days = computed(() => {
  const first = shownMonth.value
  const offset = (first.getDay() + 6) % 7 // Monday = 0
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - offset)

  const result = []
  for (let i = 0; i < 42; i++) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    const dayEvents = eventsOn(date)
    const kinds = []
    for (const event of dayEvents) {
      if (!kinds.includes(event.kind)) {
        kinds.push(event.kind)
      }
    }
    result.push({
      date,
      inMonth: date.getMonth() === first.getMonth(),
      isToday: sameDay(date, today),
      isSelected: sameDay(date, selectedDate.value),
      kinds,
      count: dayEvents.length,
    })
  }
  return result
})

function changeMonth(step) {
  shownMonth.value = new Date(shownMonth.value.getFullYear(), shownMonth.value.getMonth() + step, 1)
}

// clicking a greyed-out day from the next / previous month also moves the calendar to that month
function selectDay(day) {
  selectedDate.value = day.date
  if (!day.inMonth) {
    shownMonth.value = new Date(day.date.getFullYear(), day.date.getMonth(), 1)
  }
}

function goToToday() {
  selectedDate.value = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  shownMonth.value = new Date(today.getFullYear(), today.getMonth(), 1)
}

const selectedEvents = computed(() => {
  // interviews first (they have a time), then deadlines
  return [...eventsOn(selectedDate.value)].sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'interview' ? -1 : 1))
})

const selectedLabel = computed(() => {
  if (sameDay(selectedDate.value, today)) return 'Today'
  return selectedDate.value.toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short' })
})

// read out by screen readers for each day, e.g. "5 November, 1 deadline"
function dayLabel(day) {
  const date = day.date.toLocaleDateString('en-SG', { day: 'numeric', month: 'long' })
  if (day.count === 0) return date
  return date + ', ' + day.count + (day.count === 1 ? ' event' : ' events')
}
</script>

<template>
  <div class="card p-3">
    <div class="d-flex justify-content-between align-items-center mb-2">
      <h2 class="h6 fw-semibold mb-0">{{ monthLabel }}</h2>
      <div class="d-flex align-items-center">
        <button class="btn btn-sm btn-link text-decoration-none fw-semibold px-1" type="button" @click="goToToday">Today</button>
        <button class="btn btn-sm border-0 px-1" type="button" aria-label="Previous month" @click="changeMonth(-1)">
          <i class="bi bi-chevron-left"></i>
        </button>
        <button class="btn btn-sm border-0 px-1" type="button" aria-label="Next month" @click="changeMonth(1)">
          <i class="bi bi-chevron-right"></i>
        </button>
      </div>
    </div>

    <div class="mini-grid text-center">
      <span v-for="(weekday, index) in weekdays" :key="'w' + index" class="text-caption text-body-tertiary pb-1">{{ weekday }}</span>
      <button
        v-for="day in days"
        :key="day.date.toISOString()"
        type="button"
        class="mini-cell btn p-0 border-0 d-flex flex-column align-items-center"
        :aria-label="dayLabel(day)"
        :aria-pressed="day.isSelected"
        @click="selectDay(day)"
      >
        <span
          class="mini-day rounded-circle d-flex align-items-center justify-content-center small"
          :class="{
            'bg-primary text-white fw-semibold': day.isToday,
            'is-selected': day.isSelected && !day.isToday,
            'is-selected-today': day.isSelected && day.isToday,
            'text-body-tertiary': !day.inMonth && !day.isToday,
          }"
        >
          {{ day.date.getDate() }}
        </span>
        <span class="d-flex gap-1 mini-dots">
          <span v-for="kind in day.kinds" :key="kind" class="mini-dot rounded-circle" :class="'dot-' + kind"></span>
        </span>
      </button>
    </div>

    <!-- what's on the clicked day -->
    <div class="mini-agenda border-top mt-1 pt-2" aria-live="polite">
      <div class="d-flex justify-content-between align-items-center" :class="{ 'mb-1': selectedEvents.length > 0 }">
        <p class="small mb-0">
          <span class="fw-semibold">{{ selectedLabel }}</span>
          <!-- an empty day says so on the same line, to keep the card short -->
          <span v-if="selectedEvents.length === 0" class="text-body-tertiary"> · nothing on</span>
        </p>
        <!-- what the dots mean -->
        <span class="d-flex gap-2 text-caption text-body-secondary">
          <span class="d-flex align-items-center gap-1"><span class="mini-dot rounded-circle dot-deadline"></span>Deadline</span>
          <span class="d-flex align-items-center gap-1"><span class="mini-dot rounded-circle dot-interview"></span>Interview</span>
        </span>
      </div>
      <div v-if="selectedEvents.length > 0" class="mini-agenda-list d-flex flex-column gap-1">
        <RouterLink
          v-for="(event, index) in selectedEvents"
          :key="index"
          to="/tracker"
          class="mini-event d-flex align-items-center gap-2 rounded-2 px-2 py-1 text-decoration-none text-body"
        >
          <span class="mini-dot rounded-circle flex-shrink-0" :class="'dot-' + event.kind"></span>
          <span class="flex-grow-1 min-w-0">
            <span class="d-block small fw-semibold text-truncate">{{ event.title }}</span>
            <span class="d-block text-caption text-body-secondary text-truncate">
              {{ event.kind === 'interview' ? 'Interview · ' + formatTime(event.date) : 'Deadline' }}<template v-if="event.organisation"> · {{ event.organisation }}</template>
            </span>
          </span>
          <i class="bi bi-chevron-right text-body-tertiary small" aria-hidden="true"></i>
        </RouterLink>
      </div>
    </div>

  </div>
</template>

<style scoped>
.mini-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}
.mini-cell {
  padding: 0 !important;
}
.mini-cell:hover .mini-day:not(.bg-primary) {
  background-color: var(--bs-primary-bg-subtle);
}
.mini-cell:focus-visible {
  outline: none;
}
.mini-cell:focus-visible .mini-day {
  box-shadow: 0 0 0 2px var(--bs-primary);
}
.mini-day {
  width: 24px;
  height: 24px;
  transition: background-color 0.15s ease;
}
/* the clicked day gets a ring; today keeps its filled circle and gets a ring around it */
.mini-day.is-selected {
  box-shadow: inset 0 0 0 2px var(--bs-primary);
  color: var(--bs-primary);
  font-weight: 600;
}
.mini-day.is-selected-today {
  box-shadow: 0 0 0 2px var(--bs-white), 0 0 0 4px var(--bs-primary);
}
.mini-dots {
  height: 5px;
}
.mini-dot {
  display: inline-block;
  width: 5px;
  height: 5px;
}
.mini-event .mini-dot {
  width: 8px;
  height: 8px;
}
.dot-deadline {
  background-color: var(--tt-accent);
}
.dot-interview {
  background-color: var(--bs-primary);
}

/* a busy day scrolls inside the card, so the dashboard still fits on one screen */
.mini-agenda-list {
  max-height: 96px;
  overflow-y: auto;
}
.mini-event {
  background-color: var(--bs-secondary-bg);
}
.mini-event:hover {
  background-color: var(--bs-primary-bg-subtle);
}
</style>
