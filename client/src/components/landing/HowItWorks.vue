<script setup>
// one opportunity from start to finish, as four steps joined by a line.
// The line fills as you scroll through the section (progress comes from the page's scroll),
// and each step lights up once the line reaches it.
const props = defineProps({
  steps: { type: Array, required: true },
  progress: { type: Number, default: 0 } // 0 = not reached yet, 1 = scrolled past
})

// step i lights up once the line has reached it
function isReached(index) {
  return props.progress >= index / props.steps.length + 0.05
}
</script>

<template>
  <div class="journey">
    <!-- the grey track and the purple fill on top of it -->
    <span class="journey-track" aria-hidden="true">
      <span class="journey-fill" :style="{ transform: `scaleY(${progress})` }"></span>
    </span>

    <ol class="journey-steps list-unstyled mb-0">
    <li v-for="(step, index) in steps" :key="step.title" class="journey-step" :class="{ 'is-reached': isReached(index) }">
      <span class="step-dot d-flex align-items-center justify-content-center" aria-hidden="true">
        <i class="bi" :class="step.icon"></i>
      </span>
      <div class="step-card card p-3 p-md-4">
        <p class="text-overline text-primary mb-1">STEP {{ index + 1 }}</p>
        <h3 class="h3 mb-1">{{ step.title }}</h3>
        <p class="text-body-secondary mb-0">{{ step.text }}</p>
      </div>
    </li>
    </ol>
  </div>
</template>

<style scoped>
.journey {
  position: relative;
  max-width: 720px;
  margin: 0 auto;
}
.journey-steps {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* the line runs down the middle of the dots */
.journey-track {
  position: absolute;
  top: 24px;
  bottom: 24px;
  left: 23px;
  width: 3px;
  border-radius: 3px;
  background-color: var(--bs-border-color);
}
.journey-fill {
  position: absolute;
  inset: 0;
  border-radius: 3px;
  background: linear-gradient(var(--bs-primary), var(--tt-sky));
  transform-origin: top;
  transition: transform 0.15s linear;
}

.journey-step {
  position: relative;
  display: flex;
  align-items: center;
  gap: 20px;
}
.step-dot {
  position: relative;
  z-index: 1;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: 50%;
  font-size: 20px;
  color: var(--bs-secondary-color);
  background-color: var(--tt-surface);
  border: 3px solid var(--bs-border-color);
  transition: background-color 0.3s ease, border-color 0.3s ease, color 0.3s ease, transform 0.3s ease;
}
.step-card {
  flex-grow: 1;
  border-radius: 16px;
  background-color: var(--tt-surface);
  opacity: 0.55;
  transform: translateX(10px);
  transition: opacity 0.4s ease, transform 0.4s ease, border-color 0.4s ease;
}

/* reached: the dot fills purple and pops, the card slides in fully */
.journey-step.is-reached .step-dot {
  color: #fff;
  border-color: var(--bs-primary);
  background-color: var(--bs-primary);
  transform: scale(1.08);
}
.journey-step.is-reached .step-card {
  opacity: 1;
  transform: none;
  border-color: var(--bs-primary-border-subtle);
}

@media (prefers-reduced-motion: reduce) {
  .journey-fill,
  .step-dot,
  .step-card {
    transition: none;
  }
  .step-card {
    transform: none;
  }
}
</style>
