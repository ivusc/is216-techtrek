<script setup>
import { computed, ref } from 'vue'

// The problem (from the proposal's Project Overview): four pain points as cards. The
// "Without / With TechTrek" switch flips every card over to show how TechTrek fixes it;
// tapping one card flips just that one.
const props = defineProps({
  problems: { type: Array, required: true },
  shown: { type: Boolean, default: false } // the section has scrolled into view
})

const emit = defineEmits(['see-feature'])

// which cards are showing their fix, by id
const flipped = ref({})

const allSolved = computed(() => props.problems.every((item) => flipped.value[item.id]))

// the switch: show every fix, or every problem
function setAll(solved) {
  const next = {}
  for (const item of props.problems) next[item.id] = solved
  flipped.value = next
}

function flip(item) {
  flipped.value = { ...flipped.value, [item.id]: !flipped.value[item.id] }
}
</script>

<template>
  <div>
    <!-- the switch -->
    <div class="d-flex justify-content-center mb-4">
      <div class="mode-switch" role="group" aria-label="Show the problems or the fixes">
        <span class="mode-thumb" :class="{ 'on-right': allSolved }" aria-hidden="true"></span>
        <button type="button" :aria-pressed="!allSolved" :class="{ 'is-on': !allSolved }" @click="setAll(false)">
          <i class="bi bi-emoji-frown" aria-hidden="true"></i> Without TechTrek
        </button>
        <button type="button" :aria-pressed="allSolved" :class="{ 'is-on': allSolved }" @click="setAll(true)">
          <i class="bi bi-emoji-smile" aria-hidden="true"></i> With TechTrek
        </button>
      </div>
    </div>

    <div class="row g-3">
      <div v-for="(item, index) in problems" :key="item.id" class="col-12 col-sm-6 col-xl-3">
        <div
          class="flip-card reveal"
          :class="{ 'is-in': shown, 'is-flipped': flipped[item.id] }"
          :style="{ transitionDelay: shown ? index * 90 + 'ms' : '0ms' }"
        >
          <div class="flip-inner" :style="{ transitionDelay: index * 70 + 'ms' }">
            <!-- front: the problem -->
            <button
              type="button"
              class="flip-face face-problem card text-start p-4"
              :aria-hidden="flipped[item.id] ? 'true' : 'false'"
              :tabindex="flipped[item.id] ? -1 : 0"
              @click="flip(item)"
            >
              <span class="face-icon rounded-3 d-flex align-items-center justify-content-center mb-3">
                <i class="bi" :class="item.icon" aria-hidden="true"></i>
              </span>
              <span class="text-overline text-tt-accent d-block mb-1">THE PROBLEM</span>
              <span class="h3 d-block mb-2">{{ item.problem }}</span>
              <span class="d-block text-body-secondary small mb-3">{{ item.problemText }}</span>
              <span class="flip-hint text-caption mt-auto"><i class="bi bi-arrow-repeat" aria-hidden="true"></i> Tap to see the fix</span>
            </button>

            <!-- back: how TechTrek fixes it -->
            <div class="flip-face face-solution card p-4" :aria-hidden="flipped[item.id] ? 'false' : 'true'">
              <span class="face-icon is-solution rounded-3 d-flex align-items-center justify-content-center mb-3">
                <i class="bi" :class="item.solutionIcon" aria-hidden="true"></i>
              </span>
              <span class="text-overline d-block mb-1 solution-label">WITH TECHTREK</span>
              <span class="h3 d-block mb-2 text-white">{{ item.solution }}</span>
              <span class="d-block small mb-3 solution-text">{{ item.solutionText }}</span>
              <span class="d-flex gap-2 mt-auto">
                <button type="button" class="btn btn-sm btn-light fw-semibold" :tabindex="flipped[item.id] ? 0 : -1" @click="emit('see-feature', item.feature)">
                  See how <i class="bi bi-arrow-down" aria-hidden="true"></i>
                </button>
                <button type="button" class="btn btn-sm flip-back fw-semibold" :tabindex="flipped[item.id] ? 0 : -1" @click="flip(item)">
                  Back
                </button>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* the Without / With switch: a white thumb slides under the side that is on */
.mode-switch {
  position: relative;
  display: inline-grid;
  grid-template-columns: 1fr 1fr;
  padding: 4px;
  border-radius: 999px;
  background-color: var(--bs-secondary-bg);
  border: 1px solid var(--bs-border-color);
}
.mode-switch button {
  position: relative;
  z-index: 1;
  padding: 10px 18px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--bs-secondary-color);
  font-weight: 600;
  white-space: nowrap;
  transition: color 0.2s ease;
}
.mode-switch button.is-on {
  color: var(--bs-primary);
}
.mode-thumb {
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 4px;
  width: calc(50% - 4px);
  border-radius: 999px;
  background-color: var(--tt-surface);
  box-shadow: 0 2px 8px rgba(28, 26, 61, 0.12);
  transition: transform 0.35s cubic-bezier(0.3, 0.9, 0.4, 1);
}
.mode-thumb.on-right {
  transform: translateX(100%);
}

/* each card is two faces back to back; flipping turns the inner layer over (rotateY) */
.flip-card {
  height: 100%;
  perspective: 1200px;
}
.flip-inner {
  display: grid;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 0.6s cubic-bezier(0.3, 0.9, 0.4, 1);
}
.flip-card.is-flipped .flip-inner {
  transform: rotateY(180deg);
}
/* both faces sit in the same grid cell, so the card is as tall as the taller face */
.flip-face {
  grid-area: 1 / 1;
  display: flex;
  flex-direction: column;
  min-height: 290px;
  border-radius: 16px;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}
.face-problem {
  width: 100%;
  background-color: var(--tt-surface);
  color: var(--bs-body-color);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.face-problem:hover {
  border-color: rgba(85, 64, 191, 0.45);
  box-shadow: 0 12px 28px -12px rgba(85, 64, 191, 0.35);
}
.face-problem:focus-visible {
  outline: 2px solid var(--bs-primary);
  outline-offset: 2px;
}
.face-solution {
  transform: rotateY(180deg);
  border: 0;
  color: #fff;
  background-color: var(--bs-primary);
}

.face-icon {
  width: 44px;
  height: 44px;
  font-size: 20px;
  color: var(--tt-accent-text);
  background-color: var(--bs-danger-bg-subtle);
}
.face-icon.is-solution {
  color: var(--bs-primary);
  background-color: #fff;
}
.solution-label {
  color: rgba(255, 255, 255, 0.75);
}
.solution-text {
  color: rgba(255, 255, 255, 0.92);
}
.flip-hint {
  color: var(--bs-primary);
}
.flip-back {
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.5);
}
.flip-back:hover {
  color: #fff;
  background-color: rgba(255, 255, 255, 0.12);
}

@media (max-width: 575.98px) {
  .mode-switch button {
    padding: 9px 12px;
    font-size: 0.875rem;
  }
  .flip-face {
    min-height: 250px;
  }
}

/* no turning cards for people who switch off motion: the fix simply replaces the problem */
@media (prefers-reduced-motion: reduce) {
  .flip-inner,
  .mode-thumb {
    transition: none;
  }
}
</style>
