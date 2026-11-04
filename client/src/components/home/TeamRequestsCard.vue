<script setup>
import { getDisplayName, getInitials, getAvatarStyle } from '@/utils/team'

defineProps({
  incoming: { type: Array, required: true }, // people asking to join my teams
  invites: { type: Array, required: true }, // teams inviting me
  busyId: { type: String, default: '' },
  error: { type: String, default: '' }
})

// both emit (requestOrInvite, 'accepted' | 'declined')
defineEmits(['answer-request', 'answer-invite'])
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
          :disabled="busyId === request._id"
          aria-label="Accept request"
          @click="$emit('answer-request', request, 'accepted')"
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
      </div>
    </div>
  </div>
</template>
