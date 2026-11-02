<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
const api = axios.create({
  baseURL: 'http://localhost:8000/teams'
})
import './teams.css'
import {getErrorMessage,createTeam,fetchProfile,updateSkills,fetchTeams,fetchMyTeams,fetchEvents,updateTeam,deleteTeam,sendRequest,fetchIncomingRequests,fetchSentRequests,answerRequest,withdrawRequest} 
from '@/services/teamService'
import {fetchAllOpportunities} from '@/services/opportunityService'
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

const auth = useAuthStore()

const profile = ref(null)
const teams = ref([])
const myTeams = ref([])
const incoming = ref([])
const sent = ref([])
const events = ref([])

const activeTab = ref('browse')
const isLoading = ref(true)
const status = ref('')

const search = ref('')
const eventFilter = ref('')
const skillFilter = ref([])
const sizeFilter = ref('')
const openOnly = ref(true)

const joinTarget = ref(null)
const showCreate = ref(false)
const editingTeam = ref(null)
const showSkills = ref(false)
const isBusy = ref(false)
const modalError = ref('')
const busyRequestId = ref('')

const userIdInput = ref('')

let skillFilterReady = false

const loadAll = async (showLoading = true) => {
  if (auth.userId === '') {
    isLoading.value = false
    return
  }

  if (showLoading) {
    isLoading.value = true
  }

  status.value = ''

  const userId = auth.userId

  try {
    const { data } = await api.get('/me', {
      params: { userId }
    })
    profile.value = data
  } catch (error) {
    console.error('Profile load failed:', error)
    profile.value = null
  }

  try {
    const { data } = await api.get('/', {
      params: { userId }
    })
    teams.value = data
  } catch (error) {
    console.error('Teams load failed:', error)
    teams.value = []
  }

  try {
    const { data } = await api.get('/mine', {
      params: { userId }
    })
    myTeams.value = data
  } catch (error) {
    console.error('My teams load failed:', error)
    myTeams.value = []
  }

  try {
    const { data } = await api.get('/requests/incoming', {
      params: { userId }
    })
    incoming.value = data
  } catch (error) {
    console.error('Incoming requests load failed:', error)
    incoming.value = []
  }

  try {
    const { data } = await api.get('/requests/sent', {
      params: { userId }
    })
    sent.value = data
  } catch (error) {
    console.error('Sent requests load failed:', error)
    sent.value = []
  }

  try {
    if (!skillFilterReady) {
      skillFilter.value = matchedSkills.value
      skillFilterReady = true
    }
  } catch (error) {
    console.error(error)
  }

  isLoading.value = false
}
onMounted(loadAll)

const mySkills = computed(() => profile.value?.skills ?? [])
const myName = computed(() => (profile.value ? getDisplayName(profile.value) : ''))

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

const pendingIncoming = computed(() => incoming.value.filter((request) => request.status === 'pending').length)
const pendingSent = computed(() => sent.value.filter((request) => request.status === 'pending').length)

const tabCounts = computed(() => ({
  browse: teams.value.filter((team) => team.slotsOpen > 0).length,
  mine: myTeams.value.length,
  requests: pendingIncoming.value + pendingSent.value
}))

const eventOptions = computed(() => {
  const names = []
  for (const team of teams.value) {
    if (!names.includes(team.event.name)) {
      names.push(team.event.name)
    }
  }
  return names.sort()
})

const skillOptions = computed(() => {
  const options = []
  for (const team of teams.value) {
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

  for (const team of teams.value) {
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
  return search.value !== '' || eventFilter.value !== '' || skillFilter.value.length > 0 || sizeFilter.value !== '' || !openOnly.value
})

function clearAll() {
  search.value = ''
  eventFilter.value = ''
  skillFilter.value = []
  sizeFilter.value = ''
  openOnly.value = true
}

const ledTeams = computed(() => myTeams.value.filter((team) => team.isLeader && team.status !== 'draft'))

function openJoin(team) {
  modalError.value = ''
  joinTarget.value = team
}

const submitJoin = async (request) => {
  isBusy.value = true
  modalError.value = ''
  try {
    await sendRequest(auth.userId, joinTarget.value._id, request)
    joinTarget.value = null
    await loadAll(false)
  } catch (error) {
    console.error(error)
    modalError.value = getErrorMessage(error)
  }
  isBusy.value = false
}

const openCreate = async (team = null) => {
  modalError.value = ''
  try {
    const data = await fetchAllOpportunities()
    events.value = data.hackathons.hackathons
  } catch (error) {
    console.error(error)
    events.value = []
  }
  editingTeam.value = team
  showCreate.value = true
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
      await updateTeam(auth.userId, editingTeam.value._id, post)
    } else {
      await createTeam(auth.userId, post)
      activeTab.value = 'mine'
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
    await deleteTeam(auth.userId, editingTeam.value._id)
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
    await answerRequest(auth.userId, request._id, newStatus)
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
    await withdrawRequest(auth.userId, request._id)
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
    await updateSkills(auth.userId, skills)
    showSkills.value = false
    skillFilterReady = false
    await loadAll(false)
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

function useUserId() {
  if (userIdInput.value.trim() !== '') {
    auth.setUserId(userIdInput.value.trim())
    loadAll()
  }
}
</script>

<template>
  <div class="p-2">

    <div v-if="auth.userId === ''" class="card p-4 mx-auto mt-5" style="max-width: 480px">
      <h2 class="h3 mb-2">Choose a user</h2>
      <p class="small text-body-secondary">
        The Teams page needs to know who you are. Paste the <code>_id</code> of a user from the <code>users</code> collection
        (the seed script prints one). This box goes away once login is connected.
      </p>
      <input v-model="userIdInput" type="text" class="form-control mb-2" placeholder="User _id" aria-label="User id" @keydown.enter="useUserId">
      <button class="btn btn-primary fw-semibold" @click="useUserId">Use this user</button>
    </div>

    <template v-else>
      <TeamsHeader v-model="search" :user-name="myName" :has-new-requests="pendingIncoming > 0" @bell="activeTab = 'requests'" />

      <TeamsTabs v-model:tab="activeTab" :counts="tabCounts" @create="openCreate()" />

      <div v-if="status !== ''" class="alert alert-danger d-flex justify-content-between align-items-center py-2">
        {{ status }}
        <button class="btn btn-sm btn-link text-tt-accent fw-semibold" @click="loadAll()">Retry</button>
      </div>

      <p v-if="isLoading" class="text-center text-body-secondary py-5">Loading teams...</p>

      <template v-else>

        <template v-if="activeTab === 'browse'">
          <TeamFilters
            v-model:event="eventFilter"
            v-model:skills="skillFilter"
            v-model:size="sizeFilter"
            v-model:open-only="openOnly"
            :event-options="eventOptions"
            :skill-options="skillOptions"
            :count="filteredTeams.filter((team) => team.slotsOpen > 0).length"
            :any-filter="anyFilter"
            @clear="clearAll"
          />

          <SkillMatchBanner
            :my-skills="mySkills"
            :matched-skills="matchedSkills"
            :match-count="matchCount"
            @edit-skills="openSkills"
          />

          <p v-if="filteredTeams.length === 0" class="text-center text-body-secondary py-5">
            {{ teams.length === 0 ? 'No teams are recruiting right now. Create a team post to start one.' : 'No teams match your filters.' }}
          </p>

          <div class="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3">
            <div v-for="team in filteredTeams" :key="team._id" class="col">
              <TeamCard :team="team" :my-skills="mySkills" @request="openJoin(team)" />
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
                @edit="openCreate(team)"
                @view-requests="activeTab = 'requests'"
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
      :busy="isBusy"
      :error="modalError"
      @close="joinTarget = null"
      @submit="submitJoin"
    />

    <CreateTeamModal
      v-if="showCreate"
      :events="events"
      :team="editingTeam"
      :suggestions="skillSuggestions"
      :busy="isBusy"
      :error="modalError"
      @close="closeCreate"
      @submit="submitTeam"
      @remove="removeTeam"
    />

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
