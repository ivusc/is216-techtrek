<script setup>
defineProps({
  // { dayOfMonth, isInShownMonth, isWeekend, isToday, events }
  day: { type: Object, required: true }
})

defineEmits(['open'])
</script>

<template>
  <div
    class="calendar-day"
    :class="{
      'is-outside': !day.isInShownMonth,
      'is-weekend': day.isInShownMonth && day.isWeekend
    }"
  >
    <span class="calendar-date small fw-semibold" :class="{ 'is-today': day.isToday }">
      {{ day.dayOfMonth }}
    </span>

    <button
      v-for="event in day.events"
      :key="event.application._id + event.detail"
      class="calendar-chip text-caption"
      :class="'event-' + event.kind"
      type="button"
      :title="event.detail + ': ' + event.application.opportunityId.title"
      @click="$emit('open', event.application)"
    >
      <span class="event-bar"></span>
      <span class="text-truncate">{{ event.shortLabel }}</span>
    </button>
  </div>
</template>
