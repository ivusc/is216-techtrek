<script setup>
import { ref, computed } from 'vue'
import { sameSkill } from '@/utils/team'
import { canonicalSkill } from '@/utils/skills'
import { popularSkills } from '@/constants'

const skills = defineModel({ type: Array, required: true })

const props = defineProps({
  // when given, a row of skill buttons (popular skills + these) shows under the box: tap to add or remove
  suggestions: { type: Array, default: null },
  placeholder: { type: String, default: 'Type a skill and press Enter' }
})

const text = ref('')

function addSkill(value) {
  // typed skills get the standard spelling, so "nodejs" is saved as "Node.js" and matches teams
  const skill = canonicalSkill(value)
  if (skill === '') {
    return
  }
  if (!skills.value.some((existing) => sameSkill(existing, skill))) {
    skills.value = [...skills.value, skill]
  }
  text.value = ''
}

function removeSkill(skill) {
  skills.value = skills.value.filter((existing) => existing !== skill)
}

function onKeydown(event) {
  if (event.key === 'Enter') {
    event.preventDefault()
    addSkill(text.value)
  } else if (event.key === 'Backspace' && text.value === '' && skills.value.length > 0) {
    skills.value = skills.value.slice(0, -1)
  }
}

const MAX_CHIPS = 20

function hasSkill(skill) {
  return skills.value.some((chosen) => sameSkill(chosen, skill))
}

function toggleSkill(skill) {
  if (hasSkill(skill)) {
    skills.value = skills.value.filter((chosen) => !sameSkill(chosen, skill))
  } else {
    addSkill(skill)
  }
}

// popular skills first, then other skills used on the page, each spelt once
const quickSkills = computed(() => {
  if (props.suggestions === null) return []
  const all = []
  for (const skill of [...popularSkills, ...props.suggestions]) {
    const name = canonicalSkill(skill)
    if (name !== '' && !all.some((existing) => sameSkill(existing, name))) all.push(name)
  }
  return all.slice(0, MAX_CHIPS)
})
</script>

<template>
  <div>
    <div class="skill-input form-control d-flex flex-wrap align-items-center gap-1 py-1">
      <span
        v-for="skill in skills"
        :key="skill"
        class="badge rounded-pill fw-medium bg-primary-subtle text-primary-emphasis d-flex align-items-center gap-1"
      >
        {{ skill }}
        <button type="button" class="btn-close skill-remove" :aria-label="'Remove ' + skill" @click="removeSkill(skill)"></button>
      </span>
      <input
        v-model="text"
        type="text"
        class="border-0 flex-grow-1 bg-transparent skill-text"
        :placeholder="placeholder"
        @keydown="onKeydown"
      >
    </div>

    <div v-if="quickSkills.length > 0" class="mt-2">
      <p class="text-caption text-body-secondary mb-2">Tap to add or remove, or type your own above.</p>
      <div class="d-flex flex-wrap gap-2">
        <button
          v-for="skill in quickSkills"
          :key="skill"
          type="button"
          class="btn btn-sm rounded-pill fw-medium"
          :class="hasSkill(skill) ? 'btn-primary' : 'btn-outline-primary'"
          :aria-pressed="hasSkill(skill)"
          @click="toggleSkill(skill)"
        >
          <i :class="hasSkill(skill) ? 'bi bi-check-lg' : 'bi bi-plus-lg'" aria-hidden="true"></i>
          {{ skill }}
        </button>
      </div>
    </div>
  </div>
</template>
