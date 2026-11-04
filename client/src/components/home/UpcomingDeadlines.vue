<script setup>
import { typeBadge } from '@/constants'
import { getStageLabel } from '@/utils/application'

// entries are { application, deadline, daysLeft }, soonest first
defineProps({
  deadlines: { type: Array, required: true }
})

function daysLeftText(daysLeft) {
  if (daysLeft === 0) return 'Due today'
  if (daysLeft === 1) return '1 day left'
  if (daysLeft < 7) return daysLeft + ' days left'
  if (daysLeft < 14) return '1 week left'
  if (daysLeft < 60) return Math.floor(daysLeft / 7) + ' weeks left'
  if (daysLeft < 365) return Math.floor(daysLeft / 30) + ' months left'
  return 'Over a year left'
}

function monthShort(date) {
  return new Date(date).toLocaleDateString('en-SG', { month: 'short' }).toUpperCase()
}
</script>

<template>
  <div class="card p-3 d-flex flex-column fill-card">
    <div class="d-flex justify-content-between align-items-center mb-2">
      <h2 class="h5 fw-semibold mb-0">Upcoming deadlines</h2>
      <RouterLink to="/tracker" class="small fw-semibold text-decoration-none">Open tracker</RouterLink>
    </div>

    <p v-if="deadlines.length === 0" class="text-body-secondary small mb-0 py-3">
      No upcoming deadlines. Track something from
      <RouterLink to="/opportunities">Opportunities</RouterLink> to see it here.
    </p>

    <div class="scroll-list">
      <RouterLink
        v-for="entry in deadlines.slice(0, 10)"
        :key="entry.application._id"
        to="/tracker"
        class="deadline-row row-hover d-flex align-items-center gap-3 py-2 px-2 text-decoration-none text-body"
      >
        <div
          class="date-tile rounded-3 d-flex flex-column align-items-center justify-content-center flex-shrink-0"
          :class="entry.daysLeft <= 7 ? 'bg-danger-subtle text-tt-accent' : 'bg-body-secondary text-body'"
        >
          <span class="text-overline">{{ monthShort(entry.deadline) }}</span>
          <span class="fw-bold">{{ new Date(entry.deadline).getDate() }}</span>
        </div>
        <div class="flex-grow-1 min-w-0">
          <p class="fw-semibold mb-1 text-truncate">{{ entry.application.opportunityId.title }}</p>
          <div class="d-flex align-items-center gap-2 small text-body-secondary">
            <span class="text-truncate">{{ entry.application.opportunityId.organisation }}</span>
            <span class="badge rounded-pill fw-medium text-capitalize" :class="typeBadge[entry.application.opportunityId.type]">
              {{ entry.application.opportunityId.type }}
            </span>
          </div>
        </div>
        <span class="status-pill badge rounded-pill bg-body-secondary text-body fw-medium d-none d-sm-inline-flex align-items-center gap-1">
          <span class="status-dot-home rounded-circle" :style="{ backgroundColor: `var(--tt-status-${entry.application.status})` }"></span>
          {{ getStageLabel(entry.application.status) }}
        </span>
        <span class="days-left small text-end flex-shrink-0" :class="entry.daysLeft <= 7 ? 'text-tt-accent fw-semibold' : 'text-body-secondary'">
          {{ daysLeftText(entry.daysLeft) }}
        </span>
      </RouterLink>
    </div>
  </div>
</template>
