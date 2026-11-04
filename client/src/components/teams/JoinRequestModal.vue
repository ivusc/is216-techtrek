<script setup>
import { computed, ref } from 'vue'
import { formatDate } from '@/utils/date'
import { getDisplayName, sameSkill, uniqueRoles } from '@/utils/team'
import TeamModal from './TeamModal.vue'
import TeamPeople from './TeamPeople.vue'
import { useUserStore } from '@/store/user'

const props = defineProps({
  team: { type: Object, required: true },
  mySkills: { type: Array, default: () => [] },
  busy: { type: Boolean, default: false },
  error: { type: String, default: '' },
  // opened from a role's link (/teams?team=<id>&role=<role>): start with that role picked
  initialRole: { type: String, default: '' }
})

const emit = defineEmits(['close', 'submit'])

const MAX_MESSAGE = 500

// a team with open roles takes requests for one of those roles; otherwise pick a skill they want
const openRoles = uniqueRoles(props.team.openRoles ?? [])
const hasOpenRoles = openRoles.length > 0
const choices = hasOpenRoles ? openRoles : props.team.skills

function startingRole() {
  const fromLink = choices.find((choice) => choice.toLowerCase() === props.initialRole.trim().toLowerCase())
  if (fromLink) return fromLink
  if (hasOpenRoles) {
    // only one role going, or a role named after one of my skills
    if (openRoles.length === 1) return openRoles[0]
    return openRoles.find((open) => props.mySkills.some((mine) => sameSkill(mine, open))) ?? ''
  }
  return props.team.skills.find((skill) => props.mySkills.some((mine) => sameSkill(mine, skill))) ?? ''
}

const role = ref(startingRole())
const message = ref('')
const shareProfile = ref(true)

// I'm shown in the first open spot, with the role I pick
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

    <p v-if="choices.length === 0" class="small text-body-secondary mb-3">Anyone keen to join can ask. No particular skills needed.</p>

    <div v-if="choices.length > 0" class="mb-3">
      <p class="small fw-semibold mb-1">{{ hasOpenRoles ? 'Which open role are you asking for?' : 'Which role would you take?' }}</p>
      <p v-if="hasOpenRoles" class="text-caption text-body-tertiary mb-2">
        {{ getDisplayName(team.leader) }} is looking for these roles. Pick the one you'd fill.
      </p>
      <div class="d-flex flex-wrap gap-2" role="radiogroup" :aria-label="hasOpenRoles ? 'Open roles' : 'Roles'">
        <button
          v-for="choice in choices"
          :key="choice"
          type="button"
          role="radio"
          :aria-checked="role === choice"
          class="btn btn-sm rounded-pill"
          :class="role === choice ? 'bg-primary-subtle border border-primary text-primary-emphasis fw-semibold' : 'bg-white border'"
          @click="role = choice"
        >
          <i v-if="hasOpenRoles" class="bi" :class="role === choice ? 'bi-check-lg' : 'bi-person-plus'" aria-hidden="true"></i>
          {{ choice }}
        </button>
      </div>
    </div>

    <div class="mb-3">
      <label class="small fw-semibold mb-2" for="join-message">Message to {{ getDisplayName(team.leader) }}</label>
      <textarea
        id="join-message"
        v-model="message"
        class="form-control"
        rows="4"
        :maxlength="MAX_MESSAGE"
        placeholder="Introduce yourself and tell them what you can build."
      ></textarea>
      <p class="text-caption text-body-tertiary text-end mb-0 mt-1">{{ message.length }} / {{ MAX_MESSAGE }}</p>
    </div>

    <div class="form-check">
      <input id="join-share" v-model="shareProfile" class="form-check-input" type="checkbox">
      <label class="form-check-label small" for="join-share">Share my profile (skills, GitHub and LinkedIn) with the team</label>
    </div>

    <p v-if="error !== ''" class="small text-tt-accent mt-3 mb-0">{{ error }}</p>

    <template #footer>
      <button class="btn btn-sm btn-outline-primary fw-semibold px-3" @click="$emit('close')">Cancel</button>
      <button class="btn btn-sm btn-primary fw-semibold px-3" :disabled="busy || (choices.length > 0 && role === '')" @click="send">
        <i class="bi bi-send"></i> {{ busy ? 'Sending...' : 'Send request' }}
      </button>
    </template>
  </TeamModal>
</template>
