<script setup>
import { ref } from 'vue'
import TeamModal from './TeamModal.vue'
import SkillInput from './SkillInput.vue'

const props = defineProps({
  skills: { type: Array, required: true },
  suggestions: { type: Array, default: () => [] },
  busy: { type: Boolean, default: false },
  error: { type: String, default: '' }
})

defineEmits(['close', 'submit'])

const chosen = ref([...props.skills])
</script>

<template>
  <TeamModal title="Edit your skills" subtitle="Teams looking for these skills are matched to you." width="480px" @close="$emit('close')">
    <label class="small fw-semibold mb-2">Your skills</label>
    <SkillInput v-model="chosen" :suggestions="suggestions" />

    <p v-if="error !== ''" class="small text-tt-accent mt-3 mb-0">{{ error }}</p>

    <template #footer>
      <button class="btn btn-sm btn-outline-primary fw-semibold px-3" @click="$emit('close')">Cancel</button>
      <button class="btn btn-sm btn-primary fw-semibold px-3" :disabled="busy" @click="$emit('submit', chosen)">
        {{ busy ? 'Saving...' : 'Save skills' }}
      </button>
    </template>
  </TeamModal>
</template>
