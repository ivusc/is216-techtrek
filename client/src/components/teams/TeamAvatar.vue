<script setup>
import { computed } from 'vue'
import { getAvatarStyle, getInitials } from '@/utils/team'

const props = defineProps({
  name: { type: String, required: true },
  size: { type: Number, default: 32 },
  square: { type: Boolean, default: false }
})

const style = computed(() => ({
  ...getAvatarStyle(props.name),
  width: props.size + 'px',
  height: props.size + 'px',
  fontSize: Math.round(props.size * 0.36) + 'px'
}))
</script>

<template>
  <div
    class="team-avatar d-flex justify-content-center align-items-center flex-shrink-0 fw-semibold border border-2 border-white"
    :class="square ? 'rounded-3' : 'rounded-circle'"
    :style="style"
    :title="name"
  >
    {{ getInitials(name) }}
  </div>
</template>
