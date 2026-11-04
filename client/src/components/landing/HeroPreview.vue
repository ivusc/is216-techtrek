<script setup>
import { ref } from 'vue'

// a pretend slice of the app next to the hero headline: this week's applications, a team,
// a notification and an interview score. It tilts a little towards the mouse.

// how far it is tilted, in degrees (set from the mouse position)
const tiltX = ref(0)
const tiltY = ref(0)

// @mousemove: tilt towards the pointer, at most 6 degrees each way
function tilt(event) {
  const box = event.currentTarget.getBoundingClientRect()
  const x = (event.clientX - box.left) / box.width - 0.5 // -0.5 (left edge) to 0.5 (right edge)
  const y = (event.clientY - box.top) / box.height - 0.5
  tiltY.value = x * 12
  tiltX.value = -y * 12
}

// @mouseleave: back to flat
function resetTilt() {
  tiltX.value = 0
  tiltY.value = 0
}

const applications = [
  { org: 'Grab', role: 'Software Engineer Intern', stage: 'Interview', when: 'Thu 2pm', status: 'interview' },
  { org: 'Shopee', role: 'Data Analyst Intern', stage: 'Applied', when: '3 days ago', status: 'applied' },
  { org: 'Hack&Roll', role: 'Hackathon', stage: 'Team formed', when: 'Closes 12 Nov', status: 'team' }
]
</script>

<template>
  <div class="hero-preview" aria-hidden="true" @mousemove="tilt" @mouseleave="resetTilt">
    <div class="preview-stage" :style="{ transform: `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)` }">
      <!-- the main card: a mini tracker -->
      <div class="card preview-main p-3">
        <div class="d-flex align-items-center justify-content-between mb-3">
          <div>
            <p class="text-overline text-body-tertiary mb-0">THIS WEEK</p>
            <p class="h3 mb-0">Your applications</p>
          </div>
          <span class="badge rounded-pill bg-primary-subtle text-primary-emphasis">3 active</span>
        </div>

        <div class="d-flex flex-column gap-2">
          <div v-for="app in applications" :key="app.org" class="preview-row d-flex align-items-center gap-3 rounded-3 p-2">
            <span class="org-tile rounded-3 d-flex align-items-center justify-content-center fw-bold">{{ app.org.slice(0, 2).toUpperCase() }}</span>
            <span class="flex-grow-1 min-w-0">
              <span class="d-block fw-semibold text-truncate">{{ app.role }}</span>
              <span class="d-block text-caption text-body-secondary">{{ app.org }} · {{ app.when }}</span>
            </span>
            <span class="stage-chip text-caption fw-semibold" :style="{ '--stage': `var(--tt-status-${app.status})` }">
              <span class="stage-dot"></span>{{ app.stage }}
            </span>
          </div>
        </div>

        <div class="d-flex align-items-center gap-2 mt-3 pt-3 border-top">
          <i class="bi bi-calendar-event text-primary"></i>
          <span class="small text-body-secondary">Next deadline: <strong class="text-body">Fri, 14 Nov</strong></span>
        </div>
      </div>

      <!-- floating: a team with an open role -->
      <div class="card float-card float-team p-3">
        <p class="text-caption text-body-secondary mb-2">Pixel Pushers · 3 of 4 spots filled</p>
        <div class="d-flex align-items-center">
          <span class="mini-avatar" style="background: var(--tt-accent)">AT</span>
          <span class="mini-avatar" style="background: var(--tt-sky)">EN</span>
          <span class="mini-avatar" style="background: var(--bs-primary)">YOU</span>
          <span class="mini-avatar mini-open"><i class="bi bi-plus-lg"></i></span>
        </div>
      </div>

      <!-- floating: a notification -->
      <div class="card float-card float-note d-flex flex-row align-items-center gap-2 px-3 py-2">
        <span class="note-icon rounded-circle d-flex align-items-center justify-content-center"><i class="bi bi-check-circle-fill"></i></span>
        <span class="small"><strong>You're in!</strong> Joined as Frontend developer</span>
      </div>

      <!-- floating: an interview score -->
      <div class="card float-card float-score d-flex flex-row align-items-center gap-2 px-3 py-2">
        <span class="score-ring d-flex align-items-center justify-content-center fw-bold">8</span>
        <span class="small lh-sm"><span class="d-block fw-semibold">Answer scored 8/10</span><span class="text-body-secondary">Interview practice</span></span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hero-preview {
  position: relative;
  padding: 40px 28px 56px;
}

/* the tilt eases back when the mouse leaves */
.preview-stage {
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.25s ease-out;
}

.preview-main {
  position: relative;
  z-index: 1;
  max-width: 420px;
  margin: 0 auto;
  border-radius: 18px;
  background-color: var(--tt-surface);
  box-shadow: 0 30px 60px -24px rgba(28, 26, 61, 0.35);
}

.preview-row {
  background-color: var(--bs-secondary-bg);
}
.org-tile {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  font-size: 13px;
  color: var(--bs-primary);
  background-color: var(--bs-primary-bg-subtle);
}
.stage-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}
.stage-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--stage);
}

/* the small cards float around the main one and bob gently, each at its own pace */
.float-card {
  position: absolute;
  z-index: 2;
  border-radius: 14px;
  background-color: var(--tt-surface);
  box-shadow: 0 18px 36px -16px rgba(28, 26, 61, 0.4);
  animation: bob 5s ease-in-out infinite;
}
.float-team {
  top: 0;
  right: 0;
  animation-delay: -1s;
}
.float-note {
  bottom: 8px;
  left: 0;
  animation-delay: -2.5s;
}
.float-score {
  bottom: 0;
  right: 12px;
  animation-delay: -3.8s;
}

.mini-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  margin-right: -8px;
  border-radius: 50%;
  border: 2px solid var(--tt-surface);
  font-size: 10px;
  font-weight: 700;
  color: #fff;
}
.mini-open {
  border: 2px dashed var(--bs-primary);
  color: var(--bs-primary);
  background-color: var(--bs-primary-bg-subtle);
  font-size: 14px;
}

.note-icon {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  color: var(--bs-success-text-emphasis);
  background-color: var(--bs-success-bg-subtle);
}

/* a ring that is 80% full (8 out of 10) */
.score-ring {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  border-radius: 50%;
  font-size: 13px;
  color: var(--bs-primary);
  background:
    radial-gradient(closest-side, var(--tt-surface) 72%, transparent 74%),
    conic-gradient(var(--bs-primary) 80%, var(--bs-primary-bg-subtle) 0);
}

@keyframes bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

/* phones: no room around the main card, so the team card sits above it, the score below it,
   and the notification is left out */
@media (max-width: 575.98px) {
  .hero-preview {
    padding: 76px 0 64px;
  }
  .float-team {
    top: -66px;
    right: 0;
  }
  .float-note {
    display: none !important;
  }
  .float-score {
    bottom: -54px;
    right: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .float-card {
    animation: none;
  }
  .preview-stage {
    transition: none;
    transform: none !important;
  }
}
</style>
