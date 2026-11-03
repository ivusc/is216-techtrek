<script setup>
import { ref, computed, onMounted } from 'vue'
import TeamModal from './TeamModal.vue'
import { inviteToTeam, fetchTeamInvites, cancelInvite, getErrorMessage } from '@/services/teamService'
import { getDisplayName } from '@/utils/team'

// for a team lead: invite friends by SMU email, or share a link that opens the team's join form
const props = defineProps({
  team: { type: Object, required: true },
})

defineEmits(['close'])

// the Teams page opens the join form for ?team=<id>
const inviteLink = computed(() => window.location.origin + '/teams?team=' + props.team._id)
const copied = ref(false)

async function copyLink() {
  try {
    await navigator.clipboard.writeText(inviteLink.value)
  } catch {
    // older browsers: select the text so it can be copied by hand
    document.getElementById('invite-link')?.select()
    return
  }
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}

const email = ref('')
const message = ref('')
const isSending = ref(false)
const error = ref('')
const justSent = ref('') // name of the last person invited, for the "Invite sent" line

const invites = ref([])
const busyId = ref('')

async function loadInvites() {
  try {
    invites.value = await fetchTeamInvites(props.team._id)
  } catch (err) {
    console.error(err)
  }
}
onMounted(loadInvites)

async function sendInvite() {
  error.value = ''
  justSent.value = ''
  const address = email.value.trim().toLowerCase()
  if (!/^[^@\s]+@smu\.edu\.sg$/.test(address)) {
    error.value = "Type your friend's @smu.edu.sg email."
    return
  }
  isSending.value = true
  try {
    const created = await inviteToTeam(props.team._id, { userName: address, message: message.value.trim() })
    justSent.value = getDisplayName(created.user)
    email.value = ''
    message.value = ''
    await loadInvites()
  } catch (err) {
    error.value = getErrorMessage(err)
  }
  isSending.value = false
}

async function cancel(invite) {
  busyId.value = invite._id
  try {
    await cancelInvite(invite._id)
    await loadInvites()
  } catch (err) {
    error.value = getErrorMessage(err)
  }
  busyId.value = ''
}

const statusStyle = {
  pending: { label: 'Invited', css: 'bg-info-subtle text-primary-emphasis' },
  accepted: { label: 'Joined', css: 'bg-success-subtle text-success-emphasis' },
  declined: { label: 'Declined', css: 'bg-body-secondary text-body-secondary' },
}
</script>

<template>
  <TeamModal
    :title="'Invite friends to ' + team.name"
    :subtitle="team.slotsOpen + (team.slotsOpen === 1 ? ' slot' : ' slots') + ' open'"
    width="560px"
    @close="$emit('close')"
  >
    <div class="d-flex flex-column gap-4">
      <section>
        <label for="invite-link" class="small fw-semibold mb-1">Share your invite link</label>
        <p class="text-caption text-body-tertiary mb-2">Anyone with the link can open your team and ask to join.</p>
        <div class="input-group">
          <input id="invite-link" class="form-control" :value="inviteLink" readonly @focus="$event.target.select()" />
          <button class="btn fw-semibold" :class="copied ? 'btn-success' : 'btn-primary'" type="button" @click="copyLink">
            <i :class="copied ? 'bi bi-check-lg' : 'bi bi-link-45deg'" aria-hidden="true"></i>
            {{ copied ? 'Copied!' : 'Copy link' }}
          </button>
        </div>
      </section>

      <form class="border-top pt-4" @submit.prevent="sendInvite">
        <label for="invite-email" class="small fw-semibold mb-1">Or invite someone on TechTrek</label>
        <p class="text-caption text-body-tertiary mb-2">They'll see your invite at the top of their Teams page.</p>
        <div class="d-flex gap-2 mb-2">
          <div class="position-relative flex-grow-1">
            <i class="bi bi-envelope position-absolute top-50 start-0 translate-middle-y ms-3 text-body-tertiary" aria-hidden="true"></i>
            <input
              id="invite-email"
              v-model="email"
              type="email"
              class="form-control ps-5"
              placeholder="friend@smu.edu.sg"
              autocomplete="off"
              inputmode="email"
            />
          </div>
          <button class="btn btn-primary fw-semibold text-nowrap" type="submit" :disabled="isSending || email.trim() === ''">
            <i class="bi bi-send" aria-hidden="true"></i> {{ isSending ? 'Sending...' : 'Invite' }}
          </button>
        </div>
        <input
          v-model="message"
          type="text"
          class="form-control form-control-sm"
          maxlength="500"
          placeholder="Add a note (optional), e.g. We need your design skills!"
          aria-label="Note for your friend"
        />
        <p v-if="error" class="small text-tt-accent mt-2 mb-0" role="alert">{{ error }}</p>
        <p v-else-if="justSent" class="small text-success fw-semibold mt-2 mb-0 invite-sent" role="status">
          <i class="bi bi-send-check" aria-hidden="true"></i> Invite sent to {{ justSent }}!
        </p>
      </form>

      <section v-if="invites.length > 0" class="border-top pt-4">
        <p class="small fw-semibold mb-2">Invited</p>
        <div class="d-flex flex-column gap-2">
          <div v-for="invite in invites" :key="invite._id" class="d-flex align-items-center gap-2 bg-body-secondary rounded-3 px-3 py-2">
            <span class="flex-grow-1 min-w-0 text-truncate small fw-medium">{{ getDisplayName(invite.user) }}</span>
            <span class="badge rounded-pill fw-medium" :class="statusStyle[invite.status].css">{{ statusStyle[invite.status].label }}</span>
            <button
              v-if="invite.status === 'pending'"
              class="btn btn-sm btn-link text-tt-accent text-decoration-none fw-semibold p-0"
              type="button"
              :disabled="busyId === invite._id"
              @click="cancel(invite)"
            >
              Cancel
            </button>
          </div>
        </div>
      </section>
    </div>

    <template #footer>
      <button class="btn btn-sm btn-outline-primary fw-semibold px-3" type="button" @click="$emit('close')">Done</button>
    </template>
  </TeamModal>
</template>

<style scoped>
.invite-sent {
  animation: sent-pop 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.4);
}
@keyframes sent-pop {
  from { opacity: 0; transform: translateY(6px) scale(0.95); }
  to { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .invite-sent {
    animation: none;
  }
}
</style>
