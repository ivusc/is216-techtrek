<script setup>
import { computed } from 'vue'
import { formatDate } from '@/utils/date'
import { getDaysLeft } from '@/utils/opportunity'
import { getApplicationDeadline, stagesFor } from '@/utils/application'
import { typeBadge, hackathonResults } from '@/constants'

const props = defineProps({
  application: { type: Object, required: true }
})

defineEmits(['open', 'move'])

const opportunity = computed(() => props.application.opportunityId)

// "Move to" only offers this card's own steps (a hackathon can't move to Interview)
const otherStages = computed(() =>
  stagesFor(opportunity.value.type).filter((stage) => stage.status !== props.application.status)
)

// a finished hackathon's result badge (Won / Finalist / Took part)
const result = computed(() => hackathonResults.find((option) => option.value === props.application.result))

// the date line at the bottom of the card depends on the stage
const dateLine = computed(() => {
  const { status, interviewAt, updatedAt } = props.application
  const deadline = getApplicationDeadline(props.application)

  if (status === 'interview' && interviewAt) {
    return { text: 'Interview ' + formatDate(interviewAt), urgent: false }
  }
  if (status === 'offer' && deadline) {
    return { text: 'Reply by ' + formatDate(deadline), urgent: false }
  }
  if (status === 'rejected') {
    return { text: 'Closed ' + formatDate(updatedAt), urgent: false }
  }
  // hackathon steps
  if (status === 'submitted') {
    return { text: 'Submitted ' + formatDate(updatedAt), urgent: false }
  }
  if (status === 'results') {
    return { text: 'Finished ' + formatDate(updatedAt), urgent: false }
  }
  if (status === 'team' && !deadline) {
    return { text: 'Team formed ' + formatDate(updatedAt), urgent: false }
  }
  if (deadline) {
    // red when due within a week (or already overdue)
    return { text: 'Due ' + formatDate(deadline), urgent: getDaysLeft({ deadline }) <= 7 }
  }
  if (status === 'applied') {
    return { text: 'Applied ' + formatDate(updatedAt), urgent: false }
  }
  return { text: 'No deadline', urgent: false }
})

// the column reads this id when the card is dropped on it
function onDragStart(event) {
  event.dataTransfer.setData('text/plain', props.application._id)
  event.dataTransfer.effectAllowed = 'move'
}
</script>

<template>
  <div
    class="card card-hover kanban-card"
    :class="{ 'is-rejected': application.status === 'rejected' }"
    draggable="true"
    tabindex="0"
    @dragstart="onDragStart"
    @click="$emit('open')"
    @keydown.enter="$emit('open')"
  >
    <!-- logo, organisation, ... menu -->
    <div class="d-flex align-items-center gap-2">
      <div class="org-logo d-flex justify-content-center align-items-center text-caption" :class="typeBadge[opportunity.type]">
        {{ opportunity.organisation.slice(0, 2).toUpperCase() }}
      </div>
      <p class="small fw-semibold text-body-secondary text-truncate flex-grow-1 mb-0">{{ opportunity.organisation }}</p>

      <!-- .stop so opening the menu does not also open the card -->
      <div class="dropdown" @click.stop @keydown.enter.stop>
        <button
          class="btn p-0 border-0 text-body-tertiary icon-16"
          type="button"
          data-bs-toggle="dropdown"
          aria-expanded="false"
          :aria-label="'Move ' + opportunity.title"
        >
          <i class="bi bi-three-dots"></i>
        </button>
        <ul class="dropdown-menu dropdown-menu-end">
          <li><h6 class="dropdown-header">Move to</h6></li>
          <li v-for="stage in otherStages" :key="stage.status">
            <button class="dropdown-item" type="button" @click="$emit('move', stage.status)">{{ stage.label }}</button>
          </li>
        </ul>
      </div>
    </div>

    <p class="fw-semibold mb-0">{{ opportunity.title }}</p>

    <div class="d-flex flex-wrap gap-1">
      <span class="badge rounded-pill fw-medium text-caption" :class="typeBadge[opportunity.type]">
        {{ opportunity.type[0].toUpperCase() + opportunity.type.slice(1) }}
      </span>
      <span v-if="application.status === 'results' && result" class="badge rounded-pill fw-medium text-caption" :class="result.css">
        <i :class="'bi ' + result.icon" aria-hidden="true"></i> {{ result.label }}
      </span>
    </div>

    <!-- date + notes icon (only when the application has notes; hover shows the notes) -->
    <div class="d-flex align-items-center gap-2 text-caption text-body-secondary">
      <i class="bi bi-calendar icon-14"></i>
      <span class="flex-grow-1" :class="{ 'text-danger-emphasis': dateLine.urgent }">{{ dateLine.text }}</span>
      <i
        v-if="application.notes"
        class="bi bi-file-earmark-text icon-14 text-body-tertiary"
        :title="application.notes"
        :aria-label="'Notes: ' + application.notes"
      ></i>
    </div>
  </div>
</template>
