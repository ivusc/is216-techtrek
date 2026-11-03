<script setup>
import { ref, computed, onMounted } from 'vue'
import './profile.css'
import PageHeader from '@/components/PageHeader.vue'
import TeamModal from '@/components/teams/TeamModal.vue'
import { useUserStore } from '@/store/user'
import { fetchProfile } from '@/services/teamService'
import {
  faculties,
  popularSkills,
  skillLevelOptions,
  careerRoles,
  opportunityTypeOptions,
  workTypeOptions,
} from '@/constants'
import { getInitials, sameSkill } from '@/utils/team'

const auth = useUserStore()
const MAX_SKILLS = 12

// ---------- left column ----------

const name = computed(() => auth.displayName || (auth.username ?? '').split('@')[0])

// "Year 1 · School of Computing and Information Systems · SMU"
const schoolLine = computed(() => {
  const parts = []
  if (auth.year) parts.push('Year ' + auth.year)
  if (auth.faculty) parts.push(faculties.find((option) => option.code === auth.faculty)?.name ?? auth.faculty)
  parts.push('SMU')
  return parts.join(' · ')
})

// "https://github.com/kelliej" -> "github.com/kelliej"
function shortLink(link) {
  return link.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
}

// "Show me in Teammate Finder" saves as soon as it is switched
const isSavingToggle = ref(false)
async function toggleOpenToTeams() {
  isSavingToggle.value = true
  try {
    await auth.updateProfile({ openToTeams: !auth.openToTeams })
  } catch (error) {
    console.error(error)
    errorMessage.value = 'Could not update Teammate Finder. Please try again.'
  }
  isSavingToggle.value = false
}

// ---------- "Edit profile" pop-up: name, year, school, links (saved straight away) ----------

const showDetails = ref(false)
const details = ref({})
const detailsError = ref('')
const isSavingDetails = ref(false)

function openDetails() {
  details.value = {
    displayName: auth.displayName ?? '',
    year: auth.year ?? '',
    faculty: auth.faculty ?? '',
    linkedinUrl: auth.linkedinUrl ?? '',
    githubUrl: auth.githubUrl ?? '',
  }
  detailsError.value = ''
  showDetails.value = true
}

async function saveDetails() {
  detailsError.value = ''
  if (details.value.displayName.trim() === '') {
    detailsError.value = 'Please enter your name.'
    return
  }
  isSavingDetails.value = true
  try {
    await auth.updateProfile({
      displayName: details.value.displayName.trim(),
      year: details.value.year === '' ? null : Number(details.value.year),
      faculty: details.value.faculty,
      linkedinUrl: details.value.linkedinUrl.trim(),
      githubUrl: details.value.githubUrl.trim(),
    })
    showDetails.value = false
    showSaved()
  } catch (error) {
    console.error(error)
    detailsError.value = error.response?.data?.error ?? 'Could not save. Please try again.'
  }
  isSavingDetails.value = false
}

// ---------- right column: about, skills, career interests (Save changes / Discard) ----------

// the form works on a copy; "saved" is what is on the server, so Discard can go back to it
const saved = ref(null)
const draft = ref(null)

function copy(value) {
  return JSON.parse(JSON.stringify(value))
}

function snapshotFromStore(skills) {
  return {
    bio: auth.bio ?? '',
    skills: [...skills],
    skillLevels: { ...auth.skillLevels },
    careerInterests: copy(auth.careerInterests),
  }
}

onMounted(async () => {
  saved.value = snapshotFromStore(auth.skills ?? [])
  draft.value = copy(saved.value)
  // skills can also change on the Teams page, so read them fresh from the server
  try {
    const profile = await fetchProfile(auth._id)
    saved.value.skills = profile.skills ?? []
    draft.value.skills = [...saved.value.skills]
  } catch (error) {
    console.error(error)
  }
})

const hasChanges = computed(() => draft.value !== null && JSON.stringify(draft.value) !== JSON.stringify(saved.value))

const isSaving = ref(false)
const errorMessage = ref('')
const savedMessage = ref('')

function showSaved() {
  savedMessage.value = 'Your profile has been saved.'
  setTimeout(() => (savedMessage.value = ''), 4000)
}

async function saveChanges() {
  errorMessage.value = ''
  isSaving.value = true
  try {
    await auth.updateProfile({
      bio: draft.value.bio,
      skills: draft.value.skills,
      skillLevels: draft.value.skillLevels,
      careerInterests: draft.value.careerInterests,
    })
    saved.value = snapshotFromStore(auth.skills)
    draft.value = copy(saved.value)
    showSaved()
  } catch (error) {
    console.error(error)
    errorMessage.value = error.response?.data?.error ?? 'Could not save your profile. Please try again.'
  }
  isSaving.value = false
}

function discardChanges() {
  draft.value = copy(saved.value)
  errorMessage.value = ''
}

// skills

const isAddingSkill = ref(false)
const newSkill = ref('')

function levelOf(skill) {
  return draft.value.skillLevels[skill] ?? 'Beginner'
}

function setLevel(skill, level) {
  draft.value.skillLevels = { ...draft.value.skillLevels, [skill]: level }
}

function addSkill() {
  const skill = newSkill.value.trim()
  newSkill.value = ''
  if (skill === '' || draft.value.skills.some((existing) => sameSkill(existing, skill))) return
  if (draft.value.skills.length >= MAX_SKILLS) {
    errorMessage.value = 'You can add up to ' + MAX_SKILLS + ' skills.'
    return
  }
  draft.value.skills = [...draft.value.skills, skill]
  setLevel(skill, 'Beginner')
}

function removeSkill(skill) {
  draft.value.skills = draft.value.skills.filter((existing) => existing !== skill)
  const levels = { ...draft.value.skillLevels }
  delete levels[skill]
  draft.value.skillLevels = levels
}

// career interests

function toggleRole(role) {
  const roles = draft.value.careerInterests.roles
  draft.value.careerInterests.roles = roles.includes(role) ? roles.filter((r) => r !== role) : [...roles, role]
}

// the next 18 months, e.g. { value: '2027-05', label: 'May 2027' }
const monthOptions = []
const today = new Date()
for (let i = 0; i < 18; i++) {
  const date = new Date(today.getFullYear(), today.getMonth() + i, 1)
  monthOptions.push({
    value: date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0'),
    label: date.toLocaleDateString('en-SG', { month: 'long', year: 'numeric' }),
  })
}
</script>

<template>
  <div class="profile-page">
    <PageHeader title="Your profile" subtitle="How you appear to teams, and what we use to recommend opportunities." />

    <div v-if="savedMessage" class="alert alert-success d-flex align-items-center gap-2" role="status">
      <i class="bi bi-check-circle-fill"></i>{{ savedMessage }}
    </div>

    <div v-if="draft" class="row g-4">
      <!-- left column -->
      <div class="col-12 col-lg-4 d-flex flex-column gap-4">
        <div class="card overflow-hidden">
          <div class="profile-banner bg-primary position-relative overflow-hidden">
            <span class="banner-circle circle-peach rounded-circle"></span>
            <span class="banner-circle circle-coral rounded-circle"></span>
            <span class="banner-circle circle-teal rounded-circle"></span>
          </div>
          <div class="text-center px-4 pb-4">
            <span class="profile-page-avatar rounded-circle bg-tt-peach d-inline-flex align-items-center justify-content-center fw-bold">
              {{ getInitials(name) }}
            </span>
            <h2 class="profile-name fw-bold mt-2 mb-1">{{ name }}</h2>
            <p class="profile-detail text-body-secondary mb-1">{{ schoolLine }}</p>
            <p class="profile-email text-body-tertiary mb-2 text-break">{{ auth.username }}</p>
            <span
              class="badge rounded-pill fw-medium d-inline-flex align-items-center gap-1 mb-3 profile-status"
              :class="auth.openToTeams ? 'bg-info-subtle text-primary-emphasis' : 'bg-body-secondary text-body-secondary'"
            >
              <span class="profile-status-dot rounded-circle" :class="auth.openToTeams ? 'bg-primary' : 'bg-secondary'"></span>
              {{ auth.openToTeams ? 'Open to teams' : 'Not looking for a team' }}
            </span>
            <button class="btn btn-outline-primary fw-semibold w-100" type="button" @click="openDetails">
              <i class="bi bi-pencil me-1"></i> Edit profile
            </button>
          </div>
        </div>

        <div class="card profile-card">
          <h3 class="profile-section-title mb-3">Links</h3>
          <div class="d-flex flex-column gap-2">
            <a
              v-if="auth.githubUrl"
              :href="auth.githubUrl"
              target="_blank"
              rel="noopener"
              class="profile-link-row d-flex align-items-center gap-3 rounded-3 text-decoration-none text-body"
            >
              <span class="profile-link-icon rounded-2 bg-white d-flex align-items-center justify-content-center"><i class="bi bi-github"></i></span>
              <span class="flex-grow-1 min-w-0">
                <span class="d-block fw-semibold text-truncate">{{ shortLink(auth.githubUrl) }}</span>
                <span class="d-block profile-small text-body-secondary">GitHub</span>
              </span>
              <i class="bi bi-box-arrow-up-right text-body-secondary"></i>
            </a>
            <button v-else type="button" class="profile-link-row d-flex align-items-center gap-3 rounded-3 border-0 text-start w-100" @click="openDetails">
              <span class="profile-link-icon rounded-2 bg-white d-flex align-items-center justify-content-center"><i class="bi bi-github"></i></span>
              <span class="flex-grow-1">
                <span class="d-block fw-semibold">Add your GitHub</span>
                <span class="d-block profile-small text-body-secondary">Show teams your projects</span>
              </span>
              <i class="bi bi-plus-lg text-body-secondary"></i>
            </button>

            <a
              v-if="auth.linkedinUrl"
              :href="auth.linkedinUrl"
              target="_blank"
              rel="noopener"
              class="profile-link-row d-flex align-items-center gap-3 rounded-3 text-decoration-none text-body"
            >
              <span class="profile-link-icon rounded-2 bg-white d-flex align-items-center justify-content-center"><i class="bi bi-linkedin"></i></span>
              <span class="flex-grow-1 min-w-0">
                <span class="d-block fw-semibold text-truncate">{{ shortLink(auth.linkedinUrl) }}</span>
                <span class="d-block profile-small text-body-secondary">LinkedIn</span>
              </span>
              <i class="bi bi-box-arrow-up-right text-body-secondary"></i>
            </a>
            <button v-else type="button" class="profile-link-row d-flex align-items-center gap-3 rounded-3 border-0 text-start w-100" @click="openDetails">
              <span class="profile-link-icon rounded-2 bg-white d-flex align-items-center justify-content-center"><i class="bi bi-linkedin"></i></span>
              <span class="flex-grow-1">
                <span class="d-block fw-semibold">Add your LinkedIn</span>
                <span class="d-block profile-small text-body-secondary">Let recruiters find you</span>
              </span>
              <i class="bi bi-plus-lg text-body-secondary"></i>
            </button>
          </div>
        </div>

        <div class="card profile-card d-flex flex-row align-items-center gap-3">
          <div class="flex-grow-1">
            <label for="open-to-teams" class="fw-semibold d-block mb-1">Show me in Teammate Finder</label>
            <span class="profile-small text-body-secondary">Team leaders can see you based on your skills.</span>
          </div>
          <div class="form-check form-switch mb-0">
            <input
              id="open-to-teams"
              class="form-check-input profile-switch"
              type="checkbox"
              role="switch"
              :checked="auth.openToTeams"
              :disabled="isSavingToggle"
              @change="toggleOpenToTeams"
            />
          </div>
        </div>
      </div>

      <!-- right column -->
      <form class="col-12 col-lg-8 d-flex flex-column gap-4" @submit.prevent="saveChanges">
        <div class="card profile-card">
          <label for="profile-bio" class="profile-section-title mb-1">About</label>
          <p class="profile-hint">A few lines about you and what you are looking for.</p>
          <textarea
            id="profile-bio"
            v-model="draft.bio"
            class="form-control"
            rows="3"
            maxlength="300"
            placeholder="e.g. First-year IS student who likes building things people use. Looking for a summer frontend internship and a hackathon team."
          ></textarea>
          <p class="text-end profile-small text-body-tertiary mt-1 mb-0">{{ draft.bio.length }}/300</p>
        </div>

        <div class="card profile-card">
          <div class="d-flex justify-content-between align-items-center mb-1">
            <h3 class="profile-section-title mb-0">Skills</h3>
            <button type="button" class="btn btn-link fw-semibold text-decoration-none p-0" @click="isAddingSkill = true">
              <i class="bi bi-plus-lg"></i> Add skill
            </button>
          </div>
          <p class="profile-hint">Used to match you with teams and recommend roles. Pick a level for each one.</p>

          <div v-if="isAddingSkill" class="d-flex gap-2 mb-3">
            <input
              v-model="newSkill"
              type="text"
              class="form-control"
              list="skill-suggestions"
              placeholder="Type a skill, e.g. Vue.js"
              aria-label="New skill"
              @keydown.enter.prevent="addSkill"
            />
            <datalist id="skill-suggestions">
              <option v-for="skill in popularSkills" :key="skill" :value="skill"></option>
            </datalist>
            <button type="button" class="btn btn-primary fw-semibold" @click="addSkill">Add</button>
            <button type="button" class="btn btn-outline-primary" aria-label="Stop adding skills" @click="isAddingSkill = false">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>

          <p v-if="draft.skills.length === 0" class="text-body-secondary mb-0">
            No skills yet. Click <strong>Add skill</strong> so teams can find you.
          </p>
          <div class="d-flex flex-wrap gap-2">
            <span v-for="skill in draft.skills" :key="skill" class="profile-skill d-inline-flex align-items-center gap-2 rounded-pill border bg-white">
              <span class="fw-semibold">{{ skill }}</span>
              <select
                class="profile-level rounded-pill"
                :class="'level-' + levelOf(skill).toLowerCase()"
                :value="levelOf(skill)"
                :aria-label="'Level for ' + skill"
                @change="setLevel(skill, $event.target.value)"
              >
                <option v-for="level in skillLevelOptions" :key="level" :value="level">{{ level }}</option>
              </select>
              <button type="button" class="btn-close profile-remove-skill" :aria-label="'Remove ' + skill" @click="removeSkill(skill)"></button>
            </span>
          </div>
        </div>

        <div class="card profile-card">
          <h3 class="profile-section-title mb-1">Career interests</h3>
          <p class="profile-hint">Helps us recommend the right opportunities on your dashboard.</p>

          <p class="profile-overline">ROLES</p>
          <div class="d-flex flex-wrap gap-2 mb-4">
            <button
              v-for="role in careerRoles"
              :key="role"
              type="button"
              class="btn rounded-pill fw-medium profile-role"
              :class="{ 'is-selected': draft.careerInterests.roles.includes(role) }"
              :aria-pressed="draft.careerInterests.roles.includes(role)"
              @click="toggleRole(role)"
            >
              {{ role }}
            </button>
          </div>

          <div class="row g-4">
            <div class="col-12 col-md-4">
              <p class="profile-overline">OPPORTUNITY TYPES</p>
              <div v-for="option in opportunityTypeOptions" :key="option.value" class="form-check mb-2">
                <input
                  :id="'type-' + option.value"
                  v-model="draft.careerInterests.opportunityTypes"
                  class="form-check-input"
                  type="checkbox"
                  :value="option.value"
                />
                <label class="form-check-label" :for="'type-' + option.value">{{ option.label }}</label>
              </div>
            </div>
            <div class="col-12 col-md-4">
              <p class="profile-overline">WORK TYPE</p>
              <div class="profile-work-toggle d-inline-flex rounded-3 p-1" role="radiogroup" aria-label="Work type">
                <button
                  v-for="option in workTypeOptions"
                  :key="option.value"
                  type="button"
                  class="btn rounded-2 fw-medium text-nowrap"
                  :class="{ 'bg-white shadow-sm': draft.careerInterests.workType === option.value }"
                  role="radio"
                  :aria-checked="draft.careerInterests.workType === option.value"
                  @click="draft.careerInterests.workType = option.value"
                >
                  {{ option.label }}
                </button>
              </div>
            </div>
            <div class="col-12 col-md-4">
              <label for="available-from" class="profile-overline d-block">AVAILABLE FROM</label>
              <select id="available-from" v-model="draft.careerInterests.availableFrom" class="form-select">
                <option value="">Any time</option>
                <option v-for="month in monthOptions" :key="month.value" :value="month.value">{{ month.label }}</option>
              </select>
            </div>
          </div>
        </div>

        <div class="d-flex flex-wrap justify-content-end align-items-center gap-2">
          <p v-if="errorMessage" class="text-tt-accent fw-medium mb-0 me-auto" role="alert">
            <i class="bi bi-exclamation-circle me-1"></i>{{ errorMessage }}
          </p>
          <p v-else-if="hasChanges" class="text-body-secondary mb-0 me-auto">You have unsaved changes.</p>
          <button type="button" class="btn btn-lg btn-outline-primary fw-semibold" :disabled="!hasChanges" @click="discardChanges">Discard</button>
          <button type="submit" class="btn btn-lg btn-primary fw-semibold" :disabled="!hasChanges || isSaving">
            {{ isSaving ? 'Saving...' : 'Save changes' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Edit profile pop-up -->
    <TeamModal v-if="showDetails" title="Edit profile" subtitle="Your name, year, school and links." width="560px" @close="showDetails = false">
      <form id="details-form" class="d-flex flex-column gap-3" @submit.prevent="saveDetails">
        <div>
          <label for="details-name" class="form-label fw-semibold">Your name</label>
          <input id="details-name" v-model="details.displayName" type="text" class="form-control" maxlength="50" autocomplete="name" />
        </div>
        <div class="row g-3">
          <div class="col-4">
            <label for="details-year" class="form-label fw-semibold">Year</label>
            <select id="details-year" v-model="details.year" class="form-select">
              <option value="">—</option>
              <option v-for="n in 5" :key="n" :value="n">Year {{ n }}</option>
            </select>
          </div>
          <div class="col-8">
            <label for="details-faculty" class="form-label fw-semibold">SMU school</label>
            <select id="details-faculty" v-model="details.faculty" class="form-select">
              <option value="" disabled>Pick your school</option>
              <option v-for="option in faculties" :key="option.code" :value="option.code">{{ option.code }} · {{ option.name }}</option>
            </select>
          </div>
        </div>
        <div>
          <label for="details-github" class="form-label fw-semibold"><i class="bi bi-github me-1"></i>GitHub</label>
          <input id="details-github" v-model="details.githubUrl" type="url" class="form-control" placeholder="https://github.com/your-name" />
        </div>
        <div>
          <label for="details-linkedin" class="form-label fw-semibold"><i class="bi bi-linkedin me-1"></i>LinkedIn</label>
          <input id="details-linkedin" v-model="details.linkedinUrl" type="url" class="form-control" placeholder="https://linkedin.com/in/your-name" />
        </div>
        <p v-if="detailsError" class="text-tt-accent mb-0">{{ detailsError }}</p>
      </form>
      <template #footer>
        <button type="button" class="btn btn-outline-primary fw-semibold" @click="showDetails = false">Cancel</button>
        <button type="submit" form="details-form" class="btn btn-primary fw-semibold" :disabled="isSavingDetails">
          {{ isSavingDetails ? 'Saving...' : 'Save' }}
        </button>
      </template>
    </TeamModal>
  </div>
</template>
