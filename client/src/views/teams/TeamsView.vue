<script setup>
import { ref, computed, onMounted } from 'vue'
import './teams.css'
import {getErrorMessage,createTeam,fetchTeams,fetchMatches,fetchMyTeams,updateTeam,deleteTeam,sendRequest,fetchIncomingRequests,fetchSentRequests,answerRequest,withdrawRequest}
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

let skillFilterReady = false

const loadAll = async (showLoading = true) => {
  if (showLoading) {
    isLoading.value = true
  }

  status.value = ''

  try {
    teams.value = await fetchTeams()
    if (!skillFilterReady) {
      skillFilter.value = matchedSkills.value
      skillFilterReady = true
    }
  } catch (error) {
    console.error('Teams load failed:', error)
    teams.value = []
    status.value = 'Could not load teams: ' + getErrorMessage(error)
  }

  try {
    myTeams.value = await fetchMyTeams()
  } catch (error) {
    console.error('My teams load failed:', error)
    myTeams.value = []
    status.value = 'Could not load teams: ' + getErrorMessage(error)
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

  isLoading.value = false
}
onMounted(loadAll)

const mySkills = computed(() => auth.skills)

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
    await sendRequest(joinTarget.value._id, request)
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
      await updateTeam(editingTeam.value._id, post)
    } else {
      await createTeam(post)
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
</script>

<template>
  <div class="p-2">

    <template v-if="auth._id">
      <TeamsHeader v-model="search" :has-new-requests="pendingIncoming > 0" @bell="activeTab = 'requests'" />

      <TeamsTabs v-model:tab="activeTab" :counts="tabCounts" @create="openCreate()" />

      <div v-if="status !== ''" class="alert alert-danger d-flex justify-content-between align-items-center py-2" role="alert">
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
                :matches="matchesByTeam[team._id]"
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
