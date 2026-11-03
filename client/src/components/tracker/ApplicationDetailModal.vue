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

// ── prep checklist: tick, add, rename and delete steps; saved with "Save changes" like the rest of the form

// id is only for v-for and editing here, it is not sent to the server
let nextId = 0
function makeItem(label, done = false) {
  return { id: nextId++, label, done }
}

// the saved steps, or the default steps for an application whose checklist was never saved
// (an emptied checklist is [] and stays empty)
const checklist = ref(
  props.application.checklist != null
    ? props.application.checklist.map((item) => makeItem(item.label, item.done))
    : []
)

const doneCount = computed(() => checklist.value.filter((item) => item.done).length)

const MAX_LABEL_LENGTH = 200 // same limit as the server

const newStep = ref('')
function addStep() {
  const label = newStep.value.trim()
  if (label === '') {
    return
  }
  checklist.value.push(makeItem(label))
  newStep.value = ''
}

// the step being renamed (null = none) and the text in its box
const editingId = ref(null)
const editingLabel = ref('')

function startEditing(item) {
  editingId.value = item.id
  editingLabel.value = item.label
}

// Enter or leaving the box keeps the new name; an empty name keeps the old one
function finishEditing(item) {
  if (editingId.value !== item.id) {
    return // already finished by Enter, this is the blur that follows
  }
  const label = editingLabel.value.trim()
  if (label !== '') {
    item.label = label
  }
  editingId.value = null
}

function cancelEditing() {
  editingId.value = null
}

function deleteStep(item) {
  checklist.value = checklist.value.filter((step) => step.id !== item.id)
}

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
    checklist: checklist.value.map((item) => ({ label: item.label, done: item.done })),
    interviewAt: form.interviewAt ? new Date(form.interviewAt).toISOString() : null,
    deadline: form.deadline ? new Date(form.deadline + 'T23:59:59').toISOString() : null
  })
}

// v-focus: puts the cursor in the rename box as soon as it appears
const vFocus = { mounted: (el) => el.focus() }

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
              <span v-if="checklist.length > 0" class="text-caption text-body-tertiary">{{ doneCount }} of {{ checklist.length }} done</span>
            </div>

            <p v-if="checklist.length === 0" class="small text-body-tertiary mb-2">No steps yet. Add one below.</p>

            <div v-for="item in checklist" :key="item.id" class="checklist-row form-check d-flex align-items-center gap-2 mb-2">
              <input :id="'checklist-' + item.id" v-model="item.done" class="form-check-input mt-0 flex-shrink-0" type="checkbox">

              <!-- renaming: Enter or clicking away keeps it, Esc cancels (without closing the modal) -->
              <input
                v-if="editingId === item.id"
                v-model="editingLabel"
                v-focus
                class="form-control form-control-sm flex-grow-1"
                :maxlength="MAX_LABEL_LENGTH"
                :aria-label="'Rename ' + item.label"
                @keydown.enter.prevent="finishEditing(item)"
                @keydown.esc.stop="cancelEditing"
                @blur="finishEditing(item)"
              >
              <label v-else :for="'checklist-' + item.id" class="form-check-label flex-grow-1">
                {{ item.label }}
              </label>

              <template v-if="editingId !== item.id">
                <button class="btn btn-sm btn-link text-body-tertiary p-1 checklist-action" type="button" :aria-label="'Rename ' + item.label" @click="startEditing(item)">
                  <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-link text-body-tertiary p-1 checklist-action" type="button" :aria-label="'Delete ' + item.label" @click="deleteStep(item)">
                  <i class="bi bi-trash3"></i>
                </button>
              </template>
            </div>

            <!-- Esc only clears the box here, it does not close the modal -->
            <form class="d-flex gap-2 mt-1" @submit.prevent="addStep">
              <input
                v-model="newStep"
                class="form-control form-control-sm"
                placeholder="Add a step, e.g. Ask Sam for a referral"
                :maxlength="MAX_LABEL_LENGTH"
                aria-label="New checklist step"
                @keydown.esc.stop="newStep = ''"
              >
              <button class="btn btn-sm btn-outline-primary fw-semibold text-nowrap" type="submit" :disabled="newStep.trim() === ''">
                <i class="bi bi-plus-lg"></i> Add
              </button>
            </form>

            <RouterLink to="/interview" class="d-inline-block small fw-semibold text-decoration-none mt-2">
              Open Interview Prep →
            </RouterLink>
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
