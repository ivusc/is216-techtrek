<script setup>
import { ref, computed, onMounted } from 'vue'
import { fetchTeams, fetchMyTeams, createTeam, getErrorMessage } from '@/services/teamService'
import { isClosed } from '@/utils/opportunity'
import { useUserStore } from '@/store/user'
import { useOpportunityStore } from '@/store/opportunity'
import { useJoinRequests } from '@/composables/useJoinRequests'
import TeamCard from '@/components/teams/TeamCard.vue'
import JoinRequestModal from '@/components/teams/JoinRequestModal.vue'
import RequestSentToast from '@/components/teams/RequestSentToast.vue'
import TrekLoader from '@/components/TrekLoader.vue'
import CreateTeamModal from '@/components/teams/CreateTeamModal.vue'
import TeamCreatedCelebration from '@/components/teams/TeamCreatedCelebration.vue'
import InviteFriendsModal from '@/components/teams/InviteFriendsModal.vue'

// side panel on Opportunities: the teams for one hackathon, so people can ask to join without leaving the page
const props = defineProps({
  item: { type: Object, required: true }, // the hackathon
})

defineEmits(['close'])

const auth = useUserStore()
const opportunityStore = useOpportunityStore()

const teams = ref([])
const myTeams = ref([]) // my own teams for this hackathon (the browse list leaves them out)
const isLoading = ref(true)
const loadError = ref('')

// teams are linked to a hackathon by its title, the same way the Teams page filters by event
async function loadTeams() {
  loadError.value = ''
  try {
    const [all, mine] = await Promise.all([fetchTeams(), fetchMyTeams()])
    teams.value = all.filter((team) => team.event.name === props.item.title)
    myTeams.value = mine.filter((team) => team.event.name === props.item.title)
  } catch (error) {
    console.error(error)
    loadError.value = 'Could not load teams right now.'
  }
  isLoading.value = false
}

onMounted(loadTeams)

const { joinTarget, joinError, isSending, sentToast, undoingId, undoError, openJoin, closeJoin, submitJoin, requestSent, undoRequest } =
  useJoinRequests(async () => {
    await loadTeams()
    opportunityStore.fetchTeamCounts()
  })

// teams with space first, then the full ones
const sortedTeams = computed(() => [...teams.value].sort((a, b) => (b.slotsOpen > 0) - (a.slotsOpen > 0)))
const openCount = computed(() => teams.value.filter((team) => team.slotsOpen > 0).length)

const teamsLink = computed(() => ({ path: '/teams', query: { event: props.item.title } }))

// "Start a team": the create form, already set to this hackathon
const showCreate = ref(false)
const createError = ref('')
const isCreating = ref(false)
const openEvents = computed(() => opportunityStore.hackathons.filter((event) => !isClosed(event)))

async function submitCreate(post) {
  isCreating.value = true
  createError.value = ''
  try {
    const created = await createTeam(post)
    showCreate.value = false
    if (post.status !== 'draft') {
      celebrateTeam.value = created
    }
    await loadTeams()
    opportunityStore.fetchTeamCounts()
  } catch (error) {
    console.error(error)
    createError.value = getErrorMessage(error)
  }
  isCreating.value = false
}

// after publishing: the celebration, then maybe the invite pop-up
const celebrateTeam = ref(null)
const inviteTeam = ref(null)
const inviteRole = ref('') // the open role the invite is for, when it came from a role's open spot
function inviteFromCelebration() {
  inviteRole.value = ''
  inviteTeam.value = celebrateTeam.value
  celebrateTeam.value = null
}
</script>

<template>
  <!-- dark background behind the panel, clicking it closes the panel -->
  <div class="offcanvas-backdrop fade show" @click="$emit('close')"></div>

  <div class="offcanvas offcanvas-end show details-drawer" role="dialog" aria-labelledby="find-team-title">
    <div class="details-body">
      <div class="d-flex align-items-center gap-2">
        <span class="text-overline text-body-tertiary flex-grow-1">Find a team</span>
        <button class="btn bg-white details-icon-btn" type="button" title="Close" aria-label="Close" @click="$emit('close')">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>

      <div class="d-flex align-items-center gap-3">
        <div class="details-logo bg-tt-peach d-flex justify-content-center align-items-center fw-semibold">
          {{ item.organisation?.slice(0, 2).toUpperCase() }}
        </div>
        <div class="min-w-0">
          <h2 id="find-team-title" class="h4 mb-1">{{ item.title }}</h2>
          <p class="text-body-secondary small mb-0">
            <template v-if="isLoading">Looking for teams…</template>
            <template v-else-if="openCount > 0">{{ openCount }} {{ openCount === 1 ? 'team is' : 'teams are' }} looking for members</template>
            <template v-else>No teams are looking for members yet</template>
          </p>
        </div>
      </div>

      <TrekLoader
        v-if="isLoading"
        compact
        title="Finding teams"
        :captions="['Checking who needs teammates…', 'Matching skills…']"
      />

      <p v-else-if="loadError" class="text-tt-accent mb-0">{{ loadError }}</p>

      <!-- my own teams for this hackathon, so I can invite friends to them -->
      <section v-if="!isLoading && myTeams.length > 0" class="d-flex flex-column gap-3">
        <p class="text-overline text-body-tertiary mb-0">YOUR {{ myTeams.length === 1 ? 'TEAM' : 'TEAMS' }}</p>
        <TeamCard
          v-for="team in myTeams"
          :key="team._id"
          :team="team"
          mode="mine"
          @invite="(role) => { inviteRole = typeof role === 'string' ? role : ''; inviteTeam = team }"
          @updated="(updated) => (myTeams[myTeams.findIndex((mine) => mine._id === updated._id)] = updated)"
          @edit="$router.push('/teams')"
          @view-requests="$router.push('/teams')"
        />
      </section>

      <!-- a new v-if chain, so having your own team does not hide everyone else's -->
      <div
        v-if="!isLoading && !loadError && teams.length === 0 && myTeams.length === 0"
        class="text-center bg-white rounded-4 p-4"
      >
        <i class="bi bi-people fs-1 text-primary" aria-hidden="true"></i>
        <p class="fw-semibold mt-2 mb-1">Be the first team for this hackathon</p>
        <p class="small text-body-secondary mb-3">Post your team and people with the skills you need can ask to join.</p>
        <button type="button" class="btn btn-primary fw-semibold" @click="showCreate = true">
          <i class="bi bi-plus-lg"></i> Start a team
        </button>
      </div>

      <template v-else-if="teams.length > 0">
        <p v-if="undoError" class="small text-tt-accent mb-0" role="alert">{{ undoError }}</p>
        <div class="d-flex flex-column gap-3">
          <TeamCard
            v-for="team in sortedTeams"
            :key="team._id"
            :team="team"
            :my-skills="auth.skills"
            :undoing="undoingId === team.requestId"
            @request-sent="(created) => requestSent(team, created)"
            @undo="undoRequest(team.requestId, team)"
          />
        </div>
      </template>
    </div>

    <div class="details-footer d-flex justify-content-end border-top">
      <button type="button" class="btn btn-primary fw-semibold details-btn" @click="showCreate = true">
        <i class="bi bi-plus-lg"></i> Start a team
      </button>
      <RouterLink :to="teamsLink" class="btn btn-outline-primary fw-semibold details-btn">
        Open in Teams <i class="bi bi-arrow-right"></i>
      </RouterLink>
    </div>
  </div>

  <JoinRequestModal
    v-if="joinTarget"
    :team="joinTarget"
    :my-skills="auth.skills"
    :busy="isSending"
    :error="joinError"
    @close="closeJoin"
    @submit="submitJoin"
  />

  <CreateTeamModal
    v-if="showCreate"
    :events="openEvents"
    :initial-event="item.title"
    :busy="isCreating"
    :error="createError"
    @close="showCreate = false"
    @submit="submitCreate"
  />

  <TeamCreatedCelebration
    v-if="celebrateTeam"
    :team-name="celebrateTeam.name"
    :event-name="celebrateTeam.event?.name"
    @invite="inviteFromCelebration"
    @close="celebrateTeam = null"
  />

  <InviteFriendsModal v-if="inviteTeam" :team="inviteTeam" :initial-role="inviteRole" @close="inviteTeam = null" />

  <RequestSentToast
    v-if="sentToast"
    :key="sentToast.requestId"
    :team-name="sentToast.teamName"
    :busy="undoingId === sentToast.requestId"
    @undo="undoRequest(sentToast.requestId, sentToast.team)"
    @close="sentToast = null"
  />
</template>
