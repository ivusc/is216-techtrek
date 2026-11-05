<script setup>
import { computed, onMounted, ref } from 'vue'
import { fetchApplicationService } from '@/services/trackerService'
import { getApplicationDeadline, getStageLabel } from '@/utils/application'
import { formatDateTime } from '@/utils/date'
import { timeLeftText } from '@/utils/notification'
import { timeAgo } from '@/utils/team'
import { typeBadge } from '@/constants'

// the card that opens when a deadline reminder in the bell is tapped: what is due, when, how long is left,
// and where it is in the tracker. The reminder itself only knows the name and date, so the
// application is loaded fresh (its stage or deadline may have changed since the reminder was sent).
const props = defineProps({
  notification: { type: Object, required: true }
})

const emit = defineEmits(['close'])

const application = ref(null)
const isLoading = ref(true)
const missing = ref(false) // the application was deleted from the tracker
const failed = ref(false)

const opportunity = computed(() => application.value?.opportunityId ?? null)
const title = computed(() => opportunity.value?.title ?? props.notification.title ?? 'Tracked application')
const organisation = computed(() => opportunity.value?.organisation ?? props.notification.organisation ?? '')
// the current deadline if the application loaded, else the one the reminder was sent for
const deadline = computed(() => (application.value ? getApplicationDeadline(application.value) : null) ?? props.notification.deadline)
const timeLeft = computed(() => (deadline.value ? timeLeftText(deadline.value) : ''))
const reminderKind = computed(() => (props.notification.daysLeft > 1 ? '3 days before' : '1 day before'))

async function load() {
  if (!props.notification.applicationId) {
    isLoading.value = false
    missing.value = true
    return
  }
  try {
    application.value = await fetchApplicationService(props.notification.applicationId)
  } catch (error) {
    if (error.response?.status === 404) missing.value = true
    else failed.value = true
    console.error(error)
  }
  isLoading.value = false
}

// focus the dialog so Esc works straight away
const dialog = ref(null)
onMounted(() => {
  dialog.value.focus()
  load()
})
</script>

<template>
  <div class="modal-backdrop fade show"></div>

  <div
    ref="dialog"
    class="modal d-block"
    tabindex="-1"
    role="dialog"
    aria-modal="true"
    aria-labelledby="reminder-modal-title"
    @click.self="emit('close')"
    @keydown.esc="emit('close')"
  >
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header gap-3">
          <div class="flex-grow-1 min-w-0">
            <p class="small fw-semibold text-warning-emphasis mb-1">
              <i class="bi bi-alarm me-1" aria-hidden="true"></i>Deadline reminder
            </p>
            <h2 id="reminder-modal-title" class="h3 mb-1">{{ title }}</h2>
            <div class="d-flex flex-wrap align-items-center gap-2">
              <span v-if="organisation" class="small text-body-secondary">{{ organisation }}</span>
              <span v-if="opportunity?.type" class="badge rounded-pill fw-medium text-caption" :class="typeBadge[opportunity.type]">
                {{ opportunity.type[0].toUpperCase() + opportunity.type.slice(1) }}
              </span>
            </div>
          </div>
          <button class="btn-close align-self-start" type="button" aria-label="Close" @click="emit('close')"></button>
        </div>

        <div class="modal-body">
          <!-- when it is due, and how long is left from right now -->
          <div v-if="deadline" class="due-box rounded-3 p-3 mb-3">
            <p class="small text-body-secondary mb-1">Due</p>
            <p class="h4 mb-1">{{ formatDateTime(deadline) }}</p>
            <p class="time-left fw-semibold mb-0" :class="timeLeft === 'Deadline passed' ? 'text-danger' : 'text-warning-emphasis'">
              {{ timeLeft }}
            </p>
          </div>

          <p v-if="isLoading" class="small text-body-secondary mb-0">Loading the latest from your tracker…</p>
          <p v-else-if="missing" class="small text-body-secondary mb-0">This application is no longer in your tracker.</p>
          <p v-else-if="failed" class="small text-danger mb-0">Couldn't load the latest details. Open the Tracker to see them.</p>

          <dl v-else class="row small mb-0">
            <dt class="col-4 text-body-secondary fw-normal">Stage</dt>
            <dd class="col-8 fw-semibold">{{ getStageLabel(application.status) }}</dd>

            <template v-if="opportunity?.location">
              <dt class="col-4 text-body-secondary fw-normal">Location</dt>
              <dd class="col-8">{{ opportunity.location }}</dd>
            </template>

            <template v-if="application.interviewAt">
              <dt class="col-4 text-body-secondary fw-normal">Interview</dt>
              <dd class="col-8">{{ formatDateTime(application.interviewAt) }}</dd>
            </template>

            <template v-if="application.notes">
              <dt class="col-4 text-body-secondary fw-normal">Your notes</dt>
              <dd class="col-8 notes">{{ application.notes }}</dd>
            </template>

            <dt class="col-4 text-body-secondary fw-normal">Reminder</dt>
            <dd class="col-8 mb-0">Sent {{ timeAgo(notification.createdAt) }}, {{ reminderKind }}</dd>
          </dl>
        </div>

        <div class="modal-footer">
          <a
            v-if="opportunity?.url"
            :href="opportunity.url"
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-outline-primary fw-semibold"
          >
            View listing <i class="bi bi-box-arrow-up-right" aria-hidden="true"></i>
          </a>
          <RouterLink to="/tracker" class="btn btn-primary fw-semibold" @click="emit('close')">Open in Tracker</RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.due-box {
  background-color: var(--bs-warning-bg-subtle);
}
.notes {
  white-space: pre-line;
}
</style>
