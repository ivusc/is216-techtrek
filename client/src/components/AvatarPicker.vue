<script setup>
import { computed, onMounted, ref } from 'vue'
import { avatarPresetUrl, fetchAvatarPresets } from '@/services/userService'

// the illustrated characters to use as a profile picture instead of a photo, in two rows (female, male).
// Clicking one emits pick(key); the page saves it. The one in use is ringed.
const props = defineProps({
  selected: { type: String, default: '' }, // the character in use, '' for none
  busy: { type: Boolean, default: false }
})

const emit = defineEmits(['pick'])

const presets = ref([])
const loadFailed = ref(false)

onMounted(async () => {
  try {
    presets.value = await fetchAvatarPresets()
  } catch (error) {
    console.error(error)
    loadFailed.value = true
  }
})

const groups = computed(() => [
  { key: 'female', label: 'Female', items: presets.value.filter((preset) => preset.group === 'female') },
  { key: 'male', label: 'Male', items: presets.value.filter((preset) => preset.group === 'male') }
].filter((group) => group.items.length > 0))

function pick(key) {
  if (props.busy || key === props.selected) return
  emit('pick', key)
}
</script>

<template>
  <div class="avatar-picker">
    <p v-if="loadFailed" class="small text-body-secondary mb-0">Couldn't load the characters. Try again later.</p>
    <div v-for="group in groups" :key="group.key" class="mb-2">
      <p :id="'avatar-group-' + group.key" class="text-caption text-body-secondary fw-semibold mb-1">{{ group.label }}</p>
      <div class="d-flex flex-wrap gap-2" role="radiogroup" :aria-labelledby="'avatar-group-' + group.key">
        <button
          v-for="preset in group.items"
          :key="preset.key"
          type="button"
          role="radio"
          class="avatar-choice rounded-circle p-0 border-0 bg-transparent"
          :class="{ 'is-selected': preset.key === selected }"
          :aria-checked="preset.key === selected"
          :aria-label="preset.label"
          :title="preset.label"
          :disabled="busy"
          @click="pick(preset.key)"
        >
          <img :src="avatarPresetUrl(preset.key)" alt="" width="52" height="52" class="rounded-circle d-block" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.avatar-choice {
  width: 56px;
  height: 56px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  outline: 2px solid transparent;
  outline-offset: 1px;
  transition: outline-color 0.15s ease;
}
.avatar-choice:hover:not(:disabled) {
  outline-color: var(--bs-primary-border-subtle);
}
.avatar-choice:focus-visible {
  outline-color: var(--bs-primary);
}
.avatar-choice.is-selected {
  outline: 3px solid var(--bs-primary);
}
.avatar-choice:disabled {
  opacity: 0.6;
}
</style>
