<script setup>
import { computed } from 'vue'
import { popularSkills } from '@/constants'
import { listingSkillMatch } from '@/utils/skills'

const props = defineProps({
  item: { type: Object, required: true },
  mySkills: { type: Array, default: () => [] }
})

const match = computed(() => listingSkillMatch(props.item, props.mySkills, popularSkills))
const total = computed(() => match.value.have.length + match.value.missing.length)
const percent = computed(() => Math.round((match.value.have.length / total.value) * 100))
</script>

<template>
  <!-- hidden when we don't know your skills or the listing names none we recognise -->
  <div
    v-if="mySkills.length > 0 && total > 0"
    class="match-meter"
    :title="[match.have.length ? 'You have: ' + match.have.join(', ') : '', match.missing.length ? 'New to you: ' + match.missing.join(', ') : ''].filter(Boolean).join('\n')"
  >
    <div class="d-flex justify-content-between text-caption text-body-secondary mb-1">
      <span><i class="bi bi-lightning-charge me-1"></i>Skill match</span>
      <span class="fw-semibold text-body">{{ match.have.length }} of {{ total }}</span>
    </div>
    <div
      class="match-track rounded-pill bg-body-secondary"
      role="meter"
      aria-label="Skill match"
      :aria-valuenow="match.have.length"
      aria-valuemin="0"
      :aria-valuemax="total"
    >
      <div class="match-fill rounded-pill" :class="percent >= 50 ? 'bg-success' : 'bg-primary'" :style="{ width: percent + '%' }"></div>
    </div>
  </div>
</template>

<style scoped>
.match-track {
  height: 6px;
  overflow: hidden;
}
/* fills in from the left when the card appears */
.match-fill {
  height: 100%;
  transform-origin: left;
  animation: match-fill 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.15s both;
}
@keyframes match-fill {
  from {
    transform: scaleX(0);
  }
}
@media (prefers-reduced-motion: reduce) {
  .match-fill {
    animation: none;
  }
}
</style>
