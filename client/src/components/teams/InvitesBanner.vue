<script setup>
import { getDisplayName } from '@/utils/team'

// invites sent to me, shown at the top of the Teams page
defineProps({
  invites: { type: Array, required: true },
  busyId: { type: String, default: '' },
})

defineEmits(['answer'])
</script>

<template>
  <div class="d-flex flex-column gap-2 mb-3">
    <div
      v-for="invite in invites"
      :key="invite._id"
      class="invite-card d-flex flex-wrap align-items-center gap-3 rounded-3 p-3 bg-info-subtle"
    >
      <span class="size-40 bg-white rounded-3 d-flex justify-content-center align-items-center flex-shrink-0 text-primary">
        <i class="bi fs-5" :class="invite.askedRole ? 'bi-arrow-left-right' : 'bi-envelope-heart'" aria-hidden="true"></i>
      </span>
      <div class="flex-grow-1 min-w-0">
        <!-- my request, accepted into a different role than I asked for: I decide if I still want in -->
        <template v-if="invite.askedRole">
          <p class="fw-semibold mb-0">
            {{ getDisplayName(invite.team.leader) }} would take you into {{ invite.team.name }} as <span class="text-primary">{{ invite.role }}</span>
          </p>
          <p class="small text-body-secondary mb-0">
            You asked to be {{ invite.askedRole }}. Join in the new role, or say no and stay out of the team.
          </p>
        </template>
        <p v-else class="fw-semibold mb-0">
          {{ getDisplayName(invite.team.leader) }} invited you to join {{ invite.team.name }}<template v-if="invite.role"> as <span class="text-primary">{{ invite.role }}</span></template>
        </p>
        <p v-if="!invite.askedRole" class="small text-body-secondary mb-0">
          {{ invite.team.event?.name }}<template v-if="invite.message"> · "{{ invite.message }}"</template>
        </p>
      </div>
      <div class="d-flex gap-2">
        <button class="btn btn-sm btn-outline-primary fw-semibold" :disabled="busyId === invite._id" @click="$emit('answer', invite, 'declined')">
          Decline
        </button>
        <button class="btn btn-sm btn-primary fw-semibold" :disabled="busyId === invite._id" @click="$emit('answer', invite, 'accepted')">
          <i class="bi bi-check-lg" aria-hidden="true"></i> {{ invite.askedRole ? 'Join as ' + invite.role : 'Join team' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.invite-card {
  animation: invite-in 0.4s ease-out;
}
@keyframes invite-in {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .invite-card {
    animation: none;
  }
}
</style>
