<script setup>
import TeamModal from './TeamModal.vue'

// asks "are you sure?" before a member leaves a team
defineProps({
  team: { type: Object, required: true },
  busy: { type: Boolean, default: false },
  error: { type: String, default: '' }
})

defineEmits(['close', 'confirm'])
</script>

<template>
  <TeamModal :title="'Leave ' + team.name + '?'" :subtitle="team.event?.name ?? ''" width="460px" @close="$emit('close')">
    <p class="mb-2">
      You'll be taken off the team and your spot opens up for someone else.
      The team lead gets a notification that you left.
    </p>
    <p class="small text-body-secondary mb-0">You can ask to join again later if the team still has space.</p>
    <p v-if="error" class="small text-tt-accent mt-3 mb-0" role="alert">{{ error }}</p>

    <template #footer>
      <button type="button" class="btn btn-light fw-semibold" :disabled="busy" @click="$emit('close')">Stay in team</button>
      <button type="button" class="btn btn-danger fw-semibold" :disabled="busy" @click="$emit('confirm')">
        <i class="bi bi-box-arrow-left me-1" aria-hidden="true"></i>{{ busy ? 'Leaving...' : 'Leave team' }}
      </button>
    </template>
  </TeamModal>
</template>
