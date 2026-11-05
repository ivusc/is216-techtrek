<script setup>
import { computed } from 'vue'

// a small line chart of one role's practice scores: one point per session (its average out of 10),
// oldest on the left. Drawn as plain SVG in the card's text colour, so it works on the purple role card.
const props = defineProps({
  points: { type: Array, default: () => [] } // [{ completedAt, score }], oldest first
})

// drawing area: scores 0 to 10 run bottom to top, sessions spread evenly left to right
const WIDTH = 240
const HEIGHT = 64
const PAD_X = 6 // room for the dots at either end
const PAD_RIGHT = 30 // room for the latest score's label
const PAD_Y = 8

function xAt(index) {
  const count = props.points.length
  if (count === 1) return PAD_X
  return PAD_X + (index * (WIDTH - PAD_X - PAD_RIGHT)) / (count - 1)
}
function yAt(score) {
  return PAD_Y + ((10 - score) * (HEIGHT - 2 * PAD_Y)) / 10
}

const dots = computed(() =>
  props.points.map((point, index) => ({
    x: xAt(index),
    y: yAt(point.score),
    score: point.score,
    label: `${formatDay(point.completedAt)}: ${point.score} / 10`
  }))
)
const line = computed(() => dots.value.map((dot) => `${dot.x},${dot.y}`).join(' '))
const latest = computed(() => dots.value[dots.value.length - 1])

// "5 → 8.5 over 4 sessions", for the caption and screen readers
const summary = computed(() => {
  const count = props.points.length
  if (count === 0) return ''
  if (count === 1) return `${props.points[0].score} / 10 after 1 session`
  return `${props.points[0].score} → ${latest.value.score} over ${count} sessions`
})

function formatDay(value) {
  return new Date(value).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })
}
</script>

<template>
  <figure v-if="points.length" class="score-trend mb-0">
    <svg :viewBox="`0 0 ${WIDTH} ${HEIGHT}`" class="trend-svg" role="img" :aria-label="`Score trend: ${summary}`">
      <!-- recessive guides at 0, 5 and 10 -->
      <line v-for="score in [0, 5, 10]" :key="score" class="guide" :x1="0" :x2="WIDTH - PAD_RIGHT + PAD_X" :y1="yAt(score)" :y2="yAt(score)" />
      <polyline v-if="dots.length > 1" class="trend-line" :points="line" />
      <circle v-for="(dot, index) in dots" :key="index" class="trend-dot" :cx="dot.x" :cy="dot.y" r="4">
        <title>{{ dot.label }}</title>
      </circle>
      <!-- the latest score, labelled directly -->
      <text class="trend-label" :x="latest.x + 8" :y="latest.y + 4">{{ latest.score }}</text>
    </svg>
    <figcaption class="small trend-caption">{{ summary }}</figcaption>
  </figure>
  <p v-else class="small trend-caption mb-0">Finish a session to start your score trend.</p>
</template>

<style scoped>
.trend-svg {
  display: block;
  width: 100%;
  max-width: 280px;
  height: auto;
  overflow: visible;
}
.guide {
  stroke: currentColor;
  stroke-opacity: 0.2;
  stroke-width: 1;
  stroke-dasharray: 2 3;
}
.trend-line {
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}
/* the dots get a ring in the card colour, so they stand off the line */
.trend-dot {
  fill: currentColor;
  stroke: var(--bs-primary);
  stroke-width: 2;
  cursor: default;
}
.trend-label {
  fill: currentColor;
  font-size: 12px;
  font-weight: 700;
}
.trend-caption {
  opacity: 0.85;
}
</style>
