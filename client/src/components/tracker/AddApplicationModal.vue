<script setup>
import { reactive, ref, computed, onMounted } from 'vue'
import { trackerStages, hackathonStages } from '@/constants'

const props = defineProps({
  status: { type: String, default: 'saved' }, // the column that was clicked, 'saved' from the toolbar
  kind: { type: String, default: 'job' }, // 'job' or 'event': which tab to start on (the board the form was opened from)
  isSaving: { type: Boolean, default: false },
  error: { type: String, default: '' } // shown inside the modal, the page alert is hidden behind it
})

// close = X, Cancel, Esc or clicking outside; add = (opportunity, details)
const emit = defineEmits(['close', 'add'])

// one tab for jobs, one for events; each has its own types, labels and placeholders
const tabs = {
  job: {
    label: 'Job / internship',
    icon: 'bi-briefcase',
    types: [{ value: 'job', label: 'Job' }, { value: 'internship', label: 'Internship' }],
    titleLabel: 'Role / title *',
    titlePlaceholder: 'Software Engineer Intern',
    organisationLabel: 'Organisation *',
    organisationPlaceholder: 'Stripe',
    urlPlaceholder: 'stripe.com/jobs/listing/swe-intern',
    locationPlaceholder: 'Singapore · Hybrid',
    deadlineLabel: 'Application deadline'
  },
  event: {
    label: 'Hackathon / competition',
    icon: 'bi-trophy',
    types: [{ value: 'hackathon', label: 'Hackathon' }, { value: 'competition', label: 'Competition' }],
    titleLabel: 'Event name *',
    titlePlaceholder: 'Hack&Roll 2027',
    organisationLabel: 'Organiser *',
    organisationPlaceholder: 'NUS Hackers',
    urlPlaceholder: 'hackandroll.nushackers.org',
    locationPlaceholder: 'Online or NUS UTown',
    deadlineLabel: 'Registration deadline'
  }
}

const activeTab = ref(props.kind === 'event' ? 'event' : 'job')
const tab = computed(() => tabs[activeTab.value])

// jobs and events have different steps
const stageOptions = computed(() => (activeTab.value === 'event' ? hackathonStages : trackerStages))

// switching tab picks that tab's first type, so a job tab never saves as a hackathon,
// and goes back to Saved if the chosen step doesn't exist on the other tab
function selectTab(name) {
  activeTab.value = name
  form.type = tabs[name].types[0].value
  if (!stageOptions.value.some((stage) => stage.status === form.status)) {
    form.status = 'saved'
  }
}

const form = reactive({
  type: props.kind === 'event' ? 'hackathon' : 'job',
  title: '',
  organisation: '',
  url: '',
  location: '',
  status: props.status,
  deadline: '',
  notes: ''
})

// errors only show after the first try, so an empty form does not start out red
const triedToSubmit = ref(false)
const missingTitle = computed(() => form.title.trim() === '')
const missingOrganisation = computed(() => form.organisation.trim() === '')

const stageLabel = computed(() => stageOptions.value.find((stage) => stage.status === form.status)?.label ?? 'Saved')

function submit() {
  triedToSubmit.value = true
  if (missingTitle.value || missingOrganisation.value) {
    return
  }

  // people often paste "stripe.com/jobs/..." without https://
  let url = form.url.trim()
  if (url !== '' && !/^https?:\/\//i.test(url)) {
    url = 'https://' + url
  }

  const opportunity = {
    source: 'manual',
    type: form.type,
    title: form.title.trim(),
    organisation: form.organisation.trim(),
    url: url || undefined,
    location: form.location.trim() || undefined
  }
  const details = {
    status: form.status,
    notes: form.notes.trim() || undefined,
    deadline: form.deadline ? new Date(form.deadline + 'T23:59:59').toISOString() : undefined
  }
  emit('add', opportunity, details)
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
    aria-labelledby="add-application-title"
    @click.self="$emit('close')"
    @keydown.esc="$emit('close')"
  >
    <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable application-modal">
      <form class="modal-content" novalidate @submit.prevent="submit">
        <div class="modal-header gap-3">
          <div class="modal-logo h4 mb-0 d-flex justify-content-center align-items-center bg-primary-subtle text-primary">
            <i class="bi bi-plus-lg"></i>
          </div>
          <div class="flex-grow-1">
            <h2 id="add-application-title" class="mb-0">Add application</h2>
            <span class="small text-body-secondary">Track a job, internship or event you found outside TechTrek</span>
          </div>
          <button class="btn modal-close-button text-body-secondary" type="button" aria-label="Close" @click="$emit('close')">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div class="modal-body d-flex flex-column">
          <!-- things already in Discover should be tracked from their card, which keeps the listing's details -->
          <div class="d-flex flex-wrap align-items-center gap-2 rounded-3 bg-primary-subtle px-3 py-2 small">
            <i class="bi bi-lightbulb text-body-secondary"></i>
            <span class="text-body-secondary flex-grow-1">Found it in Discover? Track it from its card instead.</span>
            <RouterLink to="/opportunities" class="fw-semibold text-decoration-none">Go to Discover →</RouterLink>
          </div>

          <div v-if="error" class="alert alert-danger py-2 mb-0" role="alert">{{ error }}</div>

          <nav class="nav nav-underline column-gap-4 border-bottom" role="tablist" aria-label="What are you adding?">
            <button
              v-for="(tabInfo, name) in tabs"
              :key="name"
              type="button"
              role="tab"
              class="nav-link d-flex align-items-center gap-2 fw-semibold py-2"
              :class="{ active: activeTab === name }"
              :aria-selected="activeTab === name"
              @click="selectTab(name)"
            >
              <i class="bi" :class="tabInfo.icon"></i> {{ tabInfo.label }}
            </button>
          </nav>

          <div>
            <span id="add-type-label" class="form-label d-block small fw-semibold mb-1">Type *</span>
            <div class="d-flex flex-wrap gap-2" role="group" aria-labelledby="add-type-label">
              <button
                v-for="option in tab.types"
                :key="option.value"
                type="button"
                class="btn btn-sm rounded-pill px-3"
                :class="form.type === option.value ? 'bg-primary-subtle border-primary text-primary-emphasis' : 'bg-white border'"
                :aria-pressed="form.type === option.value"
                @click="form.type = option.value"
              >
                {{ option.label }}
              </button>
            </div>
          </div>

          <div class="row g-3">
            <div class="col-sm-6">
              <label for="add-title" class="form-label small fw-semibold mb-1">{{ tab.titleLabel }}</label>
              <input
                id="add-title"
                v-model="form.title"
                type="text"
                class="form-control field-lg"
                :class="{ 'is-invalid': triedToSubmit && missingTitle }"
                :placeholder="tab.titlePlaceholder"
                maxlength="200"
                required
              >
              <div class="invalid-feedback">Add {{ activeTab === 'job' ? 'a title' : 'the event name' }}.</div>
            </div>
            <div class="col-sm-6">
              <label for="add-organisation" class="form-label small fw-semibold mb-1">{{ tab.organisationLabel }}</label>
              <input
                id="add-organisation"
                v-model="form.organisation"
                type="text"
                class="form-control field-lg"
                :class="{ 'is-invalid': triedToSubmit && missingOrganisation }"
                :placeholder="tab.organisationPlaceholder"
                maxlength="200"
                required
              >
              <div class="invalid-feedback">Add the {{ activeTab === 'job' ? 'organisation' : 'organiser' }}.</div>
            </div>
            <div class="col-sm-6">
              <label for="add-url" class="form-label small fw-semibold mb-1">Link to listing</label>
              <input id="add-url" v-model="form.url" type="text" inputmode="url" class="form-control field-lg" :placeholder="tab.urlPlaceholder">
            </div>
            <div class="col-sm-6">
              <label for="add-location" class="form-label small fw-semibold mb-1">Location</label>
              <input id="add-location" v-model="form.location" type="text" class="form-control field-lg" :placeholder="tab.locationPlaceholder" maxlength="200">
            </div>
          </div>

          <hr class="my-0 border-secondary-subtle opacity-100">

          <span class="text-overline text-uppercase text-body-tertiary">Tracking</span>

          <div>
            <div class="row g-3">
              <div class="col-sm-6">
                <label for="add-stage" class="form-label small fw-semibold mb-1">Stage</label>
                <select
                  id="add-stage"
                  v-model="form.status"
                  class="form-select field-lg"
                  :style="{ color: `var(--tt-status-${form.status})` }"
                >
                  <option v-for="stage in stageOptions" :key="stage.status" :value="stage.status">●&nbsp;&nbsp;{{ stage.label }}</option>
                </select>
              </div>
              <div class="col-sm-6">
                <label for="add-deadline" class="form-label small fw-semibold mb-1">{{ tab.deadlineLabel }}</label>
                <input id="add-deadline" v-model="form.deadline" type="date" class="form-control field-lg">
              </div>
            </div>
            <p class="text-caption text-body-tertiary mt-2 mb-0">Starts in the column you clicked; the toolbar button starts in Saved.</p>
          </div>

          <div>
            <label for="add-notes" class="form-label small fw-semibold mb-1">Notes</label>
            <div class="notes-field">
              <textarea
                id="add-notes"
                v-model="form.notes"
                class="form-control border-0 shadow-none p-0"
                rows="3"
                maxlength="2000"
                placeholder="Referral, who you spoke to, what to prepare…"
              ></textarea>
            </div>
          </div>
        </div>

        <div class="modal-footer bg-body-secondary">
          <span class="text-caption text-body-tertiary me-auto">* required</span>
          <button class="btn btn-outline-primary fw-semibold btn-cta" type="button" @click="$emit('close')">Cancel</button>
          <button class="btn btn-primary fw-semibold btn-cta" type="submit" :disabled="isSaving">
            {{ isSaving ? 'Adding…' : 'Add to ' + stageLabel }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
