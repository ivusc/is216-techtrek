<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import './onboarding.css'
import BrandBanner from '@/components/login/BrandBanner.vue'
import SkillPicker from '@/components/SkillPicker.vue'
import { useUserStore } from '@/store/user'
import { faculties } from '@/constants'

const router = useRouter()
const auth = useUserStore()

const steps = [
  { title: 'Your name', text: 'So teammates know who they are working with and what you are into', icon: 'bi-person' },
  { title: 'Your school', text: 'Shown on your team profile', icon: 'bi-building' },
  { title: 'Your skills', text: 'Matches you with teams looking for them', icon: 'bi-stars' },
]
const step = ref(0) // 0, 1 or 2

// start with what we already know, so people who come back do not retype it
const name = ref(auth.displayName ?? '')
// a short intro shown on your profile page (optional, editable on your profile)
const about = ref(auth.user?.about ?? '')
const faculty = ref(auth.faculty ?? '')
const skills = ref([...(auth.skills ?? [])])
// show me in Teammate Finder, so team leads can find and invite me (on unless they turned it off)
const openToTeams = ref(auth.user?.openToTeams ?? true)

const errorMessage = ref('')
const isSaving = ref(false)

const canContinue = computed(() => {
  if (step.value === 0) return name.value.trim() !== ''
  if (step.value === 1) return faculty.value !== ''
  return true
})

function back() {
  errorMessage.value = ''
  step.value--
}

async function next() {
  errorMessage.value = ''
  if (!canContinue.value) return

  if (step.value < steps.length - 1) {
    step.value++
    return
  }

  // last step: save everything at once, then into the app
  isSaving.value = true
  try {
    await auth.updateMe({
      displayName: name.value.trim(),
      about: about.value.trim(),
      faculty: faculty.value,
      skills: skills.value,
      openToTeams: openToTeams.value,
      onboarded: true,
    })
    router.push('/home')
  } catch (error) {
    console.error(error)
    errorMessage.value = error.response?.data?.error ?? 'Could not save your profile. Please try again.'
  }
  isSaving.value = false
}
</script>

<template>
  <div class="row g-0 min-vh-100">
    <BrandBanner>
      <h1 class="banner-title fw-bold text-white mb-3">Let's set up your TechTrek profile.</h1>
      <p class="banner-text mb-4">
        Three quick steps. Your skills are what we use to match you with hackathon teams that need them.
      </p>
      <ul class="list-unstyled d-flex flex-column gap-3 mb-0">
        <li
          v-for="(item, index) in steps"
          :key="item.title"
          class="d-flex align-items-center gap-3"
          :class="{ 'opacity-50': index > step }"
        >
          <span class="feature-icon rounded-2 d-flex align-items-center justify-content-center flex-shrink-0">
            <i :class="index < step ? 'bi bi-check-lg' : `bi ${item.icon}`"></i>
          </span>
          <span class="d-flex flex-column lh-sm">
            <strong class="small">{{ item.title }}</strong>
            <span class="feature-text">{{ item.text }}</span>
          </span>
        </li>
      </ul>
    </BrandBanner>

    <div class="col-12 col-md-6 d-flex justify-content-center align-items-center py-5 px-3">
      <form class="onboarding-card" @submit.prevent="next">
        <!-- progress: one bar per step -->
        <div>
          <p class="text-overline text-body-tertiary mb-2">STEP {{ step + 1 }} OF {{ steps.length }}</p>
          <div class="d-flex gap-2">
            <span
              v-for="(item, index) in steps"
              :key="item.title"
              class="step-bar flex-fill rounded-pill"
              :class="index <= step ? 'bg-primary' : 'bg-body-secondary'"
            ></span>
          </div>
        </div>

        <!-- step 1: name -->
        <template v-if="step === 0">
          <div>
            <h1 class="onboarding-title">Welcome! What should we call you?</h1>
            <p class="onboarding-subtitle">This is the name teammates see on your team posts and requests.</p>
          </div>
          <div>
            <label for="onboarding-name" class="form-label small fw-semibold">Your name</label>
            <div class="icon-input">
              <i class="bi bi-person"></i>
              <input
                id="onboarding-name"
                v-model="name"
                type="text"
                class="form-control"
                maxlength="50"
                autocomplete="name"
                placeholder="e.g. Kellie Jubela"
              />
            </div>
          </div>
          <div>
            <div class="d-flex justify-content-between align-items-baseline">
              <label for="onboarding-about" class="form-label small fw-semibold">About you <span class="fw-normal text-body-tertiary">(optional)</span></label>
              <span class="text-caption text-body-tertiary">{{ about.length }} / 500</span>
            </div>
            <textarea
              id="onboarding-about"
              v-model="about"
              class="form-control"
              rows="3"
              maxlength="500"
              placeholder="What you study, what you like building and what you're looking for."
            ></textarea>
            <p class="text-caption text-body-tertiary mt-1 mb-0">Shown on your profile. You can change it any time.</p>
          </div>
        </template>

        <!-- step 2: school -->
        <template v-else-if="step === 1">
          <div>
            <h1 class="onboarding-title">Which SMU school are you in?</h1>
            <p class="onboarding-subtitle">It shows next to your name when you lead or join a team.</p>
          </div>
          <div class="d-flex flex-column gap-2" role="radiogroup" aria-label="SMU school">
            <label
              v-for="option in faculties"
              :key="option.code"
              class="faculty-option d-flex align-items-center gap-3 rounded-3 border px-3 py-2"
              :class="{ 'is-selected': faculty === option.code }"
            >
              <input v-model="faculty" class="form-check-input mt-0" type="radio" name="faculty" :value="option.code" />
              <span class="d-flex flex-column lh-sm">
                <strong class="small">{{ option.code }}</strong>
                <span class="text-caption text-body-secondary">{{ option.name }}</span>
              </span>
            </label>
          </div>
        </template>

        <!-- step 3: skills -->
        <template v-else>
          <div>
            <h1 class="onboarding-title">What are you good at?</h1>
            <p class="onboarding-subtitle">
              Teams looking for these skills get matched to you on the Teams page. You can change them later.
            </p>
          </div>
          <SkillPicker v-model="skills" />

          <!-- can be changed any time on the profile page -->
          <div class="open-choice d-flex align-items-center gap-3 rounded-3 p-3">
            <div class="flex-grow-1">
              <label for="onboarding-open" class="d-block small fw-semibold">Show me in Teammate Finder</label>
              <span class="text-caption text-body-tertiary">
                Team leads looking for your skills can find and invite you. You can change this on your profile.
              </span>
            </div>
            <div class="form-check form-switch m-0">
              <input id="onboarding-open" v-model="openToTeams" class="form-check-input" type="checkbox" role="switch" />
            </div>
          </div>
        </template>

        <p v-if="errorMessage" class="small text-tt-accent mb-0">{{ errorMessage }}</p>

        <div class="d-flex gap-2">
          <button v-if="step > 0" type="button" class="btn btn-outline-primary fw-semibold" @click="back">Back</button>
          <button type="submit" class="btn btn-primary fw-semibold flex-fill" :disabled="!canContinue || isSaving">
            <template v-if="step < steps.length - 1">Continue</template>
            <template v-else>{{ isSaving ? 'Saving...' : skills.length > 0 ? 'Finish' : 'Skip skills for now' }}</template>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>
