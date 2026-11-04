<script setup>
import { computed, ref } from 'vue'
import { formatDate } from '@/utils/date'
import { joinChoices, startingJoinRole } from '@/utils/team'
import TeamModal from './TeamModal.vue'
import TeamPeople from './TeamPeople.vue'
import JoinRequestFields from './JoinRequestFields.vue'
import { useUserStore } from '@/store/user'

// the request window opened from a team's link (/teams?team=<id>): the team as circles, then the request
const props = defineProps({
  team: { type: Object, required: true },
  mySkills: { type: Array, default: () => [] },
  busy: { type: Boolean, default: false },
  error: { type: String, default: '' },
  // opened from a role's link (/teams?team=<id>&role=<role>): start with that role picked
  initialRole: { type: String, default: '' }
})

const emit = defineEmits(['close', 'submit'])

const { choices } = joinChoices(props.team)
const role = ref(startingJoinRole(props.team, props.mySkills, props.initialRole))
const message = ref('')
const shareProfile = ref(true)

// I'm shown in the spot of the role I pick
const auth = useUserStore()
const you = computed(() => ({ id: auth._id, name: auth.displayName ?? '', avatarUpdatedAt: auth.avatarUpdatedAt, role: role.value }))

function send() {
  emit('submit', { role: role.value, message: message.value, shareProfile: shareProfile.value })
}
</script>

<template>
  <TeamModal
    :title="'Request to join ' + team.name"
    width="600px"
    :subtitle="team.event.name + ' · ' + team.slotsOpen + ' of ' + team.teamSize + ' slots open' + (team.closesAt ? ' · Closes ' + formatDate(team.closesAt) : '')"
    @close="$emit('close')"
  >

    <p class="small fw-semibold mb-2">Who's in the team</p>
    <TeamPeople :team="team" :you="you" class="mb-4" @pick-role="role = $event" />

    <JoinRequestFields v-model:role="role" v-model:message="message" v-model:share-profile="shareProfile" :team="team" :error="error" />

    <template #footer>
      <button class="btn btn-sm btn-outline-primary fw-semibold px-3" @click="$emit('close')">Cancel</button>
      <button class="btn btn-sm btn-primary fw-semibold px-3" :disabled="busy || (choices.length > 0 && role === '')" @click="send">
        <i class="bi bi-send"></i> {{ busy ? 'Sending...' : 'Send request' }}
      </button>
    </template>
  </TeamModal>
</template>
