<script setup>
// a small, pretend version of each feature, drawn with the same Bootstrap classes and colours as the app
defineProps({
  feature: { type: String, required: true } // discover | track | team | practise
})

const listings = [
  { type: 'Internship', css: 'bg-primary-subtle text-primary-emphasis', title: 'Software Engineer Intern', org: 'Grab', closes: 'Closes 14 Nov', match: true },
  { type: 'Hackathon', css: 'bg-info-subtle text-info-emphasis', title: 'Hack&Roll 2027', org: 'NUS Hackers', closes: 'Closes 12 Nov', match: false },
  { type: 'Internship', css: 'bg-primary-subtle text-primary-emphasis', title: 'Data Analyst Intern', org: 'Shopee', closes: 'Closes 20 Nov', match: true }
]

const columns = [
  { name: 'Saved', status: 'saved', cards: ['Product Intern'] },
  { name: 'Applied', status: 'applied', cards: ['Data Analyst', 'UX Intern'] },
  { name: 'Interview', status: 'interview', cards: ['Software Eng.'] },
  { name: 'Offer', status: 'offer', cards: ['Cloud Intern'] }
]

const people = [
  { initials: 'AT', name: 'Alicia', role: 'Team lead', colour: 'var(--tt-accent)', lead: true },
  { initials: 'EN', name: 'Ethan', role: 'Backend', colour: 'var(--tt-sky)' },
  { initials: 'You', name: 'You', role: 'Frontend', colour: 'var(--bs-primary)', you: true }
]
</script>

<template>
  <div class="feature-preview rounded-4 p-3" aria-hidden="true">
    <!-- Discover: one feed of jobs and hackathons -->
    <div v-if="feature === 'discover'">
      <div class="d-flex flex-wrap gap-2 mb-3">
        <span class="chip is-on">All</span>
        <span class="chip">Internships</span>
        <span class="chip">Hackathons</span>
        <span class="chip"><i class="bi bi-stars"></i> Based on your skills</span>
      </div>
      <div class="d-flex flex-column gap-2">
        <div v-for="(item, index) in listings" :key="item.title" class="mini-card d-flex align-items-center gap-3 p-2 pop-in" :style="{ animationDelay: index * 90 + 'ms' }">
          <span class="mini-logo rounded-3 d-flex align-items-center justify-content-center fw-bold">{{ item.org.slice(0, 2).toUpperCase() }}</span>
          <span class="flex-grow-1 min-w-0">
            <span class="d-flex align-items-center gap-2 mb-1">
              <span class="badge rounded-pill" :class="item.css">{{ item.type }}</span>
              <span v-if="item.match" class="text-caption text-primary fw-semibold"><i class="bi bi-stars"></i> Matches you</span>
            </span>
            <span class="d-block fw-semibold text-truncate">{{ item.title }}</span>
            <span class="d-block text-caption text-body-secondary">{{ item.org }} · {{ item.closes }}</span>
          </span>
          <span class="btn btn-sm btn-primary fw-semibold flex-shrink-0">+ Track</span>
        </div>
      </div>
    </div>

    <!-- Track: the board, from Saved to Offer -->
    <div v-else-if="feature === 'track'" class="board">
      <div v-for="(column, index) in columns" :key="column.name" class="board-col rounded-3 p-2 pop-in" :style="{ animationDelay: index * 90 + 'ms' }">
        <p class="d-flex align-items-center gap-1 text-caption fw-semibold mb-2">
          <span class="col-dot" :style="{ backgroundColor: `var(--tt-status-${column.status})` }"></span>{{ column.name }}
        </p>
        <div v-for="card in column.cards" :key="card" class="board-card rounded-3 p-2 mb-2" :class="{ 'is-offer': column.status === 'offer' }">
          <span class="d-block small fw-semibold text-truncate">{{ card }}</span>
          <span v-if="column.status === 'offer'" class="text-caption text-success-emphasis"><i class="bi bi-trophy-fill"></i> Offer!</span>
          <span v-else class="text-caption text-body-secondary">Due Fri</span>
        </div>
      </div>
      <span v-for="n in 6" :key="'c' + n" class="board-confetti" :style="{ '--n': n }"></span>
    </div>

    <!-- Team up: who is in, and the role still open -->
    <div v-else-if="feature === 'team'">
      <div class="d-flex justify-content-between align-items-baseline mb-1">
        <span class="fw-semibold">Pixel Pushers</span>
        <span class="text-caption text-primary fw-semibold">1 more person needed</span>
      </div>
      <div class="progress mb-3" style="height: 8px">
        <div class="progress-bar grow-bar" style="width: 75%"></div>
      </div>
      <div class="d-flex flex-wrap justify-content-around gap-3">
        <div v-for="(person, index) in people" :key="person.name" class="text-center pop-in" :style="{ animationDelay: index * 90 + 'ms' }">
          <span class="person-circle" :class="{ 'is-you': person.you }" :style="{ backgroundColor: person.colour }">
            {{ person.initials }}
            <span v-if="person.lead" class="lead-star"><i class="bi bi-star-fill"></i></span>
          </span>
          <span class="d-block small fw-semibold mt-2">{{ person.name }}</span>
          <span class="d-block text-caption text-body-secondary">{{ person.role }}</span>
        </div>
        <div class="text-center pop-in" style="animation-delay: 270ms">
          <span class="person-circle is-open"><i class="bi bi-plus-lg"></i></span>
          <span class="d-block small fw-semibold mt-2 text-primary">Pitch &amp; demo</span>
          <span class="d-block text-caption text-body-secondary">Open role</span>
        </div>
      </div>
    </div>

    <!-- Practise: a question and its score -->
    <div v-else>
      <div class="mini-card p-3 mb-2 pop-in">
        <span class="badge rounded-pill bg-primary-subtle text-primary-emphasis mb-2">Behavioural · Software Engineer</span>
        <p class="fw-semibold mb-0">Tell us about a time you disagreed with a teammate. What did you do?</p>
      </div>
      <div class="mini-card d-flex align-items-center gap-3 p-3 pop-in" style="animation-delay: 120ms">
        <span class="big-ring d-flex align-items-center justify-content-center">
          <span class="text-stat">8</span><span class="small text-body-secondary">/10</span>
        </span>
        <span class="flex-grow-1 min-w-0 small">
          <span class="d-block fw-semibold mb-1">AI feedback</span>
          <span class="d-block"><i class="bi bi-plus-circle-fill text-success"></i> Clear example with a real outcome</span>
          <span class="d-block"><i class="bi bi-arrow-up-circle-fill text-primary"></i> Say what you learnt from it</span>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.feature-preview {
  position: relative;
  overflow: hidden;
  min-height: 280px;
  background:
    radial-gradient(circle at 100% 0%, var(--tt-sky-subtle) 0, transparent 45%),
    var(--bs-secondary-bg);
}

/* everything in a preview pops in, one after another */
.pop-in {
  animation: pop-in 0.4s cubic-bezier(0.2, 0.9, 0.3, 1.2) backwards;
}
@keyframes pop-in {
  from { opacity: 0; transform: translateY(12px) scale(0.97); }
}

.chip {
  padding: 4px 12px;
  border-radius: 999px;
  border: 1px solid var(--bs-border-color);
  background-color: var(--tt-surface);
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--bs-secondary-color);
}
.chip.is-on {
  color: #fff;
  border-color: var(--bs-primary);
  background-color: var(--bs-primary);
}

.mini-card {
  border-radius: 12px;
  background-color: var(--tt-surface);
  box-shadow: 0 1px 2px rgba(28, 26, 61, 0.06);
}
.mini-logo {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  font-size: 13px;
  color: var(--bs-primary);
  background-color: var(--bs-primary-bg-subtle);
}

/* Track */
.board {
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}
.board-col {
  background-color: var(--tt-surface-subtle);
  min-height: 210px;
}
.col-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.board-card {
  background-color: var(--tt-surface);
  box-shadow: 0 1px 2px rgba(28, 26, 61, 0.08);
}
/* the offer card gently glows */
.board-card.is-offer {
  outline: 2px solid var(--bs-success-border-subtle);
  animation: glow 2s ease-in-out infinite;
}
@keyframes glow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(47, 191, 113, 0.35); }
  50% { box-shadow: 0 0 0 6px rgba(47, 191, 113, 0); }
}
/* a little confetti over the Offer column, falling on a loop */
.board-confetti {
  position: absolute;
  top: -8px;
  right: calc(4% + var(--n) * 3%);
  width: 6px;
  height: 10px;
  border-radius: 2px;
  background-color: var(--tt-accent);
  animation: fall 2.4s linear infinite;
  animation-delay: calc(var(--n) * -0.4s);
}
.board-confetti:nth-child(even) {
  background-color: var(--tt-sky);
}
@keyframes fall {
  from { transform: translateY(0) rotate(0); opacity: 1; }
  to { transform: translateY(120px) rotate(300deg); opacity: 0; }
}

/* Team up */
.grow-bar {
  animation: grow 0.8s ease-out backwards 0.2s;
  transform-origin: left;
}
@keyframes grow {
  from { transform: scaleX(0); }
}
.person-circle {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: 3px solid var(--tt-surface);
  box-shadow: 0 2px 8px rgba(28, 26, 61, 0.15);
  font-weight: 700;
  color: #fff;
}
.person-circle.is-you {
  outline: 2px dashed var(--bs-primary);
  outline-offset: 3px;
}
.person-circle.is-open {
  border: 2px dashed var(--bs-primary);
  color: var(--bs-primary);
  background-color: var(--bs-primary-bg-subtle);
  font-size: 22px;
  box-shadow: none;
}
.lead-star {
  position: absolute;
  right: -4px;
  bottom: -2px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid var(--tt-surface);
  background-color: var(--tt-status-interview);
  font-size: 10px;
}

/* Practise: a ring 80% full (8 out of 10) */
.big-ring {
  width: 84px;
  height: 84px;
  flex-shrink: 0;
  border-radius: 50%;
  background:
    radial-gradient(closest-side, var(--tt-surface) 78%, transparent 80%),
    conic-gradient(var(--bs-primary) 80%, var(--bs-primary-bg-subtle) 0);
}
.big-ring .text-stat {
  color: var(--bs-primary);
}

@media (max-width: 575.98px) {
  .board {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .board-col {
    min-height: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pop-in,
  .grow-bar,
  .board-card.is-offer {
    animation: none;
  }
  .board-confetti {
    display: none;
  }
}
</style>
