<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { formatDate } from '@/utils/date'
import { typeBadge } from '@/constants'
import { getMonthlySalary, getPrizeAmount, getPrizeText, getPostedText, getUrgentText, isClosed } from '@/utils/opportunity'
import { useOpportunityStore } from '@/store/opportunity'
import MatchMeter from './MatchMeter.vue'
import { flyToTracker } from '@/utils/flyToTracker'

const props = defineProps({
  items: { type: Array, required: true }, // the filtered results of the open tab
  mySkills: { type: Array, default: () => [] }
})

const emit = defineEmits(['close', 'details'])

const store = useOpportunityStore()

// the cards to go through: open ones that are not tracked yet. Rebuilt when the search or filters change,
// not when you save one, so saving doesn't reshuffle the deck under you.
const queue = ref([])
const index = ref(0)
watch(
  () => props.items,
  (items) => {
    queue.value = items.filter((item) => !isClosed(item) && !store.isSaved(item))
    index.value = 0
  },
  { immediate: true }
)

const current = computed(() => queue.value[index.value] ?? null)
const savedCount = computed(() => queue.value.slice(0, index.value).filter((item) => store.isSaved(item)).length)

const cardEl = ref(null)

// a copy of the card flies to the Tracker icon (save, the same "add to cart" flight as the Track
// buttons) or off to the left (skip) while the next card comes in
function flyAway(toTracker) {
  if (toTracker) {
    flyToTracker(cardEl.value)
    return
  }
  const card = cardEl.value
  if (!card?.animate || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

  const from = card.getBoundingClientRect()
  const ghost = card.cloneNode(true)
  Object.assign(ghost.style, {
    position: 'fixed',
    left: from.left + 'px',
    top: from.top + 'px',
    width: from.width + 'px',
    height: from.height + 'px',
    margin: 0,
    zIndex: 1080,
    pointerEvents: 'none',
    animation: 'none'
  })
  ghost.setAttribute('aria-hidden', 'true')
  document.body.appendChild(ghost)

  const animation = ghost.animate(
    [
      { transform: 'none', opacity: 1 },
      { transform: 'translateX(-160px) rotate(-10deg)', opacity: 0 }
    ],
    { duration: 300, easing: 'ease-in' }
  )
  animation.onfinish = () => ghost.remove()
}

function skip() {
  if (!current.value) return
  flyAway(false)
  index.value++
}

async function save() {
  const item = current.value
  if (!item || store.isSaving) return
  flyAway(true)
  index.value++
  await store.toggleSave(item)
}

function restart() {
  queue.value = props.items.filter((item) => !isClosed(item) && !store.isSaved(item))
  index.value = 0
}

// arrow keys, but not while typing in the search box or picking from a dropdown
function onKeydown(event) {
  if (event.target.closest?.('input, textarea, select, [contenteditable]')) return
  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    skip()
  } else if (event.key === 'ArrowRight') {
    event.preventDefault()
    save()
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <section class="quick-pick mx-auto" aria-label="Quick pick">
    <div class="d-flex align-items-center gap-2 mb-2">
      <h2 class="h5 fw-semibold mb-0">Quick pick</h2>
      <small v-if="current" class="text-body-tertiary" aria-live="polite">{{ index + 1 }} of {{ queue.length }}</small>
      <button class="btn btn-sm btn-link fw-semibold text-decoration-none ms-auto p-0" @click="emit('close')">
        <i class="bi bi-grid"></i> Back to all results
      </button>
    </div>

    <div class="deck-progress rounded-pill bg-body-secondary mb-3" aria-hidden="true">
      <div class="deck-progress-fill rounded-pill bg-primary" :style="{ width: (queue.length ? (index / queue.length) * 100 : 100) + '%' }"></div>
    </div>

    <!-- one big card at a time; the key makes each new card play the "comes in" animation -->
    <article v-if="current" :key="index" ref="cardEl" class="deck-card card shadow">
      <div class="d-flex align-items-center gap-3">
        <div
          class="deck-logo rounded-3 d-flex justify-content-center align-items-center fw-semibold flex-shrink-0"
          :class="current.type === 'hackathon' ? 'bg-tt-peach text-body' : 'bg-primary-subtle text-primary'"
        >
          {{ current.organisation?.slice(0, 2).toUpperCase() }}
        </div>
        <div class="flex-grow-1 min-w-0">
          <p class="fw-semibold text-truncate mb-0">{{ current.organisation }}</p>
          <p class="small text-body-tertiary text-truncate mb-0"><i class="bi bi-geo-alt"></i> {{ current.location }}</p>
        </div>
      </div>

      <h3 class="deck-title mb-0">{{ current.title }}</h3>

      <div class="d-flex flex-wrap gap-2">
        <span class="badge rounded-pill fw-medium" :class="typeBadge[current.type]">
          {{ current.type[0].toUpperCase() + current.type.slice(1) }}
        </span>
        <span v-for="theme in (current.themes ?? []).slice(0, 3)" :key="theme" class="badge rounded-pill fw-medium bg-body-secondary text-body-secondary">
          {{ theme }}
        </span>
        <span v-if="getUrgentText(current) !== ''" class="badge rounded-pill fw-medium bg-danger-subtle text-danger-emphasis">
          {{ getUrgentText(current) }}
        </span>
      </div>

      <div class="d-flex flex-wrap gap-3 fw-medium text-body-secondary">
        <span v-if="current.deadline"><i class="bi bi-clock me-1"></i> {{ current.type === 'hackathon' ? 'Register by' : 'Closes' }} {{ formatDate(current.deadline) }}</span>
        <span v-else><i class="bi bi-clock me-1"></i> {{ getPostedText(current) }}</span>
        <span v-if="current.type === 'hackathon' && getPrizeAmount(current) > 0"><i class="bi bi-trophy me-1"></i> {{ getPrizeText(current) }}</span>
        <span v-else-if="getMonthlySalary(current) > 0"><i class="bi bi-currency-dollar me-1"></i> S${{ getMonthlySalary(current).toLocaleString() }}/mo</span>
      </div>

      <p v-if="current.description" class="deck-description text-body-secondary mb-0">{{ current.description }}</p>

      <MatchMeter :item="current" :my-skills="mySkills" />

      <button class="btn btn-sm btn-link fw-semibold text-decoration-none align-self-start p-0" @click="emit('details', current)">
        More details <i class="bi bi-arrow-right"></i>
      </button>
    </article>

    <!-- end of the deck -->
    <div v-else class="deck-card card shadow-sm text-center align-items-center py-5">
      <i class="bi bi-check2-circle fs-1 text-primary"></i>
      <h3 class="h5 mb-0">{{ queue.length === 0 ? 'Nothing new to pick here' : 'You are through the deck' }}</h3>
      <p class="text-body-secondary mb-0">
        <template v-if="queue.length > 0">You saved {{ savedCount }} of {{ queue.length }} to your Tracker.</template>
        <template v-else>Everything open that matches your filters is already tracked.</template>
      </p>
      <div class="d-flex gap-2">
        <button v-if="queue.length > 0" class="btn btn-outline-primary fw-semibold" @click="restart">Go again</button>
        <button class="btn btn-primary fw-semibold" @click="emit('close')">Back to all results</button>
      </div>
    </div>

    <div v-if="current" class="deck-actions d-flex justify-content-center gap-3 mt-3">
      <button class="deck-btn btn btn-lg btn-light border fw-semibold" @click="skip">
        <i class="bi bi-x-lg"></i> Skip <kbd class="d-none d-md-inline">←</kbd>
      </button>
      <button class="deck-btn btn btn-lg btn-primary fw-semibold" :disabled="store.isSaving" @click="save">
        <i class="bi bi-bookmark-plus"></i> Save <kbd class="d-none d-md-inline">→</kbd>
      </button>
    </div>
  </section>
</template>

<style scoped>
.quick-pick {
  max-width: 560px;
}
.deck-progress {
  height: 4px;
  overflow: hidden;
}
.deck-progress-fill {
  height: 100%;
  transition: width 0.3s ease;
}
.deck-card {
  min-height: 360px;
  padding: 28px;
  gap: 16px;
  animation: deck-in 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}
.deck-logo {
  width: 52px;
  height: 52px;
  font-family: var(--bs-heading-font-family, inherit);
}
.deck-title {
  font-size: 24px;
  line-height: 32px;
  font-weight: 700;
  letter-spacing: -0.5px;
}
.deck-description {
  display: -webkit-box;
  -webkit-line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.deck-btn {
  min-width: 140px;
}
.deck-btn kbd {
  margin-left: 6px;
  padding: 1px 6px;
  font-size: 12px;
  background: rgba(0, 0, 0, 0.15);
}
.min-w-0 {
  min-width: 0;
}
/* phones: a shorter card, and Skip / Save stay on screen just above the bottom tab bar */
@media (max-width: 767.98px) {
  .deck-card {
    min-height: 0;
    padding: 20px;
  }
  .deck-actions {
    position: sticky;
    bottom: calc(76px + env(safe-area-inset-bottom));
    z-index: 2;
    padding: 8px 0;
    background: var(--bs-body-bg);
  }
  .deck-btn {
    flex: 1;
    min-width: 0;
  }
}
@keyframes deck-in {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.97);
  }
}
@media (prefers-reduced-motion: reduce) {
  .deck-card {
    animation: none;
  }
  .deck-progress-fill {
    transition: none;
  }
}
</style>
