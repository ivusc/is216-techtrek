<script setup>
import { computed } from 'vue'
import CalendarMonth from '@/components/tracker/calendar/CalendarMonth.vue'
import CalendarThisWeek from '@/components/tracker/calendar/CalendarThisWeek.vue'
import CalendarLegend from '@/components/tracker/calendar/CalendarLegend.vue'
import { groupEventsByDay } from '@/utils/calendar'

const props = defineProps({
  applications: { type: Array, required: true }
})

defineEmits(['open', 'export'])

// shared by the month grid and the "This week" panel
const eventsByDay = computed(() => groupEventsByDay(props.applications))
</script>

<template>
  <div class="d-flex flex-column flex-xl-row gap-4 align-items-stretch align-items-xl-start">
    <CalendarMonth :events-by-day="eventsByDay" @open="$emit('open', $event)" />

    <!-- side column -->
    <div class="calendar-side d-flex flex-column gap-3">
      <CalendarThisWeek :events-by-day="eventsByDay" @open="$emit('open', $event)" />
      <CalendarLegend />

      <button class="btn btn-light calendar-export small fw-semibold" type="button" @click="$emit('export')">
        <i class="bi bi-calendar icon-16"></i>
        Export to Google Calendar (.ics)
      </button>
    </div>
  </div>
</template>
