<script setup>
import { computed } from 'vue'
import { getDisplayName, joinChoices } from '@/utils/team'

// the fields of a join request: which role, a message to the lead, and whether to share my profile.
// Used in the team details window (it slides open under the team) and the request window from links.
const props = defineProps({
  team: { type: Object, required: true },
  error: { type: String, default: '' }
})

const role = defineModel('role', { type: String, default: '' })
const message = defineModel('message', { type: String, default: '' })
const shareProfile = defineModel('shareProfile', { type: Boolean, default: true })

const MAX_MESSAGE = 500

const picker = computed(() => joinChoices(props.team))
</script>

<template>
  <div>
    <p v-if="picker.choices.length === 0" class="small text-body-secondary mb-3">Anyone keen to join can ask. No particular skills needed.</p>

    <div v-else class="mb-3">
      <p class="small fw-semibold mb-1">{{ picker.hasOpenRoles ? 'Which open role are you asking for?' : 'Which role would you take?' }}</p>
      <p v-if="picker.hasOpenRoles" class="text-caption text-body-tertiary mb-2">
        {{ getDisplayName(team.leader) }} is looking for these roles. Pick the one you'd fill.
      </p>
      <div class="d-flex flex-wrap gap-2" role="radiogroup" :aria-label="picker.hasOpenRoles ? 'Open roles' : 'Roles'">
        <button
          v-for="choice in picker.choices"
          :key="choice"
          type="button"
          role="radio"
          :aria-checked="role === choice"
          class="btn btn-sm rounded-pill"
          :class="role === choice ? 'bg-primary-subtle border border-primary text-primary-emphasis fw-semibold' : 'bg-white border'"
          @click="role = choice"
        >
          <i v-if="picker.hasOpenRoles" class="bi" :class="role === choice ? 'bi-check-lg' : 'bi-person-plus'" aria-hidden="true"></i>
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
        rows="3"
        :maxlength="MAX_MESSAGE"
        placeholder="Introduce yourself and tell them what you can build."
      ></textarea>
      <p class="text-caption text-body-tertiary text-end mb-0 mt-1">{{ message.length }} / {{ MAX_MESSAGE }}</p>
    </div>

    <div class="form-check">
      <input id="join-share" v-model="shareProfile" class="form-check-input" type="checkbox">
      <label class="form-check-label small" for="join-share">Share my profile (skills, GitHub and LinkedIn) with the team</label>
    </div>

    <p v-if="error !== ''" class="small text-tt-accent mt-3 mb-0" role="alert">{{ error }}</p>
  </div>
</template>
