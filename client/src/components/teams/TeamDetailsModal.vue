<script setup>
import { computed, nextTick, ref } from 'vue'
import TeamModal from './TeamModal.vue'
import TeamPeople from './TeamPeople.vue'
import JoinRequestFields from './JoinRequestFields.vue'
import { useUserStore } from '@/store/user'
import { formatDate } from '@/utils/date'
import { getDisplayName, getEventBadgeClass, sameSkill, joinChoices, startingJoinRole } from '@/utils/team'
import { assignRole, sendRequest, getErrorMessage } from '@/services/teamService'

// everything about one team: who is already in it (with their role and profile), how many more
// people it needs, and what skills it is looking for
const props = defineProps({
  team: { type: Object, required: true },
  canRequest: { type: Boolean, default: false }, // show "Request to join"
  startRequesting: { type: Boolean, default: false } // open with the request form already showing
})

// sent: the request went out (the page shows the "Request sent" toast)
const emit = defineEmits(['close', 'sent', 'invite', 'updated'])

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

// people in the team can reach each other: email everyone at once, or message someone on Telegram
const teammates = computed(() =>
  props.team.canContact ? props.team.members.map((member) => member.user).filter((user) => user._id !== auth._id) : []
)
const emailEveryone = computed(() => {
  const emails = teammates.value.map((user) => user.userName).filter(Boolean)
  return emails.length > 0 ? 'mailto:' + emails.join(',') + '?subject=' + encodeURIComponent(props.team.name) : ''
})
const onTelegram = computed(() => teammates.value.filter((user) => user.telegram))

// "Request to join" opens the request form right here, under the team, instead of a new window
const requesting = ref(false)
const role = ref('')
const message = ref('')
const shareProfile = ref(true)
const sending = ref(false)
const requestError = ref('')
const requestForm = ref(null)
const roleNeeded = computed(() => joinChoices(props.team).choices.length > 0 && role.value === '')
// me in the spot of the role I pick, while the form is open
const you = computed(() =>
  requesting.value ? { id: auth._id, name: auth.displayName ?? '', avatarUpdatedAt: auth.avatarUpdatedAt, role: role.value } : null
)

async function startRequest(pickedRole = '') {
  if (!requesting.value) role.value = startingJoinRole(props.team, auth.skills, pickedRole)
  else if (pickedRole) role.value = pickedRole
  requesting.value = true
  requestError.value = ''
  await nextTick()
  requestForm.value?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' })
}

async function sendJoinRequest() {
  sending.value = true
  requestError.value = ''
  try {
    const created = await sendRequest(props.team._id, { role: role.value, message: message.value, shareProfile: shareProfile.value })
    emit('sent', created)
  } catch (error) {
    requestError.value = getErrorMessage(error)
  }
  sending.value = false
}

if (props.startRequesting && props.canRequest) startRequest()
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
      :you="you"
      :saving-role="savingRole"
      :role-error="roleError"
      class="mb-4"
      @invite="$emit('invite', $event)"
      @assign-role="saveRole"
      @pick-role="role = $event"
    />

    <!-- people in the team: how to reach the others -->
    <section v-if="teammates.length > 0" class="contact-box rounded-3 p-3 mb-4" aria-labelledby="contact-title">
      <div class="d-flex flex-wrap align-items-center gap-2">
        <h3 id="contact-title" class="h6 fw-semibold mb-0 me-auto">
          <i class="bi bi-chat-dots me-1 text-primary" aria-hidden="true"></i>Contact your team
        </h3>
        <a v-if="emailEveryone" :href="emailEveryone" class="btn btn-sm btn-primary fw-semibold">
          <i class="bi bi-envelope me-1" aria-hidden="true"></i>Email everyone
        </a>
      </div>
      <div v-if="onTelegram.length > 0" class="d-flex flex-wrap gap-2 mt-2">
        <a
          v-for="user in onTelegram"
          :key="user._id"
          :href="'https://t.me/' + encodeURIComponent(user.telegram)"
          target="_blank"
          rel="noopener noreferrer"
          class="btn btn-sm btn-light fw-semibold"
        >
          <i class="bi bi-telegram me-1" aria-hidden="true"></i>{{ getDisplayName(user).split('@')[0] }}
        </a>
      </div>
      <p v-else class="text-caption text-body-secondary mt-2 mb-0">
        Add your Telegram on your profile so teammates can message you.
      </p>
      <p class="text-caption text-body-tertiary mt-2 mb-0">Only people in this team can see these.</p>
    </section>

    <!-- the request form slides open here when "Request to join" is pressed -->
    <Transition name="drop">
      <section v-if="requesting" ref="requestForm" class="request-form rounded-3 p-3 mb-4" aria-labelledby="request-form-title">
        <h3 id="request-form-title" class="h5 fw-semibold mb-3">
          <i class="bi bi-send me-1 text-primary" aria-hidden="true"></i>Ask to join {{ team.name }}
        </h3>
        <JoinRequestFields v-model:role="role" v-model:message="message" v-model:share-profile="shareProfile" :team="team" :error="requestError" />
      </section>
    </Transition>

    <template v-if="team.skills.length > 0 && !requesting">
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
      <template v-if="requesting">
        <button type="button" class="btn btn-light fw-semibold" :disabled="sending" @click="requesting = false">Back</button>
        <button type="button" class="btn btn-primary fw-semibold" :disabled="sending || roleNeeded" @click="sendJoinRequest">
          <i class="bi bi-send" aria-hidden="true"></i> {{ sending ? 'Sending...' : 'Send request' }}
        </button>
      </template>
      <template v-else>
        <button type="button" class="btn btn-light fw-semibold" @click="$emit('close')">Close</button>
        <button v-if="canRequest" type="button" class="btn btn-primary fw-semibold" @click="startRequest()">Request to join</button>
      </template>
    </template>
  </TeamModal>
</template>

<style scoped>
.contact-box {
  background-color: var(--bs-primary-bg-subtle);
  border: 1px solid var(--bs-primary-border-subtle);
}

.request-form {
  background-color: var(--bs-primary-bg-subtle);
  border: 1px solid var(--bs-primary-border-subtle);
}

/* the form drops down into place */
.drop-enter-active {
  transition: opacity 0.25s ease, transform 0.3s cubic-bezier(0.2, 0.9, 0.3, 1.1);
}
.drop-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}
@media (prefers-reduced-motion: reduce) {
  .drop-enter-active {
    transition: none;
  }
}

.team-progress {
  height: 10px;
  background-color: var(--bs-secondary-bg);
}
</style>
