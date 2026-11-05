<script setup>
import { computed } from 'vue'
import { typeBadge } from '@/constants'
import { groupByMonth, historyOutcome, historySummary, historyTimeline } from '@/utils/application'

// the Tracker's History view: applications and events that have left the board, newest first,
// grouped by the month they finished. Clicking one opens its details; "Back to board" un-archives it.
const props = defineProps({
  applications: { type: Array, required: true }, // archived ones only, already searched and filtered
  busyId: { type: String, default: '' } // the one being moved back to the board
})

const emit = defineEmits(['open', 'restore'])

const months = computed(() => groupByMonth(props.applications))
const summary = computed(() => historySummary(props.applications))

function plural(count, one, many) {
  return count + ' ' + (count === 1 ? one : many)
}
</script>

<template>
  <section class="tracker-history" aria-labelledby="history-title">
    <h2 id="history-title" class="visually-hidden">History</h2>

    <p v-if="applications.length > 0" class="small text-body-secondary mb-3">
      {{ plural(summary.total, 'finished', 'finished') }} ·
      {{ plural(summary.interviews, 'reached interview', 'reached interview') }} ·
      {{ plural(summary.offers, 'offer', 'offers') }} ·
      {{ plural(summary.events, 'hackathon or competition', 'hackathons and competitions') }}
    </p>

    <div v-if="applications.length === 0" class="card p-4 text-center">
      <i class="bi bi-clock-history fs-3 text-body-tertiary" aria-hidden="true"></i>
      <p class="fw-semibold mt-2 mb-1">Nothing in your history yet</p>
      <p class="small text-body-secondary mb-0">
        Cards in Offer, Rejected or Results move here 14 days after their last step.
        You can also move any card here from its "..." menu.
      </p>
    </div>

    <div v-for="month in months" :key="month.key" class="mb-4">
      <h3 class="h6 text-body-secondary mb-2">{{ month.label }}</h3>
      <ul class="list-group">
        <li
          v-for="application in month.items"
          :key="application._id"
          class="list-group-item d-flex flex-wrap align-items-center column-gap-3 row-gap-2 py-3"
        >
          <button
            type="button"
            class="history-open btn btn-link text-start text-decoration-none text-body p-0 flex-grow-1 min-w-0"
            @click="emit('open', application)"
          >
            <span class="d-flex flex-wrap align-items-center gap-2 mb-1">
              <span class="fw-semibold">{{ application.opportunityId.title }}</span>
              <span class="small text-body-secondary">{{ application.opportunityId.organisation }}</span>
              <span class="badge rounded-pill fw-medium text-caption" :class="typeBadge[application.opportunityId.type]">
                {{ application.opportunityId.type[0].toUpperCase() + application.opportunityId.type.slice(1) }}
              </span>
            </span>
            <span class="d-block text-caption text-body-secondary">{{ historyTimeline(application) }}</span>
          </button>

          <span class="d-flex flex-wrap align-items-center gap-2 ms-auto">
            <span v-if="application.review" class="badge rounded-pill bg-primary-subtle text-primary-emphasis fw-medium">
              <i class="bi bi-chat-quote me-1" aria-hidden="true"></i>Tips shared
            </span>
            <span class="history-outcome badge rounded-pill fw-semibold" :class="historyOutcome(application).css">
              {{ historyOutcome(application).label }}
            </span>
            <button
              type="button"
              class="btn btn-sm btn-light fw-semibold"
              :disabled="busyId === application._id"
              @click="emit('restore', application)"
            >
              Back to board
            </button>
          </span>
        </li>
      </ul>
    </div>
  </section>
</template>
