<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import './home.css'
import PageHeader from '@/components/PageHeader.vue'
import OpportunityCard from '@/components/opportunities/OpportunityCard.vue'
import MiniCalendar from '@/components/home/MiniCalendar.vue'
import TrekLoader from '@/components/TrekLoader.vue'
import TeamJoinedToast from '@/components/teams/TeamJoinedToast.vue'
import { useUserStore } from '@/store/user'
import { useApplicationsStore } from '@/store/applications'
import { useOpportunityStore } from '@/store/opportunity'
import { fetchIncomingRequests, answerRequest, fetchMyInvites, answerInvite, getErrorMessage } from '@/services/teamService'
import serverAPI from '@/services/serverAPI'
import { typeBadge } from '@/constants'
import { getApplicationDeadline, isDueThisWeek, getStageLabel } from '@/utils/application'
import { getDaysLeft, isClosed } from '@/utils/opportunity'
import { formatDate } from '@/utils/date'
import { getDisplayName, getInitials, getAvatarStyle } from '@/utils/team'

const router = useRouter()
const auth = useUserStore()
const applicationStore = useApplicationsStore()
const opportunityStore = useOpportunityStore()
const { applications, isLoading } = storeToRefs(applicationStore)
const { jobs, hackathons } = storeToRefs(opportunityStore)

const search = ref('')
const skills = computed(() => auth.skills)
const incoming = ref([]) // people asking to join my teams
const invites = ref([]) // teams inviting me
const practiceScore = ref(null)
const busyRequestId = ref('')
const requestError = ref('')

onMounted(async () => {
  // each part loads on its own, so one failing does not blank the whole dashboard
  applicationStore.fetchApplications()
  opportunityStore.fetchOpportunities()

  loadRequests()

  try {
    const response = await serverAPI.get('/interview/dashboard')
    practiceScore.value = response.data.averageScore
  } catch (error) {
    console.error(error)
  }
})

async function loadRequests() {
  try {
    const requests = await fetchIncomingRequests()
    incoming.value = requests.filter((request) => request.status === 'pending')
  } catch (error) {
    console.error(error)
    incoming.value = []
  }
  try {
    invites.value = await fetchMyInvites()
  } catch (error) {
    console.error(error)
    invites.value = []
  }
}

// --- header ---

// the first word of the name from onboarding; if there is none, a guess from the SMU email
// e.g. "kellie.jubela.2025@smu.edu.sg" -> "Kellie"
const firstName = computed(() => {
  if (auth.displayName) return auth.displayName.split(' ')[0]
  const parts = (auth.username ?? '').split('@')[0].split('.')
  const name = parts.find((part) => /^[a-z]{2,}$/i.test(part)) ?? parts[0] ?? ''
  return name.charAt(0).toUpperCase() + name.slice(1)
})

const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
})

const todayText = new Date().toLocaleDateString('en-SG', { weekday: 'long', day: 'numeric', month: 'long' })

function goToOpportunities() {
  router.push({ path: '/opportunities', query: search.value.trim() ? { search: search.value.trim() } : {} })
}

// --- stat cards ---

function countStatus(...statuses) {
  return applications.value.filter((application) => statuses.includes(application.status)).length
}

const savedThisWeek = computed(() => {
  const weekAgo = Date.now() - 7 * 86400000
  return applications.value.filter(
    (application) => application.status === 'saved' && new Date(application.createdAt) >= weekAgo
  ).length
})

const dueThisWeek = computed(() => applications.value.filter(isDueThisWeek))

const stats = computed(() => {
  const nextDue = upcomingDeadlines.value[0]
  return [
    {
      label: 'Saved opportunities',
      to: '/tracker',
      value: countStatus('saved'),
      note: '+' + savedThisWeek.value + ' this week',
      icon: 'bi-clipboard-check',
      tile: 'bg-primary-subtle text-primary',
    },
    {
      label: 'Active applications',
      to: '/tracker',
      value: countStatus('applied', 'interview'),
      note: countStatus('interview') + ' at interview',
      icon: 'bi-briefcase',
      tile: 'bg-info-subtle text-primary',
    },
    {
      label: 'Deadlines this week',
      to: '/tracker',
      value: dueThisWeek.value.length,
      note: nextDue ? 'Next: ' + formatDate(nextDue.deadline) : 'Nothing due',
      icon: 'bi-calendar-event',
      tile: 'bg-tt-peach text-body',
    },
    {
      label: 'Team requests',
      to: { path: '/teams', query: { tab: 'requests' } },
      value: incoming.value.length + invites.value.length,
      note:
        invites.value.length > 0
          ? invites.value.length + (invites.value.length === 1 ? ' invite for you' : ' invites for you')
          : incoming.value.length > 0
            ? 'Waiting for you'
            : 'All caught up',
      icon: 'bi-person-plus',
      tile: 'bg-danger-subtle text-tt-accent',
    },
  ]
})

// --- upcoming deadlines ---

// tracked applications with a deadline from today onwards, soonest first (rejected and finished ones are left out)
const upcomingDeadlines = computed(() => {
  const list = []
  for (const application of applications.value) {
    const deadline = getApplicationDeadline(application)
    const daysLeft = getDaysLeft({ deadline })
    if (deadline && daysLeft >= 0 && application.status !== 'rejected' && application.status !== 'results') {
      list.push({ application, deadline, daysLeft })
    }
  }
  list.sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
  return list
})

function daysLeftText(daysLeft) {
  if (daysLeft === 0) return 'Due today'
  if (daysLeft === 1) return '1 day left'
  if (daysLeft < 7) return daysLeft + ' days left'
  if (daysLeft < 14) return '1 week left'
  if (daysLeft < 60) return Math.floor(daysLeft / 7) + ' weeks left'
  if (daysLeft < 365) return Math.floor(daysLeft / 30) + ' months left'
  return 'Over a year left'
}

function monthShort(date) {
  return new Date(date).toLocaleDateString('en-SG', { month: 'short' }).toUpperCase()
}

// --- calendar ---

const calendarEvents = computed(() => {
  const events = []
  for (const application of applications.value) {
    const deadline = getApplicationDeadline(application)
    // title and organisation are shown when the day is clicked on the calendar
    const details = { title: application.opportunityId.title, organisation: application.opportunityId.organisation }
    if (deadline) events.push({ date: deadline, kind: 'deadline', ...details })
    if (application.interviewAt) events.push({ date: application.interviewAt, kind: 'interview', ...details })
  }
  return events
})

// --- recommended for you ---

// "Vue.js" -> "vue", so it also matches listings that only say "Vue"
function skillWord(skill) {
  return skill.toLowerCase().replace(/\.js$/, '').trim()
}

function matchCount(item) {
  const text = [item.title, item.description, ...(item.themes ?? [])].join(' ').toLowerCase()
  return skills.value.filter((skill) => skillWord(skill) !== '' && text.includes(skillWord(skill))).length
}

// best matching open job and best matching open hackathon that are not tracked yet
const recommended = computed(() => {
  const picks = []
  for (const list of [jobs.value, hackathons.value]) {
    let best = null
    let bestScore = -1
    for (const item of list) {
      if (isClosed(item) || opportunityStore.isSaved(item)) continue
      const score = matchCount(item)
      if (score > bestScore) {
        best = item
        bestScore = score
      }
    }
    if (best) picks.push(best)
  }
  return picks
})

// --- team requests ---

// the "someone joined" toast: two avatars meet with a heart
const joinedToast = ref(null)
function personFrom(user) {
  return { id: user?._id ?? '', name: getDisplayName(user), avatarUpdatedAt: user?.avatar?.updatedAt ?? '' }
}
function me() {
  return { id: auth._id ?? '', name: auth.displayName ?? auth.username ?? 'You', avatarUpdatedAt: auth.avatarUpdatedAt ?? '' }
}
function showRequestAccepted(request) {
  joinedToast.value = {
    key: request._id,
    title: 'Welcome aboard!',
    message: getDisplayName(request.user).split('@')[0] + ' joined ' + request.team.name + '.',
    left: personFrom(request.user),
    right: me()
  }
}
function showInviteAccepted(invite) {
  joinedToast.value = {
    key: invite._id,
    title: "You're in!",
    message: 'You joined ' + invite.team.name + '. Say hi to your new team.',
    left: me(),
    right: personFrom(invite.team.leader)
  }
}

// an invite from a team lead: join the team or say no
async function respondToInvite(invite, status) {
  busyRequestId.value = invite._id
  requestError.value = ''
  try {
    await answerInvite(invite._id, status)
    if (status === 'accepted') {
      showInviteAccepted(invite)
    }
    await loadRequests()
  } catch (error) {
    requestError.value = 'Could not answer the invite: ' + getErrorMessage(error)
  }
  busyRequestId.value = ''
}

async function respond(request, status) {
  busyRequestId.value = request._id
  requestError.value = ''
  try {
    await answerRequest(request._id, status)
    if (status === 'accepted') {
      showRequestAccepted(request)
    }
    await loadRequests()
  } catch (error) {
    requestError.value = 'Could not answer the request: ' + getErrorMessage(error)
  }
  busyRequestId.value = ''
}
</script>

<template>
  <!-- from lg up the whole dashboard fits the screen; long lists scroll inside their own card -->
  <div class="dashboard">
    <PageHeader
      v-model="search"
      :title="greeting + ', ' + firstName"
      :subtitle="todayText + ' · ' + dueThisWeek.length + (dueThisWeek.length === 1 ? ' deadline' : ' deadlines') + ' this week'"
      type="opportunities"
      @keydown.enter="goToOpportunities"
    />

    <!-- only the first time: after that the old numbers stay on screen while they refresh -->
    <TrekLoader
      v-if="isLoading && applications.length === 0"
      title="Setting up your dashboard"
      :captions="['Counting your deadlines…', 'Picking opportunities for your skills…', 'Checking your team requests…']"
    />
    <template v-else>
    <!-- stat cards -->
    <div class="row g-3 mb-3">
      <div v-for="stat in stats" :key="stat.label" class="col-6 col-xl-3">
        <!-- each number links to where it comes from -->
        <RouterLink :to="stat.to" class="card home-stat-card card-hover h-100 text-decoration-none text-body">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <span class="home-stat-icon rounded-3 d-flex align-items-center justify-content-center" :class="stat.tile">
              <i :class="`bi ${stat.icon}`"></i>
            </span>
            <span class="text-caption text-body-tertiary text-end">{{ stat.note }}</span>
          </div>
          <div class="text-stat">{{ stat.value }}</div>
          <div class="small text-body-secondary">{{ stat.label }}</div>
        </RouterLink>
      </div>
    </div>

    <div class="row g-3 dashboard-body">
      <!-- left column -->
      <div class="col-12 col-lg-8 d-flex flex-column gap-3 dashboard-col">
        <div class="card p-3 d-flex flex-column fill-card">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h2 class="h5 fw-semibold mb-0">Upcoming deadlines</h2>
            <RouterLink to="/tracker" class="small fw-semibold text-decoration-none">Open tracker</RouterLink>
          </div>

          <p v-if="upcomingDeadlines.length === 0" class="text-body-secondary small mb-0 py-3">
            No upcoming deadlines. Track something from
            <RouterLink to="/opportunities">Opportunities</RouterLink> to see it here.
          </p>

          <div class="scroll-list">
          <RouterLink
            v-for="entry in upcomingDeadlines.slice(0, 10)"
            :key="entry.application._id"
            to="/tracker"
            class="deadline-row row-hover d-flex align-items-center gap-3 py-2 px-2 text-decoration-none text-body"
          >
            <div
              class="date-tile rounded-3 d-flex flex-column align-items-center justify-content-center flex-shrink-0"
              :class="entry.daysLeft <= 7 ? 'bg-danger-subtle text-tt-accent' : 'bg-body-secondary text-body'"
            >
              <span class="text-overline">{{ monthShort(entry.deadline) }}</span>
              <span class="fw-bold">{{ new Date(entry.deadline).getDate() }}</span>
            </div>
            <div class="flex-grow-1 min-w-0">
              <p class="fw-semibold mb-1 text-truncate">{{ entry.application.opportunityId.title }}</p>
              <div class="d-flex align-items-center gap-2 small text-body-secondary">
                <span class="text-truncate">{{ entry.application.opportunityId.organisation }}</span>
                <span class="badge rounded-pill fw-medium text-capitalize" :class="typeBadge[entry.application.opportunityId.type]">
                  {{ entry.application.opportunityId.type }}
                </span>
              </div>
            </div>
            <span class="status-pill badge rounded-pill bg-body-secondary text-body fw-medium d-none d-sm-inline-flex align-items-center gap-1">
              <span class="status-dot-home rounded-circle" :style="{ backgroundColor: `var(--tt-status-${entry.application.status})` }"></span>
              {{ getStageLabel(entry.application.status) }}
            </span>
            <span class="days-left small text-end flex-shrink-0" :class="entry.daysLeft <= 7 ? 'text-tt-accent fw-semibold' : 'text-body-secondary'">
              {{ daysLeftText(entry.daysLeft) }}
            </span>
          </RouterLink>
          </div>
        </div>

        <div class="flex-shrink-0">
          <div class="d-flex justify-content-between align-items-end mb-2">
            <div>
              <h2 class="h5 fw-semibold mb-0">
                <template v-if="skills.length > 0">Based on your skills: {{ skills.slice(0, 3).join(', ') }}</template>
                <template v-else>Fresh picks for you</template>
              </h2>
            </div>
            <RouterLink to="/opportunities" class="small fw-semibold text-decoration-none text-nowrap">See all in Discover</RouterLink>
          </div>
          <p v-if="skills.length === 0" class="small text-body-secondary mb-2">
            Add your skills on the <RouterLink to="/teams">Teams</RouterLink> page to get better matches.
          </p>
          <div class="row g-3">
            <div v-for="item in recommended" :key="item.source + '-' + item.externalId" class="col-12 col-md-6">
              <OpportunityCard
                :item="item"
                :saved="opportunityStore.isSaved(item)"
                :team-count="opportunityStore.teamCountFor(item)"
                @find-team="router.push({ path: '/teams', query: { event: item.title } })"
                @details="router.push('/opportunities')"
                @toggle-save="opportunityStore.toggleSave(item)"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- right column -->
      <div class="col-12 col-lg-4 d-flex flex-column gap-3 dashboard-col">
        <MiniCalendar class="flex-shrink-0" :events="calendarEvents" />

        <div class="card p-3 d-flex flex-column fill-card requests-card">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <h2 class="h6 fw-semibold mb-0">Team requests</h2>
            <RouterLink to="/teams" class="small fw-semibold text-decoration-none">View all</RouterLink>
          </div>
          <p v-if="requestError" class="small text-tt-accent mb-2">{{ requestError }}</p>
          <p v-if="incoming.length === 0 && invites.length === 0" class="small text-body-secondary mb-0">
            No new requests or invites. People who ask to join your teams, and teams that invite you, show up here.
          </p>
          <div class="scroll-list">
          <!-- invites to me come first: a team lead asked me to join -->
          <div v-for="invite in invites" :key="invite._id" class="d-flex align-items-center gap-2 py-1">
            <span class="request-avatar rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 bg-info-subtle text-primary">
              <i class="bi bi-envelope-heart" aria-hidden="true"></i>
            </span>
            <div class="flex-grow-1 min-w-0 small lh-sm">
              <p class="mb-1">
                <span class="fw-semibold">{{ getDisplayName(invite.team.leader).split('@')[0] }}</span>
                invited you to join <span class="fw-semibold">{{ invite.team.name }}</span>
              </p>
              <span class="text-caption text-body-tertiary d-block text-truncate">
                {{ invite.team.event?.name }}<template v-if="invite.message"> · "{{ invite.message }}"</template>
              </span>
            </div>
            <button
              class="btn btn-sm btn-primary"
              :disabled="busyRequestId === invite._id"
              :aria-label="'Join ' + invite.team.name"
              title="Join team"
              @click="respondToInvite(invite, 'accepted')"
            >
              <i class="bi bi-check-lg"></i>
            </button>
            <button
              class="btn btn-sm btn-outline-primary"
              :disabled="busyRequestId === invite._id"
              :aria-label="'Decline invite to ' + invite.team.name"
              title="Decline"
              @click="respondToInvite(invite, 'declined')"
            >
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div v-for="request in incoming" :key="request._id" class="d-flex align-items-center gap-2 py-1">
            <span
              class="request-avatar rounded-circle d-flex align-items-center justify-content-center small fw-semibold flex-shrink-0"
              :style="getAvatarStyle(getDisplayName(request.user))"
            >
              {{ getInitials(getDisplayName(request.user)) }}
            </span>
            <div class="flex-grow-1 min-w-0 small lh-sm">
              <p class="mb-1">
                <span class="fw-semibold">{{ getDisplayName(request.user).split('@')[0] }}</span>
                wants to join <span class="fw-semibold">{{ request.team?.name }}</span>
              </p>
              <span v-if="request.role" class="text-caption text-body-tertiary">{{ request.role }}</span>
            </div>
            <button
              class="btn btn-sm btn-primary"
              :disabled="busyRequestId === request._id"
              aria-label="Accept request"
              @click="respond(request, 'accepted')"
            >
              <i class="bi bi-check-lg"></i>
            </button>
            <button
              class="btn btn-sm btn-outline-primary"
              :disabled="busyRequestId === request._id"
              aria-label="Decline request"
              @click="respond(request, 'declined')"
            >
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          </div>
        </div>

        <!-- kept to one short row so the Team requests card above has room for a whole request -->
        <div class="card practice-card border-0 px-3 py-2 flex-shrink-0 d-flex flex-row align-items-center gap-3">
          <div class="flex-grow-1 min-w-0">
            <h2 class="h6 fw-semibold mb-0"><i class="bi bi-stars me-1"></i>Daily practice</h2>
            <p class="text-caption mb-0 text-truncate" :title="'Practise interview questions for the internships you are tracking.'">
              <template v-if="practiceScore > 0">Average score {{ practiceScore }}/10</template>
              <template v-else>Questions for the roles you track</template>
            </p>
          </div>
          <RouterLink to="/interview" class="btn btn-sm btn-primary fw-semibold text-nowrap flex-shrink-0">Start practice</RouterLink>
        </div>
      </div>
    </div>
    </template>
    <TeamJoinedToast
      v-if="joinedToast"
      :key="joinedToast.key"
      :title="joinedToast.title"
      :message="joinedToast.message"
      :left="joinedToast.left"
      :right="joinedToast.right"
      @close="joinedToast = null"
    />
  </div>
</template>
