<script setup>
import { onMounted, onUnmounted } from 'vue'

// pops up after a join request is sent: a paper plane flies along a dotted trail, then a tick and an Undo button.
// It closes by itself after a few seconds.
defineProps({
  teamName: { type: String, required: true },
  busy: { type: Boolean, default: false }, // true while Undo is running
})

const emit = defineEmits(['undo', 'close'])

let timer = null
onMounted(() => {
  timer = setTimeout(() => emit('close'), 7000)
})
onUnmounted(() => clearTimeout(timer))
</script>

<template>
  <div class="request-toast card shadow-lg d-flex flex-row align-items-center gap-3" role="status" aria-live="polite">
    <div class="plane-scene position-relative flex-shrink-0" aria-hidden="true">
      <svg class="plane-trail" viewBox="0 0 64 40">
        <path d="M2 34 C 18 34, 22 14, 40 16" />
      </svg>
      <span class="plane"><i class="bi bi-send-fill"></i></span>
      <span class="plane-tick rounded-circle bg-primary text-white d-flex align-items-center justify-content-center">
        <i class="bi bi-check-lg"></i>
      </span>
    </div>

    <div class="flex-grow-1 min-w-0">
      <p class="fw-semibold mb-0">Request sent!</p>
      <p class="small text-body-secondary mb-0 text-truncate">{{ teamName }} will see it in their requests.</p>
    </div>

    <button class="btn btn-sm btn-outline-primary fw-semibold" type="button" :disabled="busy" @click="emit('undo')">
      <i class="bi bi-arrow-counterclockwise me-1"></i>{{ busy ? 'Undoing...' : 'Undo' }}
    </button>
    <button class="btn-close" type="button" aria-label="Close" @click="emit('close')"></button>
  </div>
</template>

<style scoped>
.request-toast {
  position: fixed;
  left: 50%;
  bottom: 24px;
  z-index: 1080; /* above modals and side panels */
  width: min(440px, calc(100vw - 32px));
  padding: 14px 16px;
  transform: translateX(-50%);
  animation: toast-in 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.2);
}

/* above the phone tab bar */
@media (max-width: 767.98px) {
  .request-toast {
    bottom: 96px;
  }
}

.plane-scene {
  width: 64px;
  height: 40px;
}

/* dotted line that draws itself behind the plane */
.plane-trail {
  position: absolute;
  inset: 0;
}
.plane-trail path {
  fill: none;
  stroke: var(--bs-primary);
  stroke-width: 2;
  stroke-linecap: round;
  stroke-dasharray: 2 5;
  opacity: 0.5;
  clip-path: inset(0 100% 0 0);
  animation: trail-draw 0.9s ease-out forwards;
}

/* the plane flies up the trail, then fades as the tick pops in */
.plane {
  position: absolute;
  left: 0;
  top: 22px;
  font-size: 18px;
  color: var(--bs-primary);
  animation: plane-fly 0.9s ease-in forwards;
}

.plane-tick {
  position: absolute;
  right: 4px;
  top: 4px;
  width: 30px;
  height: 30px;
  font-size: 18px;
  opacity: 0;
  transform: scale(0.3);
  animation: tick-pop 0.4s cubic-bezier(0.2, 0.9, 0.3, 1.4) 0.8s forwards;
}

@keyframes toast-in {
  from { opacity: 0; transform: translate(-50%, 24px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}
@keyframes trail-draw {
  to { clip-path: inset(0 0 0 0); }
}
@keyframes plane-fly {
  0% { transform: translate(0, 0) rotate(-10deg); opacity: 1; }
  70% { opacity: 1; }
  100% { transform: translate(38px, -20px) rotate(-30deg) scale(0.6); opacity: 0; }
}
@keyframes tick-pop {
  to { opacity: 1; transform: scale(1); }
}

/* people who turn off motion see the tick straight away */
@media (prefers-reduced-motion: reduce) {
  .request-toast,
  .plane-trail path,
  .plane,
  .plane-tick {
    animation: none;
  }
  .plane {
    display: none;
  }
  .plane-trail path {
    clip-path: none;
  }
  .plane-tick {
    opacity: 1;
    transform: none;
  }
}
</style>
