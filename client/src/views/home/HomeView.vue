<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import './home.css'
import PageHeader from '@/components/PageHeader.vue'
import MiniCalendar from '@/components/home/MiniCalendar.vue'
import UpcomingDeadlines from '@/components/home/UpcomingDeadlines.vue'
import RecommendedOpportunities from '@/components/home/RecommendedOpportunities.vue'
import TeamRequestsCard from '@/components/home/TeamRequestsCard.vue'
import DailyPracticeCard from '@/components/home/DailyPracticeCard.vue'
import TrekLoader from '@/components/TrekLoader.vue'
import TabCards from '@/components/TabCards.vue'
import TeamJoinedToast from '@/components/teams/TeamJoinedToast.vue'
import { useUserStore } from '@/store/user'
import { useApplicationsStore } from '@/store/applications'
import { useOpportunityStore } from '@/store/opportunity'
import { fetchIncomingRequests, answerRequest, fetchMyInvites, answerInvite, getErrorMessage } from '@/services/teamService'
import { getApplicationDeadline, isDueThisWeek } from '@/utils/application'
import { getDaysLeft } from '@/utils/opportunity'
import { formatDate } from '@/utils/date'
import { getDisplayName } from '@/utils/team'

const router = useRouter()
const auth = useUserStore()
const applicationStore = useApplicationsStore()
const opportunityStore = useOpportunityStore()
const { applications } = storeToRefs(applicationStore)

const search = ref('')
const skills = computed(() => auth.skills)
const incoming = ref([]) // people asking to join my teams
const invites = ref([]) // teams inviting me
const busyRequestId = ref('')
// the loader is for the first load only; later refreshes (e.g. after tracking a pick) keep the dashboard on screen
const firstLoadDone = ref(false)
const requestError = ref('')

onMounted(() => {
  // each part loads on its own, so one failing does not blank the whole dashboard
  applicationStore.fetchApplications().finally(() => (firstLoadDone.value = true))
  opportunityStore.fetchOpportunities()
  loadRequests()
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
  // role offers I sent are waiting on the other person, not me
  const needAnswer = incoming.value.filter((request) => request.kind !== 'invite').length
  const requestCount = needAnswer + invites.value.length
  return [
    {
      key: 'saved',
      label: 'Saved opportunities',
      to: '/tracker',
      count: countStatus('saved') + ' saved',
      hint: '+' + savedThisWeek.value + ' this week',
      icon: 'bi-clipboard-check-fill',
    },
    {
      key: 'active',
      label: 'Active applications',
      to: '/tracker',
      count: countStatus('applied', 'interview') + ' active',
      hint: countStatus('interview') + ' at interview',
      icon: 'bi-briefcase-fill',
    },
    {
      key: 'deadlines',
      label: 'Deadlines this week',
      to: '/tracker',
      count: dueThisWeek.value.length + ' due',
      hint: nextDue ? 'Next: ' + formatDate(nextDue.deadline) : 'Nothing due',
      icon: 'bi-calendar-event-fill',
    },
    {
      key: 'requests',
      label: 'Team requests',
      to: { path: '/teams', query: { tab: 'requests' } },
      count: requestCount + ' waiting',
      hint:
        invites.value.length > 0
          ? invites.value.length + (invites.value.length === 1 ? ' invite for you' : ' invites for you')
          : needAnswer > 0
            ? 'Waiting for you'
            : 'All caught up',
      icon: 'bi-person-plus-fill',
      news: requestCount > 0,
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
    message: getDisplayName(request.user).split('@')[0] + ' joined ' + request.team.name + (request.role ? ' as ' + request.role : '') + '.',
    left: personFrom(request.user),
    right: me()
  }
}
function showInviteAccepted(invite) {
  joinedToast.value = {
    key: invite._id,
    title: "You're in!",
    message: 'You joined ' + invite.team.name + (invite.role ? ' as ' + invite.role : '') + '. Say hi to your new team.',
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

// role: the open role the lead picked on the card (accepting only)
async function respond(request, status, role) {
  busyRequestId.value = request._id
  requestError.value = ''
  try {
    const answered = await answerRequest(request._id, status, role)
    // a different role than they asked for goes to them to OK first; it shows as waiting
    if (status === 'accepted' && answered?.status !== 'pending') {
      showRequestAccepted({ ...request, role: role ?? request.role })
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
      v-if="!firstLoadDone"
      title="Setting up your dashboard"
      :captions="['Counting your deadlines…', 'Picking opportunities for your skills…', 'Checking your team requests…']"
    />
    <template v-else>
      <!-- stat cards: each one links to where its number comes from -->
      <TabCards :tabs="stats" label="Your summary" id-prefix="home-stat-" />

      <div class="row g-3 dashboard-body">
        <div class="col-12 col-lg-8 d-flex flex-column gap-3 dashboard-col">
          <UpcomingDeadlines :deadlines="upcomingDeadlines" />
          <RecommendedOpportunities :skills="skills" />
        </div>

        <div class="col-12 col-lg-4 d-flex flex-column gap-3 dashboard-col">
          <MiniCalendar class="flex-shrink-0" :events="calendarEvents" />
          <TeamRequestsCard
            :incoming="incoming"
            :invites="invites"
            :busy-id="busyRequestId"
            :error="requestError"
            @answer-request="respond"
            @answer-invite="respondToInvite"
          />
          <DailyPracticeCard />
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
