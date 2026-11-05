<script setup>
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useOpportunityStore } from '@/store/opportunity'
import { useApplicationsStore } from '@/store/applications'
import { formatDate, toDateTimeInputValue } from '@/utils/date'

// Pops up right after a job or internship is tracked: Adzuna listings come without a closing date,
// so we ask for one. It goes on the tracked application, so it shows on the Tracker board,
// the calendar and "due this week".
const store = useOpportunityStore()
const { deadlinePrompt } = storeToRefs(store)
const applicationStore = useApplicationsStore()

// "yyyy-mm-dd" for a day `days` from today (in Singapore time, like the date picker)
function dayFromToday(days) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return toDateTimeInputValue(date.toISOString()).slice(0, 10)
}

const QUICK_PICKS = [
  { label: 'In 1 week', days: 7 },
  { label: 'In 2 weeks', days: 14 },
  { label: 'In 1 month', days: 30 }
]

const picked = ref('') // the chosen day, "yyyy-mm-dd"
const saving = ref(false)
const today = computed(() => dayFromToday(0))

// a new prompt starts on "in 2 weeks", a common closing window for listings
watch(
  deadlinePrompt,
  (prompt) => {
    if (prompt) {
      picked.value = dayFromToday(14)
      saving.value = false
    }
  },
  { immediate: true }
)

async function save() {
  if (!picked.value) return
  saving.value = true
  // the end of the chosen day, the same way the Tracker saves deadlines
  const updated = await store.saveDeadline(new Date(picked.value + 'T23:59:59').toISOString())
  saving.value = false
  if (!updated) return
  // keep the Tracker's copy (Home's stat cards and calendar read it) up to date without reloading
  const index = applicationStore.applications.findIndex((application) => application._id === updated._id)
  if (index !== -1) applicationStore.applications[index] = updated
}
</script>

<template>
  <div v-if="deadlinePrompt" class="deadline-prompt card shadow-lg p-3" role="dialog" aria-labelledby="deadline-title" aria-describedby="deadline-text">
    <div class="d-flex align-items-start gap-3 mb-3">
      <span class="prompt-icon rounded-3 d-flex align-items-center justify-content-center flex-shrink-0" aria-hidden="true">
        <i class="bi bi-calendar-plus"></i>
      </span>
      <div class="flex-grow-1 min-w-0">
        <p id="deadline-title" class="fw-semibold mb-0">When do applications close?</p>
        <p id="deadline-text" class="small text-body-secondary mb-0">
          <span class="fw-medium text-body">{{ deadlinePrompt.item.title }}</span>
          <template v-if="deadlinePrompt.item.organisation"> · {{ deadlinePrompt.item.organisation }}</template>
          is tracked. Adzuna doesn't list closing dates, so add one to get it on your calendar.
        </p>
      </div>
      <button type="button" class="btn-close flex-shrink-0" aria-label="Skip adding a deadline" @click="store.skipDeadline()"></button>
    </div>

    <div class="d-flex flex-wrap gap-2 mb-2" role="group" aria-label="Quick picks">
      <button
        v-for="option in QUICK_PICKS"
        :key="option.days"
        type="button"
        class="btn btn-sm rounded-pill"
        :class="picked === dayFromToday(option.days) ? 'bg-primary-subtle border border-primary text-primary-emphasis fw-semibold' : 'bg-white border'"
        :aria-pressed="picked === dayFromToday(option.days)"
        @click="picked = dayFromToday(option.days)"
      >
        {{ option.label }}
      </button>
    </div>

    <div class="d-flex flex-wrap align-items-center gap-2">
      <label for="deadline-date" class="visually-hidden">Closing date</label>
      <input id="deadline-date" v-model="picked" type="date" class="form-control form-control-sm w-auto" :min="today" />
      <span v-if="picked" class="text-caption text-body-secondary">Closes {{ formatDate(picked + 'T23:59:59') }}</span>
      <div class="d-flex gap-2 ms-auto">
        <button type="button" class="btn btn-sm btn-link fw-semibold text-decoration-none" @click="store.skipDeadline()">Skip</button>
        <button type="button" class="btn btn-sm btn-primary fw-semibold" :disabled="!picked || saving" @click="save">
          {{ saving ? 'Saving...' : 'Add deadline' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.deadline-prompt {
  position: fixed;
  left: 50%;
  bottom: 24px;
  z-index: 1070;
  width: min(460px, calc(100vw - 32px));
  border-radius: 16px;
  transform: translateX(-50%);
  animation: prompt-in 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.2);
}

/* above the phone tab bar */
@media (max-width: 767.98px) {
  .deadline-prompt {
    bottom: 96px;
  }
}

.prompt-icon {
  width: 40px;
  height: 40px;
  font-size: 18px;
  color: var(--bs-primary);
  background-color: var(--bs-primary-bg-subtle);
}

@keyframes prompt-in {
  from { opacity: 0; transform: translate(-50%, 20px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}

@media (prefers-reduced-motion: reduce) {
  .deadline-prompt {
    animation: none;
  }
}
</style>
