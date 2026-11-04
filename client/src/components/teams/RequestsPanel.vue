<script setup>
import { computed, ref } from 'vue'
import {
  getDisplayName,
  getSchoolLine,
  timeAgo,
  uniqueRoles
} from '@/utils/team'
import { safeHttpUrl } from '@/utils/url'
import UserAvatar from '@/components/UserAvatar.vue'

const props = defineProps({
  incoming: { type: Array, required: true },
  sent: { type: Array, required: true },
  ledTeams: { type: Array, required: true },
  busyId: { type: String, default: '' }
})

const emit = defineEmits(['answer', 'withdraw', 'edit-team'])

// the open roles of the request's team (unique, in order)
function openRolesOf(request) {
  return uniqueRoles(request.team?.openRoles ?? [])
}

// the role each pending request will be accepted as: the one they asked for while it's still open,
// otherwise the team's first open role. The lead can change it before accepting.
const chosenRoles = ref({})
function roleFor(request) {
  if (chosenRoles.value[request._id] !== undefined) return chosenRoles.value[request._id]
  const open = openRolesOf(request)
  // a team without open roles takes them as they asked
  if (open.length === 0) return ''
  return open.find((role) => role.toLowerCase() === String(request.role ?? '').toLowerCase()) ?? open[0]
}
function pickRole(request, role) {
  chosenRoles.value = { ...chosenRoles.value, [request._id]: role }
}
// true when the role they asked for has been filled by someone else in the meantime
function askedRoleTaken(request) {
  const open = openRolesOf(request)
  return open.length > 0 && request.role && !open.some((role) => role.toLowerCase() === request.role.toLowerCase())
}

function accept(request) {
  emit('answer', request, 'accepted', roleFor(request) || undefined)
}

const openProfileId = ref('')

function toggleProfile(request) {
  openProfileId.value = openProfileId.value === request._id ? '' : request._id
}

const sortedIncoming = computed(() => {
  const pending = props.incoming.filter((request) => request.status === 'pending')
  const answered = props.incoming.filter((request) => request.status !== 'pending')
  return [...pending, ...answered]
})

const pendingCount = computed(() => props.incoming.filter((request) => request.status === 'pending').length)

function getSkills(request) {
  return request.user.skills ?? []
}

const statusClass = {
  pending: 'bg-warning-subtle text-warning-emphasis',
  accepted: 'bg-success-subtle text-success-emphasis',
  declined: 'bg-danger-subtle text-danger-emphasis'
}

const statusLabel = { pending: 'Pending', accepted: 'Accepted', declined: 'Declined' }
</script>

<template>
  <div class="row g-4 align-items-start">

    <div class="col-12 col-lg-8">
      <div class="d-flex align-items-center gap-2 mb-2">
        <h2 class="h3 mb-0">Incoming</h2>
        <span v-if="pendingCount > 0" class="badge rounded-pill fw-medium bg-danger-subtle text-tt-accent">{{ pendingCount }} new</span>
      </div>

      <p v-if="incoming.length === 0" class="text-body-secondary small mb-4">
        No requests yet. People who ask to join the teams you lead will show up here.
      </p>

      <div v-for="request in sortedIncoming" :key="request._id" class="card p-3 mb-3">
        <div class="d-flex gap-3">
          <UserAvatar :user-id="request.user._id" :name="getDisplayName(request.user)" :avatar-updated-at="request.user.avatar?.updatedAt" :size="40" />
          <div class="flex-grow-1 min-w-0">
            <div class="d-flex justify-content-between gap-2">
              <p class="mb-0">
                <strong>{{ getDisplayName(request.user) }}</strong>
                <span class="text-body-secondary"> wants to join </span>
                <strong class="text-primary">{{ request.team.name }}</strong>
              </p>
              <span class="text-caption text-body-tertiary text-nowrap">{{ timeAgo(request.createdAt) }}</span>
            </div>
            <p v-if="getSchoolLine(request.user) !== ''" class="text-caption text-body-tertiary mb-1">{{ getSchoolLine(request.user) }}</p>
            <p v-if="request.role" class="mb-0">
              <span class="asked-role badge rounded-pill fw-semibold">
                <i class="bi bi-person-badge me-1" aria-hidden="true"></i>{{ request.status === 'accepted' ? 'Joined as' : 'Asking to be' }} {{ request.role }}
              </span>
            </p>
          </div>
        </div>

        <p v-if="request.message" class="small bg-body-secondary rounded-3 p-3 my-3">“{{ request.message }}”</p>

        <!-- pick which open role to accept them into -->
        <div v-if="request.status === 'pending' && openRolesOf(request).length > 0" class="role-pick rounded-3 p-2 mb-3" :class="{ 'mt-3': !request.message }">
          <label :for="'accept-role-' + request._id" class="small fw-semibold mb-1">Accept them as</label>
          <select
            :id="'accept-role-' + request._id"
            class="form-select form-select-sm"
            :value="roleFor(request)"
            @change="pickRole(request, $event.target.value)"
          >
            <option v-for="role in openRolesOf(request)" :key="role" :value="role">
              {{ role }}{{ role.toLowerCase() === String(request.role ?? '').toLowerCase() ? ' (what they asked for)' : '' }}
            </option>
          </select>
          <p v-if="askedRoleTaken(request)" class="text-caption text-tt-accent mt-1 mb-0">
            {{ request.role }} has been filled, so pick another open role for them.
          </p>
        </div>

        <div class="d-flex justify-content-between align-items-center flex-wrap gap-2" :class="{ 'mt-3': !request.message && !(request.status === 'pending' && openRolesOf(request).length > 0) }">
          <div class="d-flex flex-wrap gap-1">
            <span v-for="skill in getSkills(request)" :key="skill" class="badge rounded-pill fw-normal border bg-transparent text-body">{{ skill }}</span>
          </div>

          <div class="d-flex align-items-center gap-2">
            <button class="btn btn-sm btn-link fw-semibold text-decoration-none" @click="toggleProfile(request)">View profile</button>
            <template v-if="request.status === 'pending'">
              <button class="btn btn-sm btn-outline-primary fw-semibold" :disabled="busyId === request._id" @click="$emit('answer', request, 'declined')">Decline</button>
              <button class="btn btn-sm btn-primary fw-semibold" :disabled="busyId === request._id" @click="accept(request)">
                <i class="bi bi-check2"></i> {{ roleFor(request) ? 'Accept as ' + roleFor(request) : 'Accept' }}
              </button>
            </template>
            <span v-else class="badge rounded-pill fw-medium" :class="statusClass[request.status]">{{ statusLabel[request.status] }}</span>
          </div>
        </div>

        <div v-if="openProfileId === request._id" class="small border-top mt-3 pt-3">
          <template v-if="request.shareProfile">
            <p class="mb-1">
              <i class="bi bi-github me-1"></i>
              <a v-if="safeHttpUrl(request.user.githubUrl)" :href="safeHttpUrl(request.user.githubUrl)" target="_blank" rel="noopener noreferrer">{{ request.user.githubUrl }}</a>
              <span v-else class="text-body-tertiary">No GitHub added</span>
            </p>
            <p class="mb-0">
              <i class="bi bi-linkedin me-1"></i>
              <a v-if="safeHttpUrl(request.user.linkedinUrl)" :href="safeHttpUrl(request.user.linkedinUrl)" target="_blank" rel="noopener noreferrer">{{ request.user.linkedinUrl }}</a>
              <span v-else class="text-body-tertiary">No LinkedIn added</span>
            </p>
          </template>
          <p v-else class="text-body-tertiary mb-0">This person chose not to share their profile.</p>
        </div>
      </div>

      <h2 class="h3 mt-4 mb-2">Sent by you</h2>
      <p v-if="sent.length === 0" class="text-body-secondary small mb-0">You have not asked to join any team yet.</p>

      <div v-if="sent.length > 0" class="card p-2">
        <div v-for="(request, index) in sent" :key="request._id" class="d-flex align-items-center gap-3 p-2" :class="{ 'border-top': index > 0 }">
          <UserAvatar :name="request.team.name" :size="40" square />
          <div class="flex-grow-1 min-w-0">
            <p class="fw-semibold mb-0 text-truncate">{{ request.team.name }} · {{ request.team.event.name }}</p>
            <p class="text-caption text-body-tertiary mb-0">
              <template v-if="request.role">Requested as {{ request.role }} · </template>{{ timeAgo(request.createdAt) }}
            </p>
          </div>
          <span class="badge rounded-pill fw-medium" :class="statusClass[request.status]">{{ statusLabel[request.status] }}</span>
          <button
            v-if="request.status === 'pending'"
            class="btn btn-sm btn-link fw-semibold text-decoration-none"
            :disabled="busyId === request._id"
            @click="$emit('withdraw', request)"
          >
            Withdraw
          </button>
        </div>
      </div>
    </div>

    <div class="col-12 col-lg-4">
      <div v-for="team in ledTeams" :key="team._id" class="card p-3 mb-3">
        <div class="d-flex justify-content-between align-items-center gap-2 mb-1">
          <h3 class="h3 mb-0 text-truncate">{{ team.name }}</h3>
          <span class="badge rounded-pill fw-medium bg-tt-peach text-body text-truncate mw-50">{{ team.event.name }}</span>
        </div>
        <p class="text-caption text-body-tertiary mb-3">You're the team leader</p>

        <div class="d-flex justify-content-between small mb-1">
          <span class="text-body-secondary">Team filled</span>
          <strong>{{ team.teamSize - team.slotsOpen }} / {{ team.teamSize }}</strong>
        </div>
        <div class="progress mb-3" role="progressbar" :aria-valuenow="team.teamSize - team.slotsOpen" aria-valuemin="0" :aria-valuemax="team.teamSize">
          <div class="progress-bar bg-info" :style="{ width: ((team.teamSize - team.slotsOpen) / team.teamSize) * 100 + '%' }"></div>
        </div>

        <div v-for="member in team.members" :key="member.user._id" class="d-flex align-items-center gap-2 mb-2">
          <UserAvatar :user-id="member.user._id" :name="getDisplayName(member.user)" :avatar-updated-at="member.user.avatar?.updatedAt" :size="32" />
          <div class="min-w-0">
            <p class="small fw-semibold mb-0 text-truncate">
              {{ getDisplayName(member.user) }}<template v-if="member.user._id === team.leader._id"> (you)</template>
            </p>
            <p class="text-caption text-body-tertiary mb-0">
              {{ member.role || 'Member' }}<template v-if="member.user._id === team.leader._id"> · Leader</template>
            </p>
          </div>
        </div>

        <p v-if="team.externalMembers > 0" class="text-caption text-body-tertiary mb-2">
          + {{ team.externalMembers }} {{ team.externalMembers === 1 ? 'teammate' : 'teammates' }} not on TechTrek
        </p>

        <div v-for="slot in team.slotsOpen" :key="'slot-' + slot" class="open-slot d-flex align-items-center gap-2 small text-body-secondary rounded-3 p-2 mb-2">
          <i class="bi bi-person-plus"></i>
          <template v-if="team.openRoles?.[slot - 1]"><span class="fw-semibold text-primary">{{ team.openRoles[slot - 1] }}</span> · open role</template>
          <template v-else>Open slot<template v-if="team.skills.length > 0"> · {{ team.skills.slice(0, 2).join(' or ') }}</template></template>
        </div>

        <button class="btn btn-sm btn-light fw-semibold align-self-start mt-1" @click="$emit('edit-team', team)">Edit team post</button>
      </div>

      <p v-if="ledTeams.length === 0" class="small text-body-secondary">Teams you lead will show up here, with their members and open slots.</p>

      <div class="d-flex gap-2 bg-info-subtle text-primary-emphasis small rounded-3 p-3">
        <i class="bi bi-lightbulb"></i>
        <span>Accepting a request adds the person to your team and fills one of your open slots.</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.asked-role {
  color: var(--tt-chip-text);
  background-color: var(--tt-chip-bg);
  border: 1px solid var(--tt-chip-border);
}
.role-pick {
  background-color: var(--bs-primary-bg-subtle);
}
</style>
