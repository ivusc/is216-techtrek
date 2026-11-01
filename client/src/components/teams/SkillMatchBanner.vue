<script setup>
import { computed } from 'vue'
import { joinWithAnd } from '@/utils/team'

const props = defineProps({
  mySkills: { type: Array, required: true },
  matchedSkills: { type: Array, required: true },
  matchCount: { type: Number, required: true }
})

defineEmits(['edit-skills'])

const title = computed(() => {
  if (props.mySkills.length === 0) {
    return 'Add your skills to get matched'
  }
  if (props.matchCount === 0) {
    return 'No team needs your skills yet'
  }
  return props.matchCount + (props.matchCount === 1 ? ' team needs' : ' teams need') + ' your skills'
})

const text = computed(() => {
  if (props.mySkills.length === 0) {
    return 'Tell us what you are good at and we will show the teams that are looking for it.'
  }
  if (props.matchCount === 0) {
    return 'Your profile has ' + joinWithAnd(props.mySkills) + '. Check back soon or update your skills.'
  }
  return 'Matched on ' + joinWithAnd(props.matchedSkills) + ' from your profile. Keep your profile updated for better matches.'
})
</script>

<template>
  <div class="d-flex align-items-center gap-3 flex-wrap bg-tt-peach rounded-3 p-3 mb-3">
    <span class="size-40 bg-white rounded-3 d-flex justify-content-center align-items-center flex-shrink-0 text-tt-accent">
      <i class="bi bi-stars fs-5"></i>
    </span>
    <div class="flex-grow-1 min-w-0">
      <p class="fw-semibold mb-0">{{ title }}</p>
      <p class="small mb-0">{{ text }}</p>
    </div>
    <button class="btn btn-sm bg-white border-primary text-primary fw-semibold" @click="$emit('edit-skills')">Edit skills</button>
  </div>
</template>
