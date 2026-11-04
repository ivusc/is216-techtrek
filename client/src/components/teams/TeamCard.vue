<script setup>
import { computed, ref } from 'vue'
import { formatDate } from '@/utils/date'
import {
  getDisplayName,
  getSchoolLine,
  getSlotsText,
  getEventBadgeClass,
  getClosesInDays,
  sameSkill
} from '@/utils/team'
import UserAvatar from '@/components/UserAvatar.vue'
import SuggestedTeammates from './SuggestedTeammates.vue'
import TeamDetailsModal from './TeamDetailsModal.vue'

const props = defineProps({
  team: { type: Object, required: true },
  mode: { type: String, default: 'browse' },
  mySkills: { type: Array, default: () => [] },
  matches: { type: Array, default: null },
  undoing: { type: Boolean, default: false } // true while this team's request is being withdrawn
})

const emit = defineEmits(['request', 'undo', 'edit', 'view-requests', 'invite', 'leave', 'updated'])

// on Browse, a team I can still join can be asked to join
const canRequest = computed(() => props.mode === 'browse' && props.team.requestStatus === null && props.team.slotsOpen > 0)

// clicking the card (anywhere but its buttons) opens the team's details: members, roles and open spots
const showDetails = ref(false)
function onCardClick(event) {
  if (event.target.closest('button, a, input, select')) return
  showDetails.value = true
}

// the details window hands its buttons to the page: close it, then open the request or invite window
function fromDetails(action) {
  showDetails.value = false
  emit(action)
}

function isMatch(skill) {
  return props.mySkills.some((mine) => sameSkill(mine, skill))
}

function isUrgent() {
  const days = getClosesInDays(props.team)
  return days !== null && days <= 3
}
</script>

<template>
  <div
    class="card card-hover p-3 h-100"
    tabindex="0"
    :aria-label="'See who is in ' + team.name"
    @click="onCardClick"
    @keydown.enter.self="showDetails = true"
  >

    <div class="d-flex justify-content-between align-items-center gap-2 mb-2">
      <span class="badge rounded-pill fw-medium text-truncate mw-100" :class="getEventBadgeClass(team.event.name)">
        {{ team.event.name }}
      </span>
      <span v-if="team.closesAt" class="text-caption text-nowrap" :class="isUrgent() ? 'text-tt-accent' : 'text-body-tertiary'">
        Closes {{ formatDate(team.closesAt) }}
      </span>
    </div>

    <h3 class="h3 fw-semibold mb-1">{{ team.name }}</h3>
    <p class="text-caption text-body-tertiary mb-2">
      Led by {{ getDisplayName(team.leader) }}
      <template v-if="getSchoolLine(team.leader) !== ''"> · {{ getSchoolLine(team.leader) }}</template>
    </p>

    <p class="small text-body-secondary mb-3">{{ team.pitch }}</p>

    <div v-if="(team.openRoles ?? []).length > 0" class="mb-2">
      <p class="text-overline text-body-tertiary mb-1">OPEN ROLES</p>
      <div class="d-flex flex-wrap gap-1">
        <span v-for="(role, index) in team.openRoles" :key="role + index" class="badge rounded-pill fw-semibold open-role-chip">
          <i class="bi bi-person-plus me-1" aria-hidden="true"></i>{{ role }}
        </span>
      </div>
    </div>

    <div v-if="team.skills.length > 0" class="mb-3">
      <p class="text-overline text-body-tertiary mb-1">LOOKING FOR</p>
      <div class="d-flex flex-wrap gap-1">
        <span
          v-for="skill in team.skills"
          :key="skill"
          class="badge rounded-pill fw-normal border"
          :class="isMatch(skill) ? 'bg-primary-subtle text-primary-emphasis border-primary-subtle' : 'bg-transparent text-body'"
        >
          {{ skill }}
        </span>
      </div>
    </div>

    <div v-if="mode === 'mine'" class="d-flex flex-wrap gap-1 mb-3">
      <span class="badge rounded-pill fw-medium bg-primary-subtle text-primary-emphasis">{{ team.isLeader ? 'Leader' : 'Member' }}</span>
      <span v-if="team.status === 'draft'" class="badge rounded-pill fw-medium bg-body-secondary text-body-secondary">Draft</span>
      <span v-else-if="team.status === 'closed'" class="badge rounded-pill fw-medium bg-body-secondary text-body-secondary">Team full</span>
    </div>

    <SuggestedTeammates v-if="mode === 'mine' && team.isLeader && matches" :matches="matches" class="mb-3" />

    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 pt-3 mt-auto border-top">
      <div class="d-flex align-items-center gap-2">
        <div class="avatar-stack d-flex">
          <UserAvatar v-for="member in team.members.slice(0, 4)" :key="member.user._id" :user-id="member.user._id" :name="getDisplayName(member.user)" :avatar-updated-at="member.user.avatar?.updatedAt" :size="28" />
        </div>
        <span class="text-caption text-body-secondary">{{ getSlotsText(team) }}</span>
      </div>

      <!-- a pending request can be taken back -->
      <div v-if="mode === 'browse' && team.requestStatus === 'pending'" class="d-flex align-items-center gap-2">
        <span class="badge rounded-pill bg-info-subtle text-primary-emphasis fw-medium d-inline-flex align-items-center gap-1 py-2 px-3">
          <i class="bi bi-send-check" aria-hidden="true"></i> Request sent
        </span>
        <button class="btn btn-sm btn-outline-primary fw-semibold" :disabled="undoing" @click="$emit('undo')">
          {{ undoing ? 'Undoing...' : 'Undo' }}
        </button>
      </div>

      <button
        v-else-if="mode === 'browse'"
        class="btn btn-sm fw-semibold text-nowrap"
        :class="team.requestStatus === null && team.slotsOpen > 0 ? 'btn-primary' : 'btn-light'"
        :disabled="team.requestStatus !== null || team.slotsOpen === 0"
        @click="$emit('request')"
      >
        <template v-if="team.requestStatus === 'declined'">Request declined</template>
        <template v-else-if="team.requestStatus === 'accepted'">You're in!</template>
        <template v-else-if="team.slotsOpen === 0">Team full</template>
        <template v-else>Request to join</template>
      </button>

      <div v-else-if="team.isLeader" class="d-flex gap-2">
        <button
          v-if="team.status === 'open' && team.slotsOpen > 0"
          class="btn btn-sm btn-outline-primary fw-semibold"
          @click="$emit('invite')"
        >
          <i class="bi bi-person-plus" aria-hidden="true"></i> Invite
        </button>
        <button v-if="team.status !== 'draft'" class="btn btn-sm btn-light fw-semibold" @click="$emit('view-requests')">Requests</button>
        <button class="btn btn-sm btn-primary fw-semibold" @click="$emit('edit')">Edit post</button>
      </div>

      <!-- members (not the lead) can leave -->
      <button v-else-if="mode === 'mine'" class="btn btn-sm btn-outline-danger fw-semibold" @click="$emit('leave')">
        <i class="bi bi-box-arrow-left" aria-hidden="true"></i> Leave team
      </button>
    </div>

    <!-- teleported to the page body so the card's hover lift doesn't move the window -->
    <Teleport to="body">
      <TeamDetailsModal
        v-if="showDetails"
        :team="team"
        :can-request="canRequest"
        @close="showDetails = false"
        @request="fromDetails('request')"
        @invite="fromDetails('invite')"
        @updated="$emit('updated', $event)"
      />
    </Teleport>
  </div>
</template>

<style scoped>
/* open roles: a soft lavender, a step stronger than the matched-skill chips below */
.open-role-chip {
  color: var(--tt-chip-text);
  background-color: var(--tt-chip-bg);
  border: 1px solid var(--tt-chip-border);
}
</style>
