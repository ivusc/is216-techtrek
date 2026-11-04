<script setup>
import { computed } from 'vue'
import TeamModal from './TeamModal.vue'
import UserAvatar from '@/components/UserAvatar.vue'
import { getDisplayName } from '@/utils/team'

// asks "are you sure?" before a team lead deletes their team, and says what will happen
const props = defineProps({
  team: { type: Object, required: true },
  busy: { type: Boolean, default: false },
  error: { type: String, default: '' }
})

defineEmits(['close', 'confirm'])

const leaderId = computed(() => String(props.team.leader?._id ?? props.team.leader ?? ''))
// everyone in the team except me (the lead): they'll be told the team is gone
const teammates = computed(() => props.team.members.filter((member) => String(member.user._id) !== leaderId.value))
const teammatesText = computed(() =>
  teammates.value.length === 1
    ? '1 teammate is taken off the team and gets a notification.'
    : teammates.value.length + ' teammates are taken off the team and each get a notification.'
)
</script>

<template>
  <TeamModal :title="'Delete ' + team.name + '?'" :subtitle="team.event?.name ?? ''" width="480px" @close="$emit('close')">
    <div class="d-flex align-items-start gap-3 mb-3">
      <span class="warn-icon rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" aria-hidden="true">
        <i class="bi bi-trash3"></i>
      </span>
      <p class="mb-0">This removes your team for good. <strong>It can't be undone.</strong></p>
    </div>

    <ul class="what-happens list-unstyled rounded-3 p-3 mb-0 d-flex flex-column gap-2">
      <li class="d-flex gap-2">
        <i class="bi bi-eye-slash" aria-hidden="true"></i>
        <span>The post comes off Browse teams, so nobody new can ask to join.</span>
      </li>
      <li v-if="teammates.length > 0" class="d-flex gap-2">
        <i class="bi bi-people" aria-hidden="true"></i>
        <span class="min-w-0">
          {{ teammatesText }}
          <span class="d-flex mt-2 avatar-stack">
            <UserAvatar
              v-for="member in teammates.slice(0, 5)"
              :key="member.user._id"
              :user-id="member.user._id"
              :name="getDisplayName(member.user)"
              :avatar-updated-at="member.user.avatar?.updatedAt ?? ''"
              :size="28"
            />
          </span>
        </span>
      </li>
      <li class="d-flex gap-2">
        <i class="bi bi-envelope-x" aria-hidden="true"></i>
        <span>Requests and invites for this team are cancelled.</span>
      </li>
    </ul>

    <p v-if="error" class="small text-tt-accent mt-3 mb-0" role="alert">{{ error }}</p>

    <template #footer>
      <button type="button" class="btn btn-light fw-semibold" :disabled="busy" @click="$emit('close')">Keep team</button>
      <button type="button" class="btn btn-danger fw-semibold" :disabled="busy" @click="$emit('confirm')">
        <i class="bi bi-trash3 me-1" aria-hidden="true"></i>{{ busy ? 'Deleting...' : 'Delete team' }}
      </button>
    </template>
  </TeamModal>
</template>

<style scoped>
.warn-icon {
  width: 40px;
  height: 40px;
  font-size: 18px;
  color: var(--bs-danger);
  background-color: var(--bs-danger-bg-subtle);
}

.what-happens {
  font-size: 0.9375rem;
  background-color: var(--bs-secondary-bg);
}
.what-happens .bi {
  color: var(--bs-secondary-color);
  margin-top: 2px;
}
</style>
