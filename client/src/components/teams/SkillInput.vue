<script setup>
import { ref, computed } from 'vue'
import { sameSkill } from '@/utils/team'

const skills = defineModel({ type: Array, required: true })

const props = defineProps({
  suggestions: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Type a skill and press Enter' }
})

const text = ref('')

function addSkill(value) {
  const skill = value.trim()
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

const shownSuggestions = computed(() => {
  return props.suggestions.filter((suggestion) => !skills.value.some((skill) => sameSkill(skill, suggestion))).slice(0, 5)
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

    <p v-if="shownSuggestions.length > 0" class="text-caption text-body-tertiary mt-1 mb-0">
      Suggestions:
      <template v-for="(suggestion, index) in shownSuggestions" :key="suggestion">
        <button type="button" class="btn btn-link btn-sm p-0 text-caption text-body-tertiary text-decoration-none" @click="addSkill(suggestion)">{{ suggestion }}</button>
        <span v-if="index < shownSuggestions.length - 1"> · </span>
      </template>
    </p>
  </div>
</template>
