<script setup>
import { onMounted, onUnmounted } from 'vue'

// shown after a new team post is published: a flag is planted on a hill
defineProps({
  teamName: { type: String, required: true },
  eventName: { type: String, default: '' },
})

const emit = defineEmits(['invite', 'close'])

function onKeydown(event) {
  if (event.key === 'Escape') emit('close')
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="modal-backdrop fade show celebrate-backdrop"></div>
  <div class="celebrate-wrap d-flex align-items-center justify-content-center p-3" role="dialog" aria-modal="true" aria-labelledby="celebrate-title" @click.self="emit('close')">
    <div class="celebrate-card card shadow-lg text-center p-4">
      <div class="celebrate-scene position-relative mx-auto" aria-hidden="true">
        <div class="flag-pole">
          <span class="flag"></span>
        </div>
        <div class="hill"></div>
      </div>

      <h2 id="celebrate-title" class="h3 fw-bold mt-3 mb-1">{{ teamName }} is live!</h2>
      <p class="text-body-secondary mb-4">
        <template v-if="eventName">People looking at {{ eventName }} can now find your team and ask to join.</template>
        <template v-else>People can now find your team and ask to join.</template>
      </p>

      <div class="d-flex flex-column flex-sm-row gap-2 justify-content-center">
        <button class="btn btn-primary fw-semibold px-4" type="button" @click="emit('invite')">
          <i class="bi bi-person-plus me-1"></i> Invite friends
        </button>
        <button class="btn btn-outline-primary fw-semibold px-4" type="button" @click="emit('close')">Done</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.celebrate-backdrop {
  z-index: 1060;
}
.celebrate-wrap {
  position: fixed;
  inset: 0;
  z-index: 1065;
}
.celebrate-card {
  width: min(420px, 100%);
  border-radius: 20px;
  animation: card-pop 0.35s cubic-bezier(0.2, 0.9, 0.3, 1.3);
}

.celebrate-scene {
  width: 200px;
  height: 140px;
}

/* peach hill the flag is planted on */
.hill {
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 170px;
  height: 56px;
  margin-left: -85px;
  border-radius: 85px 85px 0 0;
  background: var(--tt-peach);
}

/* the pole shoots up out of the hill, then the flag unfurls and waves */
.flag-pole {
  position: absolute;
  left: 50%;
  bottom: 50px;
  width: 4px;
  height: 78px;
  margin-left: -2px;
  border-radius: 2px;
  background: var(--bs-body-color);
  transform-origin: bottom;
  transform: scaleY(0);
  animation: pole-up 0.4s cubic-bezier(0.3, 1.4, 0.5, 1) 0.15s forwards;
}
.flag {
  position: absolute;
  left: 4px;
  top: 0;
  width: 44px;
  height: 28px;
  background: var(--bs-primary);
  clip-path: polygon(0 0, 100% 0, 78% 50%, 100% 100%, 0 100%);
  transform-origin: left;
  transform: scaleX(0);
  animation: flag-out 0.35s ease-out 0.5s forwards, flag-wave 1.2s ease-in-out 0.9s infinite;
}

@keyframes card-pop {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes pole-up {
  to { transform: scaleY(1); }
}
@keyframes flag-out {
  to { transform: scaleX(1); }
}
@keyframes flag-wave {
  0%, 100% { transform: scaleX(1) skewY(0deg); }
  50% { transform: scaleX(0.92) skewY(4deg); }
}

/* people who turn off motion see the planted flag straight away */
@media (prefers-reduced-motion: reduce) {
  .celebrate-card,
  .flag-pole,
  .flag {
    animation: none;
  }
  .flag-pole,
  .flag {
    transform: none;
  }
}
</style>
