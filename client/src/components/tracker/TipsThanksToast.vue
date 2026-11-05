<script setup>
import { onMounted, onUnmounted } from 'vue'

// pops up after interview tips are shared or edited: a little envelope hops in, its heart
// pops out, and a few hearts float up. It closes by itself after a few seconds.
defineProps({
  edited: { type: Boolean, default: false }, // true after an edit, false after first sharing
  organisation: { type: String, default: '' }
})

const emit = defineEmits(['close'])

// three hearts drift up at slightly different spots and times
const hearts = [
  { x: -16, delay: 0.75, size: 11 },
  { x: 2, delay: 0.95, size: 14 },
  { x: 18, delay: 1.15, size: 10 }
]

let timer = null
onMounted(() => {
  timer = setTimeout(() => emit('close'), 5500)
})
onUnmounted(() => clearTimeout(timer))
</script>

<template>
  <div class="thanks-toast card shadow-lg d-flex flex-row align-items-center gap-3" role="status" aria-live="polite">
    <div class="thanks-scene position-relative flex-shrink-0" aria-hidden="true">
      <span class="thanks-envelope d-flex align-items-center justify-content-center rounded-circle">
        <i class="bi bi-envelope-heart-fill"></i>
      </span>
      <span
        v-for="(heart, index) in hearts"
        :key="'heart' + index"
        class="thanks-heart"
        :style="{ '--x': heart.x + 'px', animationDelay: heart.delay + 's', fontSize: heart.size + 'px' }"
      >
        <i class="bi bi-heart-fill"></i>
      </span>
    </div>

    <div class="thanks-text flex-grow-1 min-w-0">
      <p class="fw-semibold mb-0">{{ edited ? 'Tips updated, thank you!' : 'Thank you for sharing!' }}</p>
      <p class="small text-body-secondary mb-0">
        <template v-if="edited">Students preparing for {{ organisation || 'this role' }} now see your new tips.</template>
        <template v-else>You just helped the next SMU student preparing for {{ organisation || 'this role' }}.</template>
      </p>
    </div>

    <button class="btn-close flex-shrink-0" type="button" aria-label="Close" @click="emit('close')"></button>
  </div>
</template>

<style scoped>
.thanks-toast {
  position: fixed;
  left: 50%;
  top: 20px; /* at the top, so it never covers the job window's buttons */
  z-index: 1080; /* above modals */
  width: min(440px, calc(100vw - 32px));
  padding: 14px 16px;
  transform: translateX(-50%);
  animation: toast-in 0.4s cubic-bezier(0.2, 0.9, 0.3, 1.2);
}

.thanks-scene {
  width: 56px;
  height: 56px;
}

/* the envelope hops in with a little squash, then wiggles like it's waving */
.thanks-envelope {
  position: absolute;
  inset: 4px;
  z-index: 1;
  font-size: 22px;
  color: var(--tt-accent);
  background-color: var(--bs-primary-bg-subtle);
  box-shadow: 0 2px 8px rgba(85, 64, 191, 0.18);
  animation:
    envelope-hop 0.6s cubic-bezier(0.3, 1.5, 0.5, 1) 0.1s backwards,
    envelope-wiggle 0.5s ease-in-out 0.75s 2;
}

/* hearts float up out of the envelope and fade */
.thanks-heart {
  position: absolute;
  left: 50%;
  top: 14px;
  z-index: 2;
  margin-left: -6px;
  color: var(--tt-accent);
  opacity: 0;
  animation: heart-float 1.4s ease-out forwards;
}

.thanks-text {
  animation: text-in 0.35s ease-out 0.4s backwards;
}

@keyframes toast-in {
  from { opacity: 0; transform: translate(-50%, -24px) scale(0.96); }
  to { opacity: 1; transform: translate(-50%, 0) scale(1); }
}
@keyframes envelope-hop {
  0% { transform: translateY(18px) scale(0.4); opacity: 0; }
  60% { transform: translateY(-4px) scale(1.08, 0.94); opacity: 1; }
  100% { transform: none; }
}
@keyframes envelope-wiggle {
  0%, 100% { transform: rotate(0); }
  25% { transform: rotate(-10deg); }
  75% { transform: rotate(10deg); }
}
@keyframes heart-float {
  0% { opacity: 0; transform: translate(0, 0) scale(0.4); }
  20% { opacity: 1; transform: translate(calc(var(--x) * 0.4), -10px) scale(1); }
  100% { opacity: 0; transform: translate(var(--x), -38px) scale(0.8); }
}
@keyframes text-in {
  from { opacity: 0; transform: translateY(4px); }
}

/* people who turn off motion see the finished picture straight away */
@media (prefers-reduced-motion: reduce) {
  .thanks-toast,
  .thanks-envelope,
  .thanks-text {
    animation: none;
  }
  .thanks-heart {
    display: none;
  }
}
</style>
