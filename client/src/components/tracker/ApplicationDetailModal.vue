<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { formatDate, toDateTimeInputValue } from '@/utils/date'
import { typeBadge, trackerStages } from '@/constants'
import { getApplicationDeadline } from '@/utils/application'

const props = defineProps({
  application: { type: Object, required: true } // one item from GET /application (opportunityId is populated)
})

// close = X, Cancel, Esc or clicking outside; save = (changes); delete = Delete button
const emit = defineEmits(['close', 'save', 'delete'])

const opportunity = computed(() => props.application.opportunityId)

// the form edits a copy, so Cancel leaves the card unchanged
const form = reactive({
  status: props.application.status,
  notes: props.application.notes ?? '',
  interviewAt: toDateTimeInputValue(props.application.interviewAt),
  // same deadline the card shows: the application's own, else the listing's
  deadline: toDateTimeInputValue(getApplicationDeadline(props.application)).slice(0, 10)
})

// TODO: no checklist field in the Application model yet, so ticks are not saved
const checklist = ref([
  { label: 'Tailor resume to the JD', done: false },
  { label: 'Research ' + opportunity.value.organisation, done: false },
  { label: 'Practise 5 technical questions', done: false }
])

const doneCount = computed(() => checklist.value.filter((item) => item.done).length)

// no status history is stored, so the timeline is: saved (createdAt) -> current stage (updatedAt)
const activity = computed(() => {
  const steps = [{ status: 'saved', label: 'Saved', date: props.application.createdAt }]
  if (props.application.status !== 'saved') {
    const stage = trackerStages.find((item) => item.status === props.application.status)
    steps.push({ status: stage.status, label: stage.label, date: props.application.updatedAt })
  }
  return steps
})

function save() {
  emit('save', {
    status: form.status,
    notes: form.notes,
    // empty input = clear the date
    interviewAt: form.interviewAt ? new Date(form.interviewAt).toISOString() : null,
    deadline: form.deadline ? new Date(form.deadline + 'T23:59:59').toISOString() : null
  })
}

// focus the dialog so Esc works straight away
const dialog = ref(null)
onMounted(() => dialog.value.focus())
</script>

<template>
  <div class="modal-backdrop fade show"></div>

  <div
    ref="dialog"
    class="modal d-block"
    tabindex="-1"
    role="dialog"
    aria-modal="true"
    aria-labelledby="application-modal-title"
    @click.self="$emit('close')"
    @keydown.esc="$emit('close')"
  >
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable application-modal">
      <div class="modal-content">
        <!-- logo, title, organisation + location, type, close -->
        <div class="modal-header gap-3">
          <div class="modal-logo h4 mb-0 d-flex justify-content-center align-items-center" :class="typeBadge[opportunity.type]">
            {{ opportunity.organisation.slice(0, 2).toUpperCase() }}
          </div>
          <div class="flex-grow-1">
            <h2 id="application-modal-title" class="mb-0">{{ opportunity.title }}</h2>
            <div class="d-flex flex-wrap align-items-center gap-2">
              <span class="small text-body-secondary">
                {{ opportunity.organisation }}<template v-if="opportunity.location"> · {{ opportunity.location }}</template>
              </span>
              <span class="badge rounded-pill fw-medium text-caption" :class="typeBadge[opportunity.type]">
                {{ opportunity.type[0].toUpperCase() + opportunity.type.slice(1) }}
              </span>
            </div>
          </div>
          <button class="btn modal-close-button text-body-secondary" type="button" aria-label="Close" @click="$emit('close')">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div class="modal-body d-flex flex-column">
          <!-- stage + the date that matters for that stage -->
          <div class="row g-3">
            <div class="col-sm-6">
              <label for="application-stage" class="form-label small fw-semibold mb-1">Stage</label>
              <select
                id="application-stage"
                v-model="form.status"
                class="form-select field-lg"
                :style="{ color: `var(--tt-status-${form.status})` }"
              >
                <option v-for="stage in trackerStages" :key="stage.status" :value="stage.status">●&nbsp;&nbsp;{{ stage.label }}</option>
              </select>
            </div>
            <div v-if="form.status === 'interview'" class="col-sm-6">
              <label for="application-interview" class="form-label small fw-semibold mb-1">Interview date</label>
              <input id="application-interview" v-model="form.interviewAt" type="datetime-local" class="form-control field-lg">
            </div>
            <div v-else class="col-sm-6">
              <label for="application-deadline" class="form-label small fw-semibold mb-1">Deadline</label>
              <input id="application-deadline" v-model="form.deadline" type="date" class="form-control field-lg">
            </div>
          </div>

          <div v-if="opportunity.url">
            <span class="form-label d-block small fw-semibold mb-1">Application link</span>
            <a
              :href="opportunity.url"
              target="_blank"
              class="form-control field-lg d-flex align-items-center gap-2 text-decoration-none link-primary"
            >
              <i class="bi bi-box-arrow-up-right text-body-secondary"></i>
              <span class="text-truncate">{{ opportunity.url }}</span>
            </a>
          </div>

          <!-- the border is on the wrapper so the "last updated" line sits inside the box -->
          <div>
            <label for="application-notes" class="form-label small fw-semibold mb-1">Notes</label>
            <div class="notes-field">
              <textarea
                id="application-notes"
                v-model="form.notes"
                class="form-control border-0 shadow-none p-0"
                rows="2"
                placeholder="Interview format, who you spoke to, things to prepare…"
              ></textarea>
              <span class="text-caption text-body-tertiary">Last updated {{ formatDate(application.updatedAt) }}</span>
            </div>
          </div>

          <div>
            <div class="d-flex align-items-center mb-2">
              <span class="small fw-semibold flex-grow-1">Prep checklist</span>
              <span class="text-caption text-body-tertiary">{{ doneCount }} of {{ checklist.length }} done</span>
            </div>
            <div v-for="(item, index) in checklist" :key="item.label" class="form-check d-flex align-items-center gap-2" :class="{ 'mb-2': index < checklist.length - 1 }">
              <input :id="'checklist-' + index" v-model="item.done" class="form-check-input mt-0" type="checkbox">
              <label :for="'checklist-' + index" class="form-check-label">{{ item.label }}</label>
              <RouterLink
                v-if="index === checklist.length - 1"
                to="/interview"
                class="small fw-semibold text-decoration-none ms-1"
              >
                Open Interview Prep →
              </RouterLink>
            </div>
          </div>

          <div>
            <span class="d-block small fw-semibold mb-2">Activity</span>
            <div class="d-flex flex-wrap align-items-center gap-2">
              <template v-for="(step, index) in activity" :key="step.status">
                <i v-if="index > 0" class="bi bi-arrow-right icon-14 text-body-tertiary"></i>
                <span class="activity-step d-inline-flex align-items-center gap-2 rounded-pill bg-body-secondary text-caption">
                  <span class="status-dot status-dot-sm" :style="{ backgroundColor: `var(--tt-status-${step.status})` }"></span>
                  {{ step.label }}
                  <span class="text-body-tertiary">{{ formatDate(step.date) }}</span>
                </span>
              </template>
            </div>
          </div>
        </div>

        <div class="modal-footer bg-body-secondary">
          <button class="btn btn-link text-danger-emphasis fw-semibold text-decoration-none px-0 px-sm-3 me-auto" type="button" @click="$emit('delete')">
            Delete
          </button>
          <button class="btn btn-outline-primary fw-semibold btn-cta" type="button" @click="$emit('close')">Cancel</button>
          <button class="btn btn-primary fw-semibold btn-cta" type="button" @click="save">Save changes</button>
        </div>
      </div>
    </div>
  </div>
</template>
