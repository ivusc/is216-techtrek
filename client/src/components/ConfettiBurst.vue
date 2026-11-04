<script setup>
import { onMounted, onUnmounted, ref } from 'vue'

// two party-popper bursts of confetti from the bottom corners of the screen. The pieces shoot up,
// slow down, then flutter down past the bottom. It removes itself once the pieces have fallen.
const props = defineProps({
  pieces: { type: Number, default: 36 } // per corner
})

const COLOURS = ['#5b3fe4', '#38b2e8', '#ef5d7a', '#f5a524', '#2fbf71', '#b9a8ff']

// a fixed "random" spread, so every burst looks lively but tests stay predictable
function wobble(index, salt) {
  const x = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453
  return x - Math.floor(x)
}

function makePiece(index, side) {
  const spread = wobble(index, side === 'left' ? 1 : 2)
  const height = wobble(index, 3)
  const across = 18 + spread * 52 // how far across the screen it flies, in vw
  return {
    key: side + index,
    side,
    style: {
      '--dx': (side === 'left' ? across : -across) + 'vw',
      '--peak': -(45 + height * 40) + 'vh',
      '--spin': (wobble(index, 4) > 0.5 ? 1 : -1) * (360 + wobble(index, 5) * 540) + 'deg',
      '--delay': (wobble(index, 6) * 0.25).toFixed(2) + 's',
      '--duration': (1.9 + wobble(index, 7) * 0.9).toFixed(2) + 's',
      width: (6 + wobble(index, 8) * 6).toFixed(0) + 'px',
      height: (wobble(index, 9) > 0.6 ? 6 : 12 + wobble(index, 10) * 4).toFixed(0) + 'px',
      background: COLOURS[index % COLOURS.length],
      borderRadius: wobble(index, 9) > 0.6 ? '50%' : '2px'
    }
  }
}

const confetti = [
  ...Array.from({ length: props.pieces }, (_, index) => makePiece(index, 'left')),
  ...Array.from({ length: props.pieces }, (_, index) => makePiece(index, 'right'))
]

const visible = ref(true)
let timer = null
onMounted(() => {
  timer = setTimeout(() => (visible.value = false), 3600)
})
onUnmounted(() => clearTimeout(timer))
</script>

<template>
  <div v-if="visible" class="confetti-layer" aria-hidden="true">
    <span v-for="piece in confetti" :key="piece.key" class="confetti-piece" :class="piece.side" :style="piece.style"></span>
  </div>
</template>

<style scoped>
.confetti-layer {
  position: fixed;
  inset: 0;
  z-index: 1060; /* over the congratulations window; it never blocks clicks */
  overflow: hidden;
  pointer-events: none;
}

.confetti-piece {
  position: absolute;
  bottom: -16px;
  opacity: 0;
  will-change: transform, opacity;
  animation: pop var(--duration) cubic-bezier(0.15, 0.6, 0.35, 1) var(--delay) forwards;
}
.confetti-piece.left {
  left: 2vw;
}
.confetti-piece.right {
  right: 2vw;
}

/* up fast, hang at the top, then drift down past the bottom while spinning */
@keyframes pop {
  0% {
    opacity: 1;
    transform: translate(0, 0) rotate(0deg) scale(0.6);
  }
  35% {
    opacity: 1;
    transform: translate(calc(var(--dx) * 0.7), var(--peak)) rotate(calc(var(--spin) * 0.4)) scale(1);
  }
  100% {
    opacity: 0.9;
    transform: translate(var(--dx), 20vh) rotate(var(--spin)) scale(1);
  }
}

/* no flying confetti for people who turn off motion */
@media (prefers-reduced-motion: reduce) {
  .confetti-layer {
    display: none;
  }
}
</style>
