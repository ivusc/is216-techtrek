<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { formatDate, toDateTimeInputValue } from '@/utils/date'
import { typeBadge, hackathonResults, reviewDifficulties } from '@/constants'
import { getApplicationDeadline, stagesFor } from '@/utils/application'

const props = defineProps({
  application: { type: Object, required: true }, // one item from GET /application (opportunityId is populated)
  tipsJustSaved: { type: Boolean, default: false } // reopened after sharing or editing tips: scroll to them
})

// close = X, Cancel, Esc or clicking outside; save = (changes); delete = Delete button
const emit = defineEmits(['close', 'save', 'delete', 'share-tips', 'delete-tips'])

const opportunity = computed(() => props.application.opportunityId)

// my interview tips for this offer, shown so I can check, edit or take them down
const review = computed(() => props.application.review ?? null)
const reviewDifficulty = computed(() =>
  review.value ? reviewDifficulties.find((option) => option.value === review.value.difficulty)?.label ?? '' : ''
)
const confirmingTipsDelete = ref(false)
const tipsCard = ref(null)
onMounted(() => {
  if (props.tipsJustSaved) tipsCard.value?.scrollIntoView?.({ block: 'center' })
})
function deleteTips() {
  confirmingTipsDelete.value = false
  emit('delete-tips')
}

// a job's steps or a hackathon's steps, never both
const stageOptions = computed(() => stagesFor(opportunity.value.type))

// the form edits a copy, so Cancel leaves the card unchanged
const form = reactive({
  status: props.application.status,
  result: props.application.result ?? '',
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
    const stage = stageOptions.value.find((item) => item.status === props.application.status)
    if (stage) steps.push({ status: stage.status, label: stage.label, date: props.application.updatedAt })
  }
  return steps
})

function save() {
  emit('save', {
    status: form.status,
    // only a finished hackathon has a result
    result: form.status === 'results' && form.result ? form.result : null,
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
                <option v-for="stage in stageOptions" :key="stage.status" :value="stage.status">●&nbsp;&nbsp;{{ stage.label }}</option>
              </select>
            </div>
            <!-- a finished hackathon: how did it go? -->
            <div v-if="form.status === 'results'" class="col-sm-6">
              <label for="application-result" class="form-label small fw-semibold mb-1">How did it go?</label>
              <select id="application-result" v-model="form.result" class="form-select field-lg">
                <option value="">Not decided yet</option>
                <option v-for="option in hackathonResults" :key="option.value" :value="option.value">{{ option.label }}</option>
              </select>
            </div>
            <div v-if="form.status === 'interview'" class="col-sm-6">
              <label for="application-interview" class="form-label small fw-semibold mb-1">Interview date</label>
              <input id="application-interview" v-model="form.interviewAt" type="datetime-local" class="form-control field-lg">
            </div>
            <div v-else-if="form.status !== 'results'" class="col-sm-6">
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

          <!-- tips I shared: shown in full, with Edit and Delete -->
          <section v-if="review" ref="tipsCard" class="tips-card rounded-3 p-3" :class="{ 'just-saved': tipsJustSaved }" aria-labelledby="my-tips-title">
            <div class="d-flex flex-wrap align-items-center gap-2 mb-2">
              <i class="bi bi-chat-quote-fill text-primary" aria-hidden="true"></i>
              <h3 id="my-tips-title" class="h6 fw-semibold mb-0">Your interview tips</h3>
              <span v-if="tipsJustSaved" class="tips-saved small fw-semibold text-success" role="status">
                <i class="bi bi-check-circle-fill" aria-hidden="true"></i> Tips saved
              </span>
              <span class="badge rounded-pill bg-white border text-body-secondary fw-medium ms-auto">
                <i class="bi bi-incognito" aria-hidden="true"></i> Posted anonymously
              </span>
            </div>

            <span class="badge rounded-pill bg-info-subtle text-primary fw-medium mb-2">
              Difficulty {{ review.difficulty }}/5 · {{ reviewDifficulty }}
            </span>
            <p v-if="review.rounds" class="small text-body-secondary mb-1">
              <span class="fw-semibold">Rounds:</span> {{ review.rounds }}
            </p>
            <p class="tips-text mb-2">{{ review.tips }}</p>
            <p class="text-caption text-body-tertiary mb-3">
              Shared on {{ formatDate(review.createdAt) }}<template v-if="review.updatedAt"> · Edited {{ formatDate(review.updatedAt) }}</template>
              · Students preparing for this role see it in Interview Prep
            </p>

            <div v-if="confirmingTipsDelete" class="d-flex flex-wrap align-items-center gap-2 rounded-3 bg-white border px-3 py-2" role="alert">
              <span class="small flex-grow-1">Take your tips down? Other students won't see them anymore.</span>
              <button class="btn btn-sm btn-light fw-semibold" type="button" @click="confirmingTipsDelete = false">Keep them</button>
              <button class="btn btn-sm btn-danger fw-semibold" type="button" @click="deleteTips">Delete tips</button>
            </div>
            <div v-else class="d-flex flex-wrap gap-2">
              <button class="btn btn-sm btn-primary fw-semibold" type="button" @click="$emit('share-tips')">
                <i class="bi bi-pencil" aria-hidden="true"></i> Edit tips
              </button>
              <button class="btn btn-sm btn-outline-danger fw-semibold" type="button" @click="confirmingTipsDelete = true">
                <i class="bi bi-trash" aria-hidden="true"></i> Delete
              </button>
            </div>
          </section>

          <div v-else-if="application.status === 'offer'" class="d-flex flex-wrap align-items-center gap-2 rounded-3 bg-warning-subtle px-3 py-2 small">
            <i class="bi bi-chat-left-text text-body-secondary" aria-hidden="true"></i>
            <span class="text-body-secondary flex-grow-1">Got the offer? Help the next SMU student.</span>
            <button class="btn btn-sm btn-primary fw-semibold" type="button" @click="$emit('share-tips')">Share your interview tips</button>
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

<style scoped>
.tips-card {
  background-color: var(--bs-primary-bg-subtle);
  border: 1px solid var(--bs-primary-border-subtle);
}
/* right after saving, the card glows twice so it's clear the new tips are in */
.tips-card.just-saved {
  animation: card-glow 1.2s ease-out 0.2s 2;
}
@keyframes card-glow {
  0% { box-shadow: 0 0 0 0 rgba(85, 64, 191, 0.45); }
  100% { box-shadow: 0 0 0 12px rgba(85, 64, 191, 0); }
}
.tips-saved {
  animation: saved-pop 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.4);
}
@keyframes saved-pop {
  from { opacity: 0; transform: scale(0.9); }
}
@media (prefers-reduced-motion: reduce) {
  /* right after saving, the card glows twice so it's clear the new tips are in */
.tips-card.just-saved {
  animation: card-glow 1.2s ease-out 0.2s 2;
}
@keyframes card-glow {
  0% { box-shadow: 0 0 0 0 rgba(85, 64, 191, 0.45); }
  100% { box-shadow: 0 0 0 12px rgba(85, 64, 191, 0); }
}
.tips-saved { animation: none; }
}
.tips-text {
  white-space: pre-line;
  overflow-wrap: anywhere;
}
</style>
