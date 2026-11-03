<script setup>
import SkillInput from '@/components/teams/SkillInput.vue'
import { popularSkills } from '@/constants'
import { sameSkill } from '@/utils/team'

// your skills box, then popular skill chips (click to add / remove); used by onboarding and the profile page
const skills = defineModel({ type: Array, required: true })

defineProps({
  // large: bigger chips and text, for the profile page
  large: { type: Boolean, default: false }
})

const MAX_SKILLS = 12 // the server keeps at most 12

function hasSkill(skill) {
  return skills.value.some((chosen) => sameSkill(chosen, skill))
}

function toggleSkill(skill) {
  if (hasSkill(skill)) {
    skills.value = skills.value.filter((chosen) => !sameSkill(chosen, skill))
  } else if (skills.value.length < MAX_SKILLS) {
    skills.value = [...skills.value, skill]
  }
}
</script>

<template>
  <div class="skill-picker d-flex flex-column gap-3" :class="{ 'skill-picker-lg': large }">
    <div>
      <div class="d-flex justify-content-between align-items-baseline mb-2">
        <label class="picker-label fw-semibold">Your skills</label>
        <span class="picker-hint text-body-secondary">{{ skills.length }} of {{ MAX_SKILLS }}</span>
      </div>
      <SkillInput v-model="skills" placeholder="Type any other skill and press Enter" />
    </div>
    <div>
      <p class="picker-label fw-semibold mb-1">Popular skills</p>
      <p class="picker-hint text-body-secondary mb-2">Click to add or remove.</p>
      <div class="d-flex flex-wrap gap-2">
        <button
          v-for="skill in popularSkills"
          :key="skill"
          type="button"
          class="btn rounded-pill fw-medium"
          :class="[hasSkill(skill) ? 'btn-primary' : 'btn-outline-primary', { 'btn-sm': !large }]"
          :aria-pressed="hasSkill(skill)"
          @click="toggleSkill(skill)"
        >
          <i :class="hasSkill(skill) ? 'bi bi-check-lg' : 'bi bi-plus-lg'"></i>
          {{ skill }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.picker-label {
  font-size: 0.875rem;
}
.picker-hint {
  font-size: 0.8125rem;
}

/* large: readable text and chips, the selected skills in the box get bigger too */
.skill-picker-lg .picker-label {
  font-size: 1rem;
}
.skill-picker-lg .picker-hint {
  font-size: 0.9375rem;
}
.skill-picker-lg :deep(.skill-input) {
  min-height: 52px;
  padding-top: 8px !important;
  padding-bottom: 8px !important;
}
.skill-picker-lg :deep(.skill-input .badge) {
  font-size: 0.9375rem;
  padding: 0.5em 0.85em;
}
.skill-picker-lg :deep(.skill-text) {
  font-size: 1rem;
}
</style>
