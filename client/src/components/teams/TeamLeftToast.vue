<script setup>
import { onMounted, onUnmounted } from 'vue'
import UserAvatar from '@/components/UserAvatar.vue'

// pops up after leaving a team: my avatar waves goodbye to the team, walks out through a door,
// and the door swings shut. It closes by itself after a few seconds.
defineProps({
  teamName: { type: String, required: true },
  // me: { id, name, avatarUpdatedAt }; team: up to 3 people still in the team, same shape
  me: { type: Object, required: true },
  team: { type: Array, default: () => [] }
})

const emit = defineEmits(['close'])

let timer = null
onMounted(() => {
  timer = setTimeout(() => emit('close'), 5500)
})
onUnmounted(() => clearTimeout(timer))
</script>

<template>
  <div class="left-toast card shadow-lg d-flex flex-row align-items-center gap-3" role="status" aria-live="polite">
    <div class="leave-scene position-relative flex-shrink-0" aria-hidden="true">
      <!-- the team stays behind -->
      <span class="leave-team d-flex">
        <span v-for="(person, index) in team.slice(0, 2)" :key="person.id || index" class="leave-teammate">
          <UserAvatar :user-id="person.id ?? ''" :name="person.name" :avatar-updated-at="person.avatarUpdatedAt ?? ''" :size="28" />
        </span>
      </span>

      <!-- me: wave, then walk to the door and fade through it -->
      <span class="leave-me">
        <UserAvatar :user-id="me.id ?? ''" :name="me.name" :avatar-updated-at="me.avatarUpdatedAt ?? ''" :size="32" />
        <span class="leave-wave d-flex align-items-center justify-content-center rounded-circle bg-white">
          <span class="wave-emoji">👋</span>
        </span>
      </span>

      <!-- the door: open, then it swings shut behind me -->
      <span class="leave-door">
        <i class="bi bi-door-open-fill door-open"></i>
        <i class="bi bi-door-closed-fill door-closed"></i>
      </span>
    </div>

    <div class="left-text flex-grow-1 min-w-0">
      <p class="fw-semibold mb-0">See you around!</p>
      <p class="small text-body-secondary mb-0">You left {{ teamName }}. Your spot is open for someone new.</p>
    </div>

    <button class="btn-close flex-shrink-0" type="button" aria-label="Close" @click="emit('close')"></button>
  </div>
</template>

<style scoped>
.left-toast {
  position: fixed;
  left: 50%;
  bottom: 24px;
  z-index: 1080; /* above modals */
  width: min(440px, calc(100vw - 32px));
  padding: 14px 16px;
  transform: translateX(-50%);
  animation: toast-in 0.4s cubic-bezier(0.2, 0.9, 0.3, 1.2);
}

/* above the phone tab bar */
@media (max-width: 767.98px) {
  .left-toast {
    bottom: 96px;
  }
}

.leave-scene {
  width: 104px;
  height: 52px;
}

/* the team on the left, slightly faded so I stand out */
.leave-team {
  position: absolute;
  left: 0;
  bottom: 4px;
}
.leave-teammate {
  display: inline-flex;
  border-radius: 50%;
  opacity: 0.85;
}
.leave-teammate + .leave-teammate {
  margin-left: -10px;
}

/* me: start next to the team, wave, then walk right into the door and fade away */
.leave-me {
  position: absolute;
  left: 30px;
  bottom: 2px;
  z-index: 2;
  display: inline-flex;
  border-radius: 50%;
  box-shadow: 0 2px 6px rgba(28, 26, 61, 0.15);
  animation: walk-out 1s cubic-bezier(0.5, 0, 0.75, 0.4) 1.25s forwards;
}

/* the waving hand bobs side to side a few times before I go */
.leave-wave {
  position: absolute;
  top: -12px;
  right: -10px;
  width: 20px;
  height: 20px;
  font-size: 12px;
  line-height: 1;
  box-shadow: 0 1px 4px rgba(28, 26, 61, 0.18);
  transform-origin: 50% 90%;
  animation:
    wave-in 0.3s ease-out 0.35s backwards,
    wave 0.32s ease-in-out 0.65s 3 alternate;
}

/* the door on the right */
.leave-door {
  position: absolute;
  right: 0;
  bottom: 2px;
  width: 30px;
  height: 36px;
  font-size: 30px;
  line-height: 1;
  color: var(--bs-primary);
}
.leave-door .bi {
  position: absolute;
  inset: 0;
}
.door-closed {
  opacity: 0;
  animation: door-shut 0.25s ease-out 2.2s forwards;
}
.door-open {
  animation: door-hide 0.25s ease-out 2.2s forwards;
}

.left-text {
  animation: text-in 0.35s ease-out 0.4s backwards;
}

@keyframes toast-in {
  from { opacity: 0; transform: translate(-50%, 24px) scale(0.96); }
  to { opacity: 1; transform: translate(-50%, 0) scale(1); }
}
@keyframes wave-in {
  from { opacity: 0; transform: scale(0.3); }
}
@keyframes wave {
  from { transform: rotate(-18deg); }
  to { transform: rotate(18deg); }
}
/* a little hop on each step, then shrink into the doorway */
@keyframes walk-out {
  0% { transform: translate(0, 0); opacity: 1; }
  25% { transform: translate(12px, -4px); }
  50% { transform: translate(26px, 0); }
  75% { transform: translate(38px, -3px) scale(0.85); opacity: 0.8; }
  100% { transform: translate(48px, 0) scale(0.4); opacity: 0; }
}
@keyframes door-shut {
  0% { opacity: 0; transform: scaleX(1.25); }
  100% { opacity: 1; transform: scaleX(1); }
}
@keyframes door-hide {
  to { opacity: 0; }
}
@keyframes text-in {
  from { opacity: 0; transform: translateY(4px); }
}

/* people who turn off motion see the end picture straight away: team left behind, door shut */
@media (prefers-reduced-motion: reduce) {
  .left-toast,
  .leave-wave,
  .left-text {
    animation: none;
  }
  .leave-me {
    display: none;
  }
  .door-open {
    display: none;
  }
  .door-closed {
    opacity: 1;
    animation: none;
  }
}
</style>
