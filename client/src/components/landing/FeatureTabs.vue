<script setup>
import { computed, ref } from 'vue'
import FeaturePreview from './FeaturePreview.vue'

// Objectives / Functionality (from the proposal): the four features as tabs. Each tab shows the problem it
// solves, what you can do, and a mini preview of that part of the app.
// While nobody has picked a tab, a bar fills under the active one and the next tab opens when it is full
// (the bar is a CSS animation; @animationend moves on). Hovering pauses it, and picking a tab stops it.
const props = defineProps({
  features: { type: Array, required: true },
  shown: { type: Boolean, default: false }, // the section is on screen: only then does it move on by itself
  chosen: { type: Boolean, default: false } // the page opened a tab for you (e.g. "See how"), so stay on it
})

// the open tab's id (v-model:active, so the problem cards can open a tab too)
const active = defineModel('active', { type: String, required: true })

const picked = ref(false) // someone chose a tab, so stop moving on by itself
const paused = ref(false) // the mouse is over the tabs

const current = computed(() => props.features.find((feature) => feature.id === active.value) ?? props.features[0])
const autoPlaying = computed(() => props.shown && !picked.value && !props.chosen)

function choose(feature) {
  picked.value = true
  active.value = feature.id
}

// the bar under the active tab filled up: open the next tab
function next() {
  const index = props.features.findIndex((feature) => feature.id === active.value)
  active.value = props.features[(index + 1) % props.features.length].id
}

// left / right arrow keys move between tabs (the usual keyboard pattern for tabs)
function onKey(event, index) {
  if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
  const step = event.key === 'ArrowRight' ? 1 : -1
  const target = props.features[(index + step + props.features.length) % props.features.length]
  choose(target)
  document.getElementById('feature-tab-' + target.id)?.focus()
}
</script>

<template>
  <div class="feature-tabs" @mouseenter="paused = true" @mouseleave="paused = false">
    <div class="tab-row" role="tablist" aria-label="TechTrek features">
      <button
        v-for="(feature, index) in features"
        :id="'feature-tab-' + feature.id"
        :key="feature.id"
        type="button"
        role="tab"
        class="feature-tab"
        :class="{ 'is-active': active === feature.id }"
        :aria-selected="active === feature.id"
        :aria-controls="'feature-panel-' + feature.id"
        :tabindex="active === feature.id ? 0 : -1"
        @click="choose(feature)"
        @keydown="onKey($event, index)"
      >
        <span class="tab-icon rounded-3 d-flex align-items-center justify-content-center">
          <i class="bi" :class="feature.icon" aria-hidden="true"></i>
        </span>
        <span class="fw-semibold">{{ feature.label }}</span>
        <!-- the timer bar: only while it moves on by itself -->
        <span
          v-if="active === feature.id && autoPlaying"
          :key="'bar-' + feature.id"
          class="tab-timer"
          :class="{ 'is-paused': paused }"
          aria-hidden="true"
          @animationend="next"
        ></span>
      </button>
    </div>

    <!-- :key re-creates the panel on every tab change, so its entrance animation plays again -->
    <div
      :id="'feature-panel-' + current.id"
      :key="current.id"
      class="feature-panel card p-3 p-md-4"
      role="tabpanel"
      :aria-labelledby="'feature-tab-' + current.id"
    >
      <div class="row g-4 align-items-center">
        <div class="col-12 col-lg-5">
          <p class="solves d-inline-flex align-items-center gap-2 rounded-pill text-caption fw-semibold mb-3">
            <i class="bi bi-lightning-charge-fill" aria-hidden="true"></i>Solves: {{ current.solves }}
          </p>
          <h3 class="h2 mb-3">{{ current.title }}</h3>
          <ul class="list-unstyled d-flex flex-column gap-2 mb-4">
            <li v-for="(point, index) in current.points" :key="point" class="point d-flex gap-2" :style="{ animationDelay: 120 + index * 70 + 'ms' }">
              <i class="bi bi-check-circle-fill text-primary" aria-hidden="true"></i>
              <span>{{ point }}</span>
            </li>
          </ul>
          <RouterLink :to="current.to" class="btn btn-outline-primary fw-semibold">
            Open {{ current.label }} <i class="bi bi-arrow-right" aria-hidden="true"></i>
          </RouterLink>
        </div>
        <div class="col-12 col-lg-7">
          <FeaturePreview :feature="current.id" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tab-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 16px;
}

.feature-tab {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  padding: 12px 14px;
  overflow: hidden;
  border: 1.5px solid var(--bs-border-color);
  border-radius: 14px;
  background-color: var(--tt-surface);
  color: var(--bs-body-color);
  transition: border-color 0.2s ease, background-color 0.2s ease, transform 0.2s ease;
}
.feature-tab:hover {
  transform: translateY(-2px);
  border-color: var(--bs-primary-border-subtle);
}
.feature-tab:focus-visible {
  outline: 2px solid var(--bs-primary);
  outline-offset: 2px;
}
.feature-tab.is-active {
  border-color: var(--bs-primary);
  background-color: var(--bs-primary-bg-subtle);
}
.tab-icon {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  font-size: 17px;
  color: var(--bs-primary);
  background-color: var(--bs-primary-bg-subtle);
  transition: background-color 0.2s ease, color 0.2s ease;
}
.feature-tab.is-active .tab-icon {
  color: #fff;
  background-color: var(--bs-primary);
}

/* the bar along the bottom of the active tab fills in 6 seconds */
.tab-timer {
  position: absolute;
  left: 0;
  bottom: 0;
  height: 3px;
  width: 100%;
  background-color: var(--bs-primary);
  transform-origin: left;
  animation: fill-bar 6s linear forwards;
}
.tab-timer.is-paused {
  animation-play-state: paused;
}
@keyframes fill-bar {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

.feature-panel {
  border-radius: 18px;
  background-color: var(--tt-surface);
  animation: panel-in 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.solves {
  padding: 4px 12px;
  color: var(--tt-accent-text);
  background-color: var(--bs-danger-bg-subtle);
}
.point {
  animation: point-in 0.35s ease-out backwards;
}
.point .bi {
  margin-top: 2px;
}

@keyframes panel-in {
  from { opacity: 0; transform: translateY(10px); }
}
@keyframes point-in {
  from { opacity: 0; transform: translateX(-8px); }
}

/* phones: the four tabs make a 2 x 2 grid */
@media (max-width: 767.98px) {
  .tab-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (prefers-reduced-motion: reduce) {
  .feature-panel,
  .point {
    animation: none;
  }
  .feature-tab:hover {
    transform: none;
  }
}
</style>
