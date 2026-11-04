<script setup>
import { computed, ref } from 'vue'
import TeamModal from './TeamModal.vue'
import TeamPeople from './TeamPeople.vue'
import { useUserStore } from '@/store/user'
import { formatDate } from '@/utils/date'
import { getDisplayName, getEventBadgeClass, sameSkill } from '@/utils/team'
import { assignRole, getErrorMessage } from '@/services/teamService'

// everything about one team: who is already in it (with their role and profile), how many more
// people it needs, and what skills it is looking for
const props = defineProps({
  team: { type: Object, required: true },
  canRequest: { type: Boolean, default: false } // show "Request to join"
})

const emit = defineEmits(['close', 'request', 'invite', 'updated'])

const filled = computed(() => props.team.teamSize - props.team.slotsOpen)

const neededText = computed(() => {
  if (props.team.slotsOpen === 0) return 'Team is full'
  return props.team.slotsOpen === 1 ? '1 more person needed' : props.team.slotsOpen + ' more people needed'
})

// the lead gives someone a role: save it, then hand the updated team to the page
const savingRole = ref(false)
const roleError = ref('')
async function saveRole({ userId, role }) {
  savingRole.value = true
  roleError.value = ''
  try {
    emit('updated', await assignRole(props.team._id, userId, role))
  } catch (error) {
    roleError.value = getErrorMessage(error)
  }
  savingRole.value = false
}

// wanted skills I have (from my profile) get a tick
const auth = useUserStore()
function isMine(skill) {
  return auth.skills.some((mine) => sameSkill(mine, skill))
}
</script>

<template>
  <TeamModal :title="team.name" :subtitle="'Led by ' + getDisplayName(team.leader)" width="640px" @close="$emit('close')">
    <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
      <span class="badge rounded-pill fw-medium" :class="getEventBadgeClass(team.event.name)">{{ team.event.name }}</span>
      <span v-if="team.event.location" class="text-caption text-body-secondary"><i class="bi bi-geo-alt me-1" aria-hidden="true"></i>{{ team.event.location }}</span>
      <span v-if="team.closesAt" class="text-caption text-body-secondary ms-auto">Closes {{ formatDate(team.closesAt) }}</span>
    </div>

    <p class="mb-4">{{ team.pitch }}</p>

    <!-- how full the team is -->
    <div class="mb-4">
      <div class="d-flex justify-content-between align-items-baseline mb-1">
        <span class="fw-semibold">{{ filled }} of {{ team.teamSize }} spots filled</span>
        <span class="small fw-semibold" :class="team.slotsOpen > 0 ? 'text-primary' : 'text-body-secondary'">{{ neededText }}</span>
      </div>
      <div class="progress team-progress" role="progressbar" :aria-valuenow="filled" aria-valuemin="0" :aria-valuemax="team.teamSize" :aria-label="filled + ' of ' + team.teamSize + ' spots filled'">
        <div class="progress-bar" :style="{ width: (filled / team.teamSize) * 100 + '%' }"></div>
      </div>
    </div>

    <h3 class="h5 fw-semibold mb-3">Who's in the team</h3>
    <TeamPeople
      :team="team"
      :saving-role="savingRole"
      :role-error="roleError"
      class="mb-4"
      @invite="$emit('invite', $event)"
      @assign-role="saveRole"
    />

    <template v-if="team.skills.length > 0">
      <h3 class="h5 fw-semibold mb-2">Skills they're looking for</h3>
      <div class="d-flex flex-wrap gap-2">
        <span
          v-for="skill in team.skills"
          :key="skill"
          class="badge rounded-pill fw-medium border"
          :class="isMine(skill) ? 'bg-primary-subtle text-primary-emphasis border-primary-subtle' : 'bg-transparent text-body'"
        >
          <i v-if="isMine(skill)" class="bi bi-check-lg me-1" aria-hidden="true"></i>{{ skill }}
        </span>
      </div>
      <p v-if="team.skills.some(isMine)" class="text-caption text-body-secondary mt-2 mb-0">Ticked skills match your profile.</p>
    </template>

    <template #footer>
      <button type="button" class="btn btn-light fw-semibold" @click="$emit('close')">Close</button>
      <button v-if="canRequest" type="button" class="btn btn-primary fw-semibold" @click="$emit('request')">Request to join</button>
    </template>
  </TeamModal>
</template>

<style scoped>
.team-progress {
  height: 10px;
  background-color: var(--bs-secondary-bg);
}
</style>
