<script setup>
import { ref } from 'vue'
import { formatDate } from '@/utils/date'
import { getDisplayName, sameSkill } from '@/utils/team'
import TeamModal from './TeamModal.vue'
import UserAvatar from '@/components/UserAvatar.vue'

const props = defineProps({
  team: { type: Object, required: true },
  mySkills: { type: Array, default: () => [] },
  busy: { type: Boolean, default: false },
  error: { type: String, default: '' }
})

const emit = defineEmits(['close', 'submit'])

const MAX_MESSAGE = 500

const role = ref(props.team.skills.find((skill) => props.mySkills.some((mine) => sameSkill(mine, skill))) ?? '')
const message = ref('')
const shareProfile = ref(true)

function send() {
  emit('submit', { role: role.value, message: message.value, shareProfile: shareProfile.value })
}
</script>

<template>
  <TeamModal
    :title="'Request to join ' + team.name"
    :subtitle="team.event.name + ' · ' + team.slotsOpen + ' of ' + team.teamSize + ' slots open' + (team.closesAt ? ' · Closes ' + formatDate(team.closesAt) : '')"
    @close="$emit('close')"
  >

    <div class="d-flex align-items-center gap-3 bg-body-secondary rounded-3 p-3 mb-3">
      <div class="avatar-stack d-flex">
        <UserAvatar v-for="member in team.members.slice(0, 4)" :key="member.user._id" :user-id="member.user._id" :name="getDisplayName(member.user)" :avatar-updated-at="member.user.avatar?.updatedAt" :size="32" />
      </div>
      <div class="min-w-0">
        <p class="text-caption text-body-tertiary mb-1">Looking for</p>
        <div class="d-flex flex-wrap gap-1">
          <span v-for="skill in team.skills" :key="skill" class="badge rounded-pill fw-normal border bg-white text-body">{{ skill }}</span>
          <span v-if="team.skills.length === 0" class="small text-body-secondary">Anyone keen to join</span>
        </div>
      </div>
    </div>

    <div v-if="team.skills.length > 0" class="mb-3">
      <p class="small fw-semibold mb-2">Which role would you take?</p>
      <div class="d-flex flex-wrap gap-2">
        <button
          v-for="skill in team.skills"
          :key="skill"
          type="button"
          class="btn btn-sm rounded-pill"
          :class="role === skill ? 'bg-primary-subtle border border-primary text-primary-emphasis fw-semibold' : 'bg-white border'"
          @click="role = skill"
        >
          {{ skill }}
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
      <button class="btn btn-sm btn-primary fw-semibold px-3" :disabled="busy || (team.skills.length > 0 && role === '')" @click="send">
        <i class="bi bi-send"></i> {{ busy ? 'Sending...' : 'Send request' }}
      </button>
    </template>
  </TeamModal>
</template>
