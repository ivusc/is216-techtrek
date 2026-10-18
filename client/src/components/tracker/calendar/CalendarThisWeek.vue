<script setup>
import { computed } from 'vue'
import { formatDate, formatTime } from '@/utils/date'
import { toDayKey } from '@/utils/calendar'

const props = defineProps({
  eventsByDay: { type: Object, required: true }
})

defineEmits(['open'])

// today plus the next 7 days (same range as the toolbar's "due this week"),
// only the days that have something on
const daysWithEvents = computed(() => {
  const groups = []
  const today = new Date()

  for (let offset = 0; offset <= 7; offset++) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset)
    const dayKey = toDayKey(date)
    const events = props.eventsByDay[dayKey]
    if (events) {
      const weekday = date.toLocaleDateString('en-SG', { weekday: 'short' })
      groups.push({
        key: dayKey,
        heading: weekday + ' ' + formatDate(date),
        events
      })
    }
  }
  return groups
})
</script>

<template>
  <section class="card calendar-panel">
    <h3 class="mb-0">This week</h3>

    <p v-if="daysWithEvents.length === 0" class="small text-body-secondary mb-0">Nothing due in the next 7 days.</p>

    <div v-for="group in daysWithEvents" :key="group.key" class="d-flex flex-column gap-2">
      <p class="text-overline text-uppercase text-body-tertiary mb-0">{{ group.heading }}</p>
      <button
        v-for="event in group.events"
        :key="event.application._id + event.detail"
        class="calendar-week-event"
        :class="'event-' + event.kind"
        type="button"
        @click="$emit('open', event.application)"
      >
        <span class="event-bar"></span>
        <span class="d-flex flex-column text-start overflow-hidden">
          <span class="small fw-semibold text-truncate">{{ event.application.opportunityId.title }}</span>
          <span class="text-caption text-body-secondary">{{ formatTime(event.date) }} · {{ event.detail }}</span>
        </span>
      </button>
    </div>
  </section>
</template>
