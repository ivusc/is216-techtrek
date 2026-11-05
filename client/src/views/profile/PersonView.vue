<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import './profile.css'
import UserAvatar from '@/components/UserAvatar.vue'
import TrekLoader from '@/components/TrekLoader.vue'
import { useUserStore } from '@/store/user'
import { fetchProfile } from '@/services/userService'
import { faculties } from '@/constants'
import { safeHttpUrl } from '@/utils/url'
import { emailLink, getDisplayName } from '@/utils/team'

// someone else's profile, opened from a team, a request or Teammate Finder (/people/:id).
// Shows everything on their profile and their SMU email; their Telegram stays inside their teams.
const route = useRoute()
const router = useRouter()
const auth = useUserStore()

const person = ref(null)
const loading = ref(true)
const notFound = ref(false)

async function load(id) {
  loading.value = true
  notFound.value = false
  try {
    person.value = await fetchProfile(id)
  } catch {
    person.value = null
    notFound.value = true
  }
  loading.value = false
}
watch(() => route.params.id, (id) => id && load(id), { immediate: true })

const isMe = computed(() => String(route.params.id) === String(auth._id))
const name = computed(() => (person.value ? getDisplayName(person.value) : ''))
const firstName = computed(() => name.value.split(/[\s@]/)[0])
const school = computed(() => faculties.find((option) => option.code === person.value?.faculty)?.name ?? '')
// "Year 2 · Information Systems"
const studyLine = computed(() =>
  [person.value?.year ? 'Year ' + person.value.year : '', person.value?.course ?? ''].filter(Boolean).join(' · ')
)
const github = computed(() => safeHttpUrl(person.value?.githubUrl))
const linkedin = computed(() => safeHttpUrl(person.value?.linkedinUrl))
const email = computed(() => emailLink(person.value?.userName))

// back to wherever they came from (a team, a request), or the Teams page if they opened a link
function goBack() {
  if (window.history.state?.back) router.back()
  else router.push('/teams')
}
</script>

<template>
  <div class="person-page mx-auto">
    <button type="button" class="btn btn-link text-decoration-none fw-semibold px-0 mb-3" @click="goBack">
      <i class="bi bi-arrow-left me-1" aria-hidden="true"></i>Back
    </button>

    <TrekLoader v-if="loading" title="Loading profile" :captions="['Finding them on the trail…']" compact />

    <div v-else-if="notFound" class="card profile-card p-4 text-center">
      <p class="fw-semibold mb-1">We couldn't find this person</p>
      <p class="small text-body-secondary mb-0">They may have deleted their account.</p>
    </div>

    <article v-else class="card person-card identity-card overflow-hidden" :aria-label="name + '\'s profile'">
      <div class="identity-banner person-banner bg-primary position-relative overflow-hidden" aria-hidden="true">
        <span class="banner-circle banner-circle-teal"></span>
        <span class="banner-circle banner-circle-coral"></span>
        <span class="banner-circle banner-circle-peach"></span>
      </div>

      <div class="d-flex flex-column align-items-center text-center px-4 pb-4">
        <UserAvatar
          :user-id="person._id"
          :name="name"
          :avatar-updated-at="person.avatar?.updatedAt ?? ''"
          :size="112"
          class="person-avatar identity-avatar"
        />

        <h1 class="person-name h2 mt-3 mb-1 text-break">{{ name }}</h1>
        <p v-if="studyLine" class="fw-medium mb-0">{{ studyLine }}</p>
        <p v-if="school" class="small text-body-secondary mb-0">{{ school }}</p>
        <span
          class="badge rounded-pill fw-medium mt-2"
          :class="person.openToTeams ? 'bg-info-subtle text-body' : 'bg-body-secondary text-body-secondary'"
        >
          {{ person.openToTeams ? '● Open to teams' : '○ Not looking for a team' }}
        </span>

        <p v-if="person.about" class="person-about text-body-secondary mt-3 mb-0">{{ person.about }}</p>
        <p v-else class="text-body-tertiary small mt-3 mb-0">{{ firstName }} hasn't written about themselves yet.</p>

        <hr class="person-divider w-50 my-4" />

        <div v-if="person.skills?.length" class="d-flex flex-wrap justify-content-center gap-2 mb-4">
          <span class="visually-hidden">Skills:</span>
          <span
            v-for="skill in person.skills"
            :key="skill"
            class="badge rounded-pill fw-medium bg-primary-subtle text-primary-emphasis border border-primary-subtle px-3 py-2"
          >
            {{ skill }}
          </span>
        </div>

        <!-- round link buttons -->
        <div class="d-flex justify-content-center gap-3 mb-4">
          <a v-if="github" :href="github" target="_blank" rel="noopener noreferrer" class="person-link" :aria-label="name + ' on GitHub'" title="GitHub">
            <i class="bi bi-github" aria-hidden="true"></i>
          </a>
          <a v-if="linkedin" :href="linkedin" target="_blank" rel="noopener noreferrer" class="person-link" :aria-label="name + ' on LinkedIn'" title="LinkedIn">
            <i class="bi bi-linkedin" aria-hidden="true"></i>
          </a>
          <a v-if="email" :href="email" target="_blank" rel="noopener noreferrer" class="person-link" :aria-label="'Email ' + name" :title="person.userName">
            <i class="bi bi-envelope" aria-hidden="true"></i>
          </a>
        </div>

        <RouterLink v-if="isMe" to="/profile" class="btn btn-primary rounded-pill fw-semibold px-4 py-2">
          <i class="bi bi-pencil me-2" aria-hidden="true"></i>Edit your profile
        </RouterLink>
        <a v-else-if="email" :href="email" target="_blank" rel="noopener noreferrer" class="person-cta btn btn-primary rounded-pill fw-semibold px-4 py-2">
          Email {{ firstName }}<i class="bi bi-arrow-up-right ms-2" aria-hidden="true"></i>
        </a>
        <p v-if="person.userName && !isMe" class="text-caption text-body-tertiary mt-2 mb-0 text-break">{{ person.userName }}</p>
      </div>
    </article>
  </div>
</template>

<style scoped>
.person-page {
  max-width: 480px;
}

.person-card {
  border-radius: 24px;
  box-shadow: 0 24px 48px -28px rgba(28, 26, 61, 0.35);
}

.person-banner {
  height: 112px;
}

/* the photo sits half over the banner */
.person-avatar {
  position: relative;
  margin-top: -56px;
  border-width: 4px !important;
  box-shadow: 0 8px 20px -8px rgba(28, 26, 61, 0.35);
}

.person-name {
  letter-spacing: -0.01em;
}

.person-about {
  max-width: 36ch;
  line-height: 1.6;
  white-space: pre-line;
}

.person-divider {
  opacity: 0.12;
}

.person-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  font-size: 20px;
  color: var(--bs-body-color);
  background-color: var(--bs-secondary-bg);
  text-decoration: none;
  transition: transform 0.15s ease, background-color 0.15s ease, color 0.15s ease;
}
.person-link:hover {
  transform: translateY(-2px);
  color: var(--bs-primary);
  background-color: var(--bs-primary-bg-subtle);
}

.person-cta {
  box-shadow: 0 10px 24px -10px rgba(85, 64, 191, 0.6);
  transition: transform 0.15s ease;
}
.person-cta:hover {
  transform: translateY(-1px);
}

@media (prefers-reduced-motion: reduce) {
  .person-link,
  .person-cta {
    transition: none;
  }
  .person-link:hover,
  .person-cta:hover {
    transform: none;
  }
}
</style>
