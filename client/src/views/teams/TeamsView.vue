<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import './teams.css'
import {getErrorMessage,createTeam,fetchTeams,fetchMatches,fetchMyTeams,updateTeam,deleteTeam,fetchIncomingRequests,fetchSentRequests,answerRequest,withdrawRequest}
from '@/services/teamService'
import {fetchAllOpportunities} from '@/services/opportunityService'
import { useUserStore } from '@/store/user';
import TeamsHeader from '@/components/teams/TeamsHeader.vue'
import TeamsTabs from '@/components/teams/TeamsTabs.vue'
import TeamFilters from '@/components/teams/TeamFilters.vue'
import SkillMatchBanner from '@/components/teams/SkillMatchBanner.vue'
import TeamCard from '@/components/teams/TeamCard.vue'
import RequestsPanel from '@/components/teams/RequestsPanel.vue'
import JoinRequestModal from '@/components/teams/JoinRequestModal.vue'
import CreateTeamModal from '@/components/teams/CreateTeamModal.vue'
import EditSkillsModal from '@/components/teams/EditSkillsModal.vue'
import { getDisplayName, sameSkill, getMatchingSkills } from '@/utils/team'
import TrekLoader from '@/components/TrekLoader.vue'
import RequestSentToast from '@/components/teams/RequestSentToast.vue'
import TeamCreatedCelebration from '@/components/teams/TeamCreatedCelebration.vue'
import InviteFriendsModal from '@/components/teams/InviteFriendsModal.vue'
import InvitesBanner from '@/components/teams/InvitesBanner.vue'
import { fetchMyInvites, answerInvite } from '@/services/teamService'
import { isClosed } from '@/utils/opportunity'
import { useJoinRequests } from '@/composables/useJoinRequests'

const auth = useUserStore()

const teams = ref([])
const myTeams = ref([])
const incoming = ref([])
const sent = ref([])
const matchesByTeam = ref({})
const events = ref([])

const activeTab = ref('browse')
const isLoading = ref(true)
const status = ref('')

const search = ref('')
// "Find team" on an Opportunities hackathon card links here with ?event=<hackathon title>
const route = useRoute()
const eventFromLink = typeof route.query.event === 'string' ? route.query.event : ''
const eventFilter = ref(eventFromLink)
const skillFilter = ref([])
const sizeFilter = ref('')
const openOnly = ref(true)

const showCreate = ref(false)
const editingTeam = ref(null)
const showSkills = ref(false)
const isBusy = ref(false)
const modalError = ref('')
const busyRequestId = ref('')

// off by default: every team is shown. "Match my skills" turns on the skill filter, the match banner
// and the highlighted skills on each card
const matchMySkills = ref(false)

const loadAll = async (showLoading = true) => {
  if (showLoading) {
    isLoading.value = true
  }

  status.value = ''

  try {
    teams.value = await fetchTeams()
  } catch (error) {
    console.error('Teams load failed:', error)
    teams.value = []
  }

  try {
    myTeams.value = await fetchMyTeams()
  } catch (error) {
    console.error('My teams load failed:', error)
    myTeams.value = []
  }

  const suggestable = ledTeams.value.filter((team) => team.status === 'open' && team.skills.length > 0)
  const results = await Promise.allSettled(suggestable.map((team) => fetchMatches(team._id)))
  const loaded = {}
  suggestable.forEach((team, index) => {
    if (results[index].status === 'fulfilled') {
      loaded[team._id] = results[index].value
    } else {
      console.error('Team matches load failed:', results[index].reason)
    }
  })
  matchesByTeam.value = loaded

  try {
    incoming.value = await fetchIncomingRequests()
  } catch (error) {
    console.error('Incoming requests load failed:', error)
    incoming.value = []
  }

  try {
    sent.value = await fetchSentRequests()
  } catch (error) {
    console.error('Sent requests load failed:', error)
    sent.value = []
  }

  try {
    myInvites.value = await fetchMyInvites()
  } catch (error) {
    console.error('Invites load failed:', error)
    myInvites.value = []
  }

  isLoading.value = false
}

const mySkills = computed(() => auth.skills)

// switching "Match my skills" on filters by my skills; switching it off shows every team again
watch(matchMySkills, (on) => {
  skillFilter.value = on ? [...mySkills.value] : []
})

const matchedSkills = computed(() => {
  const wanted = []
  for (const team of teams.value) {
    wanted.push(...team.skills)
  }
  return getMatchingSkills(mySkills.value, wanted)
})

const matchCount = computed(() => {
  return teams.value.filter((team) => team.slotsOpen > 0 && getMatchingSkills(mySkills.value, team.skills).length > 0).length
})

// Browse teams = my own published teams first (so a new team shows up here straight away), then everyone else's
const myTeamIds = computed(() => new Set(myTeams.value.map((team) => team._id)))
const browseTeams = computed(() => [...myTeams.value.filter((team) => team.status !== 'draft'), ...teams.value])

const pendingIncoming = computed(() => incoming.value.filter((request) => request.status === 'pending').length)
const pendingSent = computed(() => sent.value.filter((request) => request.status === 'pending').length)

// opened from an invite link (/teams?team=<id>): show that team's join form once the teams have loaded
const teamFromLink = typeof route.query.team === 'string' ? route.query.team : ''
async function openTeamFromLink() {
  await loadAll()
  if (teamFromLink === '') return
  const team = teams.value.find((t) => t._id === teamFromLink)
  if (team) {
    openJoin(team)
  } else if (myTeams.value.some((t) => t._id === teamFromLink)) {
    activeTab.value = 'mine'
  } else {
    status.value = 'That team is not taking new members right now.'
  }
}

const tabCounts = computed(() => ({
  browse: browseTeams.value.filter((team) => team.slotsOpen > 0).length,
  mine: myTeams.value.length,
  requests: pendingIncoming.value + pendingSent.value + myInvites.value.length
}))

const eventOptions = computed(() => {
  // keep the hackathon from the link in the list even when it has no teams yet
  const names = eventFromLink !== '' ? [eventFromLink] : []
  for (const team of browseTeams.value) {
    if (!names.includes(team.event.name)) {
      names.push(team.event.name)
    }
  }
  return names.sort()
})

const skillOptions = computed(() => {
  const options = []
  for (const team of browseTeams.value) {
    for (const skill of team.skills) {
      if (!options.some((option) => sameSkill(option, skill))) {
        options.push(skill)
      }
    }
  }
  return options.sort((a, b) => a.localeCompare(b))
})

const skillSuggestions = computed(() => {
  const all = [...skillOptions.value]
  for (const team of myTeams.value) {
    all.push(...team.skills)
  }
  for (const skill of mySkills.value) {
    all.push(skill)
  }
  return all.filter((skill, index) => all.findIndex((other) => sameSkill(other, skill)) === index)
})

function getSizeGroup(team) {
  if (team.teamSize <= 3) {
    return 'small'
  }
  if (team.teamSize <= 5) {
    return 'medium'
  }
  return 'large'
}

const filteredTeams = computed(() => {
  const result = []
  const keyword = search.value.trim().toLowerCase()

  for (const team of browseTeams.value) {
    if (keyword !== '') {
      const text = (team.name + ' ' + team.event.name + ' ' + getDisplayName(team.leader) + ' ' + team.pitch + ' ' + team.skills.join(' ')).toLowerCase()
      if (!text.includes(keyword)) {
        continue
      }
    }
    if (eventFilter.value !== '' && team.event.name !== eventFilter.value) {
      continue
    }
    if (skillFilter.value.length > 0 && getMatchingSkills(skillFilter.value, team.skills).length === 0) {
      continue
    }
    if (sizeFilter.value !== '' && getSizeGroup(team) !== sizeFilter.value) {
      continue
    }
    if (openOnly.value && team.slotsOpen === 0) {
      continue
    }
    result.push(team)
  }

  return result
})

const anyFilter = computed(() => {
  return search.value !== '' || eventFilter.value !== '' || skillFilter.value.length > 0 || sizeFilter.value !== '' || !openOnly.value || matchMySkills.value
})

function clearAll() {
  search.value = ''
  eventFilter.value = ''
  skillFilter.value = []
  matchMySkills.value = false
  sizeFilter.value = ''
  openOnly.value = true
}

const ledTeams = computed(() => myTeams.value.filter((team) => team.isLeader && team.status !== 'draft'))

// send a request, show the "Request sent" toast, undo it
const { joinTarget, joinError, isSending, sentToast, undoingId, undoError, openJoin, closeJoin, submitJoin, undoRequest } =
  useJoinRequests(() => loadAll(false))

// eventName: the hackathon to start the form on (e.g. the one being filtered)
const createForEvent = ref('')
const openCreate = async (team = null, eventName = '') => {
  modalError.value = ''
  try {
    const data = await fetchAllOpportunities()
    // only hackathons that are still open can get new teams
    events.value = (data.hackathons?.hackathons ?? []).filter((event) => !isClosed(event))
  } catch (error) {
    console.error(error)
    events.value = []
  }
  editingTeam.value = team
  createForEvent.value = eventName
  showCreate.value = true
}

// after a new post is published: the "team is live" celebration, then maybe the invite pop-up
const celebrateTeam = ref(null)
const inviteTeam = ref(null)

function inviteFromCelebration() {
  inviteTeam.value = celebrateTeam.value
  celebrateTeam.value = null
}

// invites sent to me
const myInvites = ref([])
const inviteBusyId = ref('')
const joinedMessage = ref('')

async function answerMyInvite(invite, answer) {
  inviteBusyId.value = invite._id
  status.value = ''
  try {
    await answerInvite(invite._id, answer)
    if (answer === 'accepted') {
      joinedMessage.value = 'You joined ' + invite.team.name + '!'
      activeTab.value = 'mine'
      setTimeout(() => (joinedMessage.value = ''), 5000)
    }
    await loadAll(false)
  } catch (error) {
    console.error(error)
    status.value = 'Could not answer the invite: ' + getErrorMessage(error)
  }
  inviteBusyId.value = ''
}

function closeCreate() {
  showCreate.value = false
  editingTeam.value = null
}

const submitTeam = async (post) => {
  isBusy.value = true
  modalError.value = ''
  try {
    if (editingTeam.value) {
      await updateTeam(editingTeam.value._id, post)
    } else {
      const created = await createTeam(post)
      activeTab.value = 'mine'
      // drafts are not public yet, so only celebrate published posts
      if (post.status !== 'draft') {
        celebrateTeam.value = created
      }
    }
    closeCreate()
    await loadAll(false)
  } catch (error) {
    console.error(error)
    modalError.value = getErrorMessage(error)
  }
  isBusy.value = false
}

const removeTeam = async () => {
  isBusy.value = true
  modalError.value = ''
  try {
    await deleteTeam(editingTeam.value._id)
    closeCreate()
    await loadAll(false)
  } catch (error) {
    console.error(error)
    modalError.value = getErrorMessage(error)
  }
  isBusy.value = false
}

const answer = async (request, newStatus) => {
  busyRequestId.value = request._id
  try {
    await answerRequest(request._id, newStatus)
    await loadAll(false)
  } catch (error) {
    console.error(error)
    status.value = 'Could not answer the request: ' + getErrorMessage(error)
  }
  busyRequestId.value = ''
}

const withdraw = async (request) => {
  busyRequestId.value = request._id
  try {
    await withdrawRequest(request._id)
    await loadAll(false)
  } catch (error) {
    console.error(error)
    status.value = 'Could not withdraw the request: ' + getErrorMessage(error)
  }
  busyRequestId.value = ''
}

const saveSkills = async (skills) => {
  isBusy.value = true
  modalError.value = ''
  try {
    await auth.updateMe({ skills })
    showSkills.value = false
    await loadAll(false)
    if (matchMySkills.value) {
      skillFilter.value = [...mySkills.value]
    }
  } catch (error) {
    console.error(error)
    modalError.value = getErrorMessage(error)
  }
  isBusy.value = false
}

function openSkills() {
  modalError.value = ''
  showSkills.value = true
}

// keep requests, invites and new teams up to date while the page is open: when the Requests or Browse tab
// is opened, when the browser tab comes back into view, and every 20 seconds (skipped while a form is open)
function refreshInBackground() {
  const formOpen = joinTarget.value || showCreate.value || inviteTeam.value || showSkills.value
  if (document.visibilityState === 'visible' && !formOpen && !isLoading.value) {
    loadAll(false)
  }
}

watch(activeTab, (tab) => {
  if (tab === 'requests' || tab === 'browse') refreshInBackground()
})

let refreshTimer = null
onMounted(() => {
  openTeamFromLink()
  refreshTimer = setInterval(refreshInBackground, 20000)
  document.addEventListener('visibilitychange', refreshInBackground)
})
onUnmounted(() => {
  clearInterval(refreshTimer)
  document.removeEventListener('visibilitychange', refreshInBackground)
})
</script>

<template>
  <div class="p-2">

    <template v-if="auth._id">
      <TeamsHeader v-model="search" :has-new-requests="pendingIncoming > 0" @bell="activeTab = 'requests'" />

      <TeamsTabs v-model:tab="activeTab" :counts="tabCounts" @create="openCreate()" />

      <InvitesBanner v-if="myInvites.length > 0" :invites="myInvites" :busy-id="inviteBusyId" @answer="answerMyInvite" />
      <div v-if="joinedMessage" class="alert alert-success d-flex align-items-center gap-2 py-2" role="status">
        <i class="bi bi-people-fill"></i>{{ joinedMessage }}
      </div>
      <div v-if="undoError" class="alert alert-danger py-2" role="alert">{{ undoError }}</div>
      <div v-if="status !== ''" class="alert alert-danger d-flex justify-content-between align-items-center py-2">
        {{ status }}
        <button class="btn btn-sm btn-link text-tt-accent fw-semibold" @click="loadAll()">Retry</button>
      </div>

      <TrekLoader
        v-if="isLoading"
        title="Finding your teammates"
        :captions="['Looking for teams that need your skills…', 'Rounding up hackathon events…', 'Checking your requests…']"
      />

      <template v-else>

        <template v-if="activeTab === 'browse'">
          <TeamFilters
            v-model:event="eventFilter"
            v-model:skills="skillFilter"
            v-model:size="sizeFilter"
            v-model:open-only="openOnly"
            v-model:match-my-skills="matchMySkills"
            :event-options="eventOptions"
            :skill-options="skillOptions"
            :count="filteredTeams.filter((team) => team.slotsOpen > 0).length"
            :any-filter="anyFilter"
            @clear="clearAll"
          />

          <SkillMatchBanner
            v-if="matchMySkills"
            :my-skills="mySkills"
            :matched-skills="matchedSkills"
            :match-count="matchCount"
            @edit-skills="openSkills"
          />

          <div v-if="filteredTeams.length === 0 && eventFilter !== ''" class="text-center text-body-secondary py-5">
            <p class="mb-3">No teams are looking for members for <strong>{{ eventFilter }}</strong> yet.</p>
            <button class="btn btn-primary fw-semibold me-2" @click="openCreate(null, eventFilter)">
              <i class="bi bi-plus-lg"></i> Start a team
            </button>
            <button class="btn btn-outline-primary fw-semibold" @click="clearAll">See all teams</button>
          </div>
          <p v-else-if="filteredTeams.length === 0" class="text-center text-body-secondary py-5">
            {{ teams.length === 0 ? 'No teams are recruiting right now. Create a team post to start one.' : 'No teams match your filters.' }}
          </p>

          <div class="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3">
            <div v-for="team in filteredTeams" :key="team._id" class="col">
              <TeamCard
                :team="team"
                :mode="myTeamIds.has(team._id) ? 'mine' : 'browse'"
                :my-skills="matchMySkills ? mySkills : []"
                :undoing="undoingId === team.requestId"
                @request="openJoin(team)"
                @undo="undoRequest(team.requestId, team)"
                @invite="inviteTeam = team"
                @edit="openCreate(team)"
                @view-requests="activeTab = 'requests'"
              />
            </div>
          </div>
        </template>

        <template v-else-if="activeTab === 'mine'">
          <p v-if="myTeams.length === 0" class="text-center text-body-secondary py-5">
            You are not in a team yet. Create a team post, or request to join one from Browse teams.
          </p>

          <div class="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3">
            <div v-for="team in myTeams" :key="team._id" class="col">
              <TeamCard
                :team="team"
                mode="mine"
                :my-skills="mySkills"
                :matches="matchesByTeam[team._id]"
                @edit="openCreate(team)"
                @view-requests="activeTab = 'requests'"
                @invite="inviteTeam = team"
              />
            </div>
          </div>
        </template>

        <RequestsPanel
          v-else
          :incoming="incoming"
          :sent="sent"
          :led-teams="ledTeams"
          :busy-id="busyRequestId"
          @answer="answer"
          @withdraw="withdraw"
          @edit-team="openCreate"
        />
      </template>
    </template>

    <JoinRequestModal
      v-if="joinTarget"
      :team="joinTarget"
      :my-skills="mySkills"
      :busy="isSending"
      :error="joinError"
      @close="closeJoin"
      @submit="submitJoin"
    />

    <RequestSentToast
      v-if="sentToast"
      :key="sentToast.requestId"
      :team-name="sentToast.teamName"
      :busy="undoingId === sentToast.requestId"
      @undo="undoRequest(sentToast.requestId, sentToast.team)"
      @close="sentToast = null"
    />

    <CreateTeamModal
      v-if="showCreate"
      :events="events"
      :team="editingTeam"
      :initial-event="createForEvent"
      :suggestions="skillSuggestions"
      :busy="isBusy"
      :error="modalError"
      @close="closeCreate"
      @submit="submitTeam"
      @remove="removeTeam"
    />

    <TeamCreatedCelebration
      v-if="celebrateTeam"
      :team-name="celebrateTeam.name"
      :event-name="celebrateTeam.event?.name"
      @invite="inviteFromCelebration"
      @close="celebrateTeam = null"
    />

    <InviteFriendsModal v-if="inviteTeam" :team="inviteTeam" @close="inviteTeam = null" />

    <EditSkillsModal
      v-if="showSkills"
      :skills="mySkills"
      :suggestions="skillSuggestions"
      :busy="isBusy"
      :error="modalError"
      @close="showSkills = false"
      @submit="saveSkills"
    />
  </div>
</template>
