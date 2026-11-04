<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

// the loading screen used on every page: a little compass hops along a dotted trail
// while the caption changes every couple of seconds
const props = defineProps({
  title: { type: String, default: 'Loading' },
  captions: { type: Array, default: () => ['Packing snacks for the trek…', 'Almost there…'] },
  // compact: smaller and with less space around it, for loading inside a card or panel
  compact: { type: Boolean, default: false },
})

const captionIndex = ref(0)
let timer = null

onMounted(() => {
  timer = setInterval(() => {
    captionIndex.value = (captionIndex.value + 1) % props.captions.length
  }, 1800)
})
onUnmounted(() => clearInterval(timer))
</script>

<template>
  <div
    class="trek-loader d-flex flex-column align-items-center text-center"
    :class="compact ? 'trek-compact py-3' : 'py-5'"
    role="status"
    aria-live="polite"
  >
    <div class="trek-scene position-relative">
      <!-- things the compass "finds" pop up around it -->
      <span class="trek-find find-1 rounded-circle bg-tt-peach d-flex align-items-center justify-content-center"><i class="bi bi-briefcase"></i></span>
      <span class="trek-find find-2 rounded-circle bg-info-subtle text-primary d-flex align-items-center justify-content-center"><i class="bi bi-trophy"></i></span>
      <span class="trek-find find-3 rounded-circle bg-danger-subtle text-tt-accent d-flex align-items-center justify-content-center"><i class="bi bi-code-slash"></i></span>

      <div class="trek-hop">
        <div class="trek-compass rounded-circle bg-primary d-flex align-items-center justify-content-center">
          <span class="trek-needle"></span>
          <span class="trek-pin rounded-circle"></span>
        </div>
      </div>
      <div class="trek-shadow rounded-circle"></div>

      <!-- the dotted trail it walks along -->
      <svg class="trek-trail" viewBox="0 0 220 24" aria-hidden="true">
        <path d="M4 16 C 50 4, 90 24, 130 12 S 200 6, 216 14" />
      </svg>
    </div>

    <h2 class="trek-title fw-bold mt-3 mb-1">{{ title }}</h2>
    <Transition name="trek-fade" mode="out-in">
      <p :key="captionIndex" class="trek-caption text-body-secondary mb-0">{{ captions[captionIndex] }}</p>
    </Transition>
  </div>
</template>

<style scoped>
.trek-scene {
  width: 240px;
  height: 170px;
}

/* compass: hops up and down, the needle swings while it looks around */
.trek-hop {
  position: absolute;
  left: 50%;
  top: 22px;
  margin-left: -40px;
  animation: trek-hop 1.2s cubic-bezier(0.45, 0, 0.55, 1) infinite;
}
.trek-compass {
  position: relative;
  width: 80px;
  height: 80px;
  border: 5px solid #fff;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}
.trek-needle {
  position: absolute;
  width: 10px;
  height: 52px;
  /* coral tip pointing north, cream tail */
  background: linear-gradient(to bottom, var(--tt-accent) 50%, var(--tt-cream) 50%);
  clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
  animation: trek-needle 2.4s ease-in-out infinite;
}
.trek-pin {
  position: absolute;
  width: 10px;
  height: 10px;
  background-color: #fff;
}

/* the shadow shrinks while the compass is in the air */
.trek-shadow {
  position: absolute;
  left: 50%;
  top: 116px;
  width: 64px;
  height: 10px;
  margin-left: -32px;
  background-color: rgba(28, 26, 61, 0.15);
  animation: trek-shadow 1.2s cubic-bezier(0.45, 0, 0.55, 1) infinite;
}

.trek-trail {
  position: absolute;
  left: 10px;
  bottom: 0;
  width: 220px;
  height: 24px;
}
.trek-trail path {
  fill: none;
  stroke: var(--bs-primary);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-dasharray: 2 10;
  opacity: 0.45;
  animation: trek-walk 1.2s linear infinite;
}

/* the 3 little finds pop up one after another */
.trek-find {
  position: absolute;
  width: 34px;
  height: 34px;
  font-size: 16px;
  opacity: 0;
  animation: trek-pop 3.6s ease-out infinite;
}
.find-1 {
  left: 30px;
  top: 40px;
}
.find-2 {
  right: 26px;
  top: 18px;
  animation-delay: 1.2s;
}
.find-3 {
  right: 40px;
  top: 92px;
  animation-delay: 2.4s;
}

.trek-title {
  font-size: 1.375rem;
}
.trek-caption {
  font-size: 1rem;
  min-height: 1.5em;
}

.trek-fade-enter-active,
.trek-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.trek-fade-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.trek-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@keyframes trek-hop {
  0%, 100% { transform: translateY(0) scale(1.04, 0.96); }
  50% { transform: translateY(-22px) scale(1, 1); }
}
@keyframes trek-shadow {
  0%, 100% { transform: scaleX(1); opacity: 1; }
  50% { transform: scaleX(0.6); opacity: 0.5; }
}
@keyframes trek-needle {
  0%, 100% { transform: rotate(-35deg); }
  50% { transform: rotate(40deg); }
}
@keyframes trek-walk {
  to { stroke-dashoffset: -24; }
}
@keyframes trek-pop {
  0% { opacity: 0; transform: translateY(8px) scale(0.6); }
  12% { opacity: 1; transform: translateY(0) scale(1.08); }
  20% { transform: translateY(0) scale(1); }
  30% { opacity: 1; }
  40%, 100% { opacity: 0; transform: translateY(-14px) scale(0.9); }
}

/* compact: the same scene at 70% size */
.trek-compact .trek-scene {
  transform: scale(0.7);
  margin: -26px 0;
}
.trek-compact .trek-title {
  font-size: 1.125rem;
}
.trek-compact .trek-caption {
  font-size: 0.9375rem;
}

/* people who turn off motion get a still compass */
@media (prefers-reduced-motion: reduce) {
  .trek-hop,
  .trek-shadow,
  .trek-needle,
  .trek-trail path,
  .trek-find {
    animation: none;
  }
  .trek-find {
    opacity: 1;
  }
}
</style>
