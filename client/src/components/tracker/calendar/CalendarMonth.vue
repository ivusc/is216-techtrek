<script setup>
import { ref, computed } from 'vue'
import CalendarDay from '@/components/tracker/CalendarDay.vue'
import { toDayKey, getMonthGridDates } from '@/utils/calendar'

const props = defineProps({
  eventsByDay: { type: Object, required: true }
})

defineEmits(['open'])

const weekdayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function getFirstOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

// the month being shown, stored as its 1st day
const shownMonth = ref(getFirstOfMonth(new Date()))

const monthTitle = computed(() => {
  return shownMonth.value.toLocaleDateString('en-SG', { month: 'long', year: 'numeric' })
})

function showPreviousMonth() {
  shownMonth.value = new Date(shownMonth.value.getFullYear(), shownMonth.value.getMonth() - 1, 1)
}

function showNextMonth() {
  shownMonth.value = new Date(shownMonth.value.getFullYear(), shownMonth.value.getMonth() + 1, 1)
}

function showToday() {
  shownMonth.value = getFirstOfMonth(new Date())
}

// one entry per square in the grid
const calendarDays = computed(() => {
  const year = shownMonth.value.getFullYear()
  const month = shownMonth.value.getMonth()
  const todayKey = toDayKey(new Date())

  return getMonthGridDates(year, month).map((date) => {
    const dayKey = toDayKey(date)
    const dayOfWeek = date.getDay()
    return {
      key: dayKey,
      dayOfMonth: date.getDate(),
      isInShownMonth: date.getMonth() === month,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      isToday: dayKey === todayKey,
      events: props.eventsByDay[dayKey] || []
    }
  })
})
</script>

<template>
  <section class="card calendar-month flex-grow-1" aria-labelledby="calendar-title">
    <div class="d-flex align-items-center gap-2 calendar-month-header">
      <h2 id="calendar-title" class="mb-0">{{ monthTitle }}</h2>
      <div class="d-flex gap-1">
        <button class="btn bg-white calendar-nav-btn" type="button" aria-label="Previous month" @click="showPreviousMonth">
          <i class="bi bi-chevron-left"></i>
        </button>
        <button class="btn bg-white calendar-nav-btn" type="button" aria-label="Next month" @click="showNextMonth">
          <i class="bi bi-chevron-right"></i>
        </button>
      </div>
      <button class="btn btn-light btn-sm fw-semibold ms-auto" type="button" @click="showToday">Today</button>
    </div>

    <div class="calendar-scroll">
      <div class="calendar-grid calendar-weekdays">
        <div v-for="name in weekdayNames" :key="name" class="text-caption text-body-tertiary px-2">{{ name }}</div>
      </div>

      <div class="calendar-grid">
        <CalendarDay v-for="day in calendarDays" :key="day.key" :day="day" @open="$emit('open', $event)" />
      </div>
    </div>
  </section>
</template>
