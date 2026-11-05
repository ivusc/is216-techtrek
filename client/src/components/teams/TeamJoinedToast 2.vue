<script setup>
import { onMounted, onUnmounted } from 'vue'
import UserAvatar from '@/components/UserAvatar.vue'

// pops up when someone joins a team (you accept their request, or you accept an invite):
// two avatars slide together, a heart pops up between them with a little confetti burst.
// It closes by itself after a few seconds.
defineProps({
  title: { type: String, default: 'Welcome aboard!' },
  message: { type: String, required: true },
  // the two people meeting: { id, name, avatarUpdatedAt }
  left: { type: Object, required: true },
  right: { type: Object, required: true }
})

const emit = defineEmits(['close'])

// 8 confetti pieces, spread evenly around the heart
const confetti = Array.from({ length: 8 }, (_, index) => ({
  angle: index * 45 + 22,
  colour: ['var(--bs-primary)', 'var(--tt-sky)', 'var(--tt-accent)', 'var(--tt-status-interview)'][index % 4]
}))

let timer = null
onMounted(() => {
  timer = setTimeout(() => emit('close'), 5500)
})
onUnmounted(() => clearTimeout(timer))
</script>

<template>
  <div class="joined-toast card shadow-lg d-flex flex-row align-items-center gap-3" role="status" aria-live="polite">
    <div class="meet-scene position-relative flex-shrink-0" aria-hidden="true">
      <span class="meet-person meet-left">
        <UserAvatar :user-id="left.id ?? ''" :name="left.name" :avatar-updated-at="left.avatarUpdatedAt ?? ''" :size="40" />
      </span>
      <span class="meet-person meet-right">
        <UserAvatar :user-id="right.id ?? ''" :name="right.name" :avatar-updated-at="right.avatarUpdatedAt ?? ''" :size="40" />
      </span>

      <span class="meet-heart d-flex align-items-center justify-content-center rounded-circle bg-white">
        <i class="bi bi-heart-fill"></i>
      </span>
      <span
        v-for="(piece, index) in confetti"
        :key="index"
        class="meet-confetti"
        :style="{ '--angle': piece.angle + 'deg', background: piece.colour }"
      ></span>
    </div>

    <div class="joined-text flex-grow-1 min-w-0">
      <p class="fw-semibold mb-0">{{ title }}</p>
      <p class="small text-body-secondary mb-0">{{ message }}</p>
    </div>

    <button class="btn-close flex-shrink-0" type="button" aria-label="Close" @click="emit('close')"></button>
  </div>
</template>

<style scoped>
.joined-toast {
  position: fixed;
  left: 50%;
  bottom: 24px;
  z-index: 1080; /* above modals and side panels */
  width: min(440px, calc(100vw - 32px));
  padding: 14px 16px;
  transform: translateX(-50%);
  animation: toast-in 0.4s cubic-bezier(0.2, 0.9, 0.3, 1.2);
}

/* above the phone tab bar */
@media (max-width: 767.98px) {
  .joined-toast {
    bottom: 96px;
  }
}

.meet-scene {
  width: 76px;
  height: 52px;
}

/* the two avatars start apart and slide in until they just overlap */
.meet-person {
  position: absolute;
  bottom: 0;
  display: inline-flex;
  border-radius: 50%;
  box-shadow: 0 2px 6px rgba(28, 26, 61, 0.12);
}
.meet-left {
  left: 4px;
  z-index: 1;
  animation: slide-left 0.55s cubic-bezier(0.3, 1.4, 0.5, 1) 0.15s backwards;
}
.meet-right {
  right: 4px;
  animation: slide-right 0.55s cubic-bezier(0.3, 1.4, 0.5, 1) 0.15s backwards;
}

/* the heart pops up above where they meet, then bobs gently */
.meet-heart {
  position: absolute;
  left: 50%;
  top: -6px;
  z-index: 2;
  width: 26px;
  height: 26px;
  margin-left: -13px;
  font-size: 14px;
  color: var(--tt-accent);
  box-shadow: 0 2px 8px rgba(239, 93, 122, 0.35);
  animation:
    heart-pop 0.5s cubic-bezier(0.2, 0.9, 0.3, 1.6) 0.6s backwards,
    heart-bob 1.6s ease-in-out 1.2s infinite;
}

/* confetti bursts out from the heart and fades */
.meet-confetti {
  position: absolute;
  left: 50%;
  top: 7px;
  z-index: 1;
  width: 6px;
  height: 6px;
  margin-left: -3px;
  border-radius: 2px;
  opacity: 0;
  animation: confetti-burst 0.8s cubic-bezier(0.1, 0.7, 0.3, 1) 0.65s forwards;
}

/* the text fades in once the two have met */
.joined-text {
  animation: text-in 0.35s ease-out 0.45s backwards;
}

@keyframes toast-in {
  from { opacity: 0; transform: translate(-50%, 24px) scale(0.96); }
  to { opacity: 1; transform: translate(-50%, 0) scale(1); }
}
@keyframes slide-left {
  from { transform: translateX(-22px) rotate(-12deg); opacity: 0; }
}
@keyframes slide-right {
  from { transform: translateX(22px) rotate(12deg); opacity: 0; }
}
@keyframes heart-pop {
  from { transform: scale(0) rotate(-20deg); opacity: 0; }
}
@keyframes heart-bob {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-3px) scale(1.08); }
}
@keyframes confetti-burst {
  0% { opacity: 1; transform: rotate(var(--angle)) translateY(0) scale(1); }
  100% { opacity: 0; transform: rotate(var(--angle)) translateY(-30px) scale(0.4); }
}
@keyframes text-in {
  from { opacity: 0; transform: translateY(4px); }
}

/* people who turn off motion see the finished picture straight away, no confetti */
@media (prefers-reduced-motion: reduce) {
  .joined-toast,
  .meet-left,
  .meet-right,
  .meet-heart,
  .joined-text {
    animation: none;
  }
  .meet-confetti {
    display: none;
  }
}
</style>
