<script setup>
import { ref } from 'vue'
import { getDisplayName, getInitials, getAvatarStyle, uniqueRoles } from '@/utils/team'

defineProps({
  incoming: { type: Array, required: true }, // people asking to join my teams
  invites: { type: Array, required: true }, // teams inviting me
  busyId: { type: String, default: '' },
  error: { type: String, default: '' }
})

// both emit (requestOrInvite, 'accepted' | 'declined'); accepting a request also sends the picked role
defineEmits(['answer-request', 'answer-invite'])

// the open roles of the request's team; the lead picks which one to accept them as
function openRolesOf(request) {
  return uniqueRoles(request.team?.openRoles ?? [])
}
// the role they asked for is no longer open (someone else filled it)
function askedRoleTaken(request) {
  const open = openRolesOf(request)
  return open.length > 0 && Boolean(request.role) && !open.some((role) => role.toLowerCase() === request.role.toLowerCase())
}
// the role each request will be accepted as: what they asked for while it's open, else the first open one
const chosenRoles = ref({})
function roleFor(request) {
  if (chosenRoles.value[request._id] !== undefined) return chosenRoles.value[request._id]
  const open = openRolesOf(request)
  if (open.length === 0) return ''
  return open.find((role) => role.toLowerCase() === String(request.role ?? '').toLowerCase()) ?? open[0]
}
function pickRole(request, role) {
  chosenRoles.value = { ...chosenRoles.value, [request._id]: role }
}
</script>

<template>
  <div class="card p-3 d-flex flex-column fill-card requests-card">
    <div class="d-flex justify-content-between align-items-center mb-2">
      <h2 class="h6 fw-semibold mb-0">Team requests</h2>
      <RouterLink to="/teams" class="small fw-semibold text-decoration-none">View all</RouterLink>
    </div>
    <p v-if="error" class="small text-tt-accent mb-2">{{ error }}</p>
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
          :disabled="busyId === invite._id"
          :aria-label="'Join ' + invite.team.name"
          title="Join team"
          @click="$emit('answer-invite', invite, 'accepted')"
        >
          <i class="bi bi-check-lg"></i>
        </button>
        <button
          class="btn btn-sm btn-outline-primary"
          :disabled="busyId === invite._id"
          :aria-label="'Decline invite to ' + invite.team.name"
          title="Decline"
          @click="$emit('answer-invite', invite, 'declined')"
        >
          <i class="bi bi-x-lg"></i>
        </button>
      </div>
      <div v-for="request in incoming" :key="request._id" class="d-flex flex-wrap align-items-center gap-2 py-1">
        <span
          class="request-avatar rounded-circle d-flex align-items-center justify-content-center small fw-semibold flex-shrink-0"
          :style="getAvatarStyle(getDisplayName(request.user))"
        >
          {{ getInitials(getDisplayName(request.user)) }}
        </span>
        <div class="request-text min-w-0 small lh-sm">
          <p class="mb-1">
            <span class="fw-semibold">{{ getDisplayName(request.user).split('@')[0] }}</span>
            wants to join <span class="fw-semibold">{{ request.team?.name }}</span>
          </p>
          <span v-if="openRolesOf(request).length === 0 && request.role" class="text-caption text-body-tertiary">as {{ request.role }}</span>
        </div>
        <button
          class="btn btn-sm btn-primary"
          :disabled="busyId === request._id"
          :aria-label="roleFor(request) || request.role ? 'Accept as ' + (roleFor(request) || request.role) : 'Accept request'"
          @click="$emit('answer-request', request, 'accepted', roleFor(request) || undefined)"
        >
          <i class="bi bi-check-lg"></i>
        </button>
        <button
          class="btn btn-sm btn-outline-primary"
          :disabled="busyId === request._id"
          aria-label="Decline request"
          @click="$emit('answer-request', request, 'declined')"
        >
          <i class="bi bi-x-lg"></i>
        </button>
        <!-- a team with open roles: pick which one to accept them as, right here -->
        <div v-if="openRolesOf(request).length > 0" class="request-role d-flex align-items-center gap-1 text-caption text-body-tertiary">
          as
          <select
            class="form-select form-select-sm role-select py-0"
            :value="roleFor(request)"
            :aria-label="'Role to accept ' + getDisplayName(request.user) + ' as'"
            @change="pickRole(request, $event.target.value)"
          >
            <option v-for="role in openRolesOf(request)" :key="role" :value="role">
              {{ role }}{{ role.toLowerCase() === String(request.role ?? '').toLowerCase() ? ' (asked)' : '' }}
            </option>
          </select>
        </div>
        <span v-if="askedRoleTaken(request)" class="request-role d-block text-caption text-tt-accent">{{ request.role }} was filled, pick another</span>
      </div>
    </div>
  </div>
</template>
