<script setup>
// the Teams page sections as big tappable cards (Browse, My teams, Requests), plus a card to post a team
defineProps({
  counts: { type: Object, required: true }
})

const tab = defineModel('tab', { type: String, required: true })

defineEmits(['create'])

const tabs = [
  { key: 'browse', label: 'Browse teams', hint: 'Find a team to join', icon: 'bi-search', unit: ['recruiting', 'recruiting'] },
  { key: 'mine', label: 'My teams', hint: 'Teams you lead or joined', icon: 'bi-people-fill', unit: ['team', 'teams'] },
  { key: 'requests', label: 'Requests', hint: 'Requests and invites', icon: 'bi-inbox-fill', unit: ['waiting', 'waiting'] }
]

function countText(item, count) {
  return count + ' ' + (count === 1 ? item.unit[0] : item.unit[1])
}
</script>

<template>
  <div class="tabs-wrap mb-4">
  <div class="tab-cards" role="tablist" aria-label="Teams sections">
    <button
      v-for="item in tabs"
      :id="'teams-tab-' + item.key"
      :key="item.key"
      type="button"
      role="tab"
      class="tab-card text-start"
      :class="{ active: tab === item.key, 'has-news': item.key === 'requests' && counts.requests > 0 }"
      :aria-selected="tab === item.key"
      @click="tab = item.key"
    >
      <span class="tab-icon rounded-circle d-flex align-items-center justify-content-center flex-shrink-0">
        <i class="bi" :class="item.icon" aria-hidden="true"></i>
      </span>
      <span class="tab-text min-w-0">
        <span class="tab-label d-block fw-semibold">{{ item.label }}</span>
        <span class="tab-hint d-block text-caption">{{ item.hint }}</span>
        <span class="tab-count d-inline-block fw-semibold">{{ countText(item, counts[item.key] ?? 0) }}</span>
      </span>
      <span v-if="item.key === 'requests' && counts.requests > 0" class="news-dot" aria-hidden="true"></span>
    </button>

    <!-- posting a team is a card of its own, so it sits with the sections instead of floating -->
    <button type="button" class="tab-card create-card text-start" @click="$emit('create')">
      <span class="tab-icon rounded-circle d-flex align-items-center justify-content-center flex-shrink-0">
        <i class="bi bi-plus-lg" aria-hidden="true"></i>
      </span>
      <span class="tab-text min-w-0">
        <span class="tab-label d-block fw-semibold">Create team post</span>
        <span class="tab-hint d-block text-caption">Advertise your open spots</span>
      </span>
    </button>
  </div>
  </div>
</template>

<style scoped>
.tab-cards {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.tab-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 14px 16px;
  border: 1.5px solid var(--bs-border-color);
  border-radius: 16px;
  background-color: var(--tt-surface);
  color: var(--bs-body-color);
  box-shadow: 0 1px 2px rgba(28, 26, 61, 0.05);
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease, background-color 0.15s ease;
}
.tab-card:hover {
  border-color: var(--bs-primary-border-subtle);
  box-shadow: 0 6px 16px rgba(28, 26, 61, 0.08);
  transform: translateY(-2px);
}
.tab-card:focus-visible {
  outline: 2px solid var(--bs-primary);
  outline-offset: 2px;
}

.tab-icon {
  width: 44px;
  height: 44px;
  font-size: 19px;
  color: var(--bs-primary);
  background-color: var(--bs-primary-bg-subtle);
  transition: background-color 0.15s ease, color 0.15s ease;
}

.tab-label {
  font-size: 1rem;
  line-height: 1.25;
}
.tab-hint {
  color: var(--bs-secondary-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tab-label,
.tab-count {
  white-space: nowrap;
}
.tab-count {
  margin-top: 6px;
  padding: 2px 10px;
  font-size: 0.8125rem;
  border-radius: 999px;
  color: var(--tt-chip-text);
  background-color: var(--tt-chip-bg);
}

/* the section you're on: purple border, lavender card, solid icon */
.tab-card.active {
  border-color: var(--bs-primary);
  background-color: var(--bs-primary-bg-subtle);
  box-shadow: 0 6px 16px rgba(91, 63, 228, 0.16);
}
.tab-card.active .tab-icon {
  color: var(--bs-white);
  background-color: var(--bs-primary);
}
.tab-card.active .tab-count {
  color: var(--bs-white);
  background-color: var(--bs-primary);
}

/* requests waiting: a pink count and a dot that gently pulses */
.tab-card.has-news .tab-count {
  color: var(--bs-white);
  background-color: var(--tt-accent);
}
.news-dot {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: var(--tt-accent);
  box-shadow: 0 0 0 0 rgba(239, 93, 122, 0.5);
  animation: news-pulse 2s ease-out infinite;
}
@keyframes news-pulse {
  0% { box-shadow: 0 0 0 0 rgba(239, 93, 122, 0.5); }
  70%, 100% { box-shadow: 0 0 0 8px rgba(239, 93, 122, 0); }
}

/* the create card: dashed and pink, so it reads as an action rather than a section */
.create-card {
  border-style: dashed;
  border-color: var(--tt-accent);
  background-color: var(--tt-create-bg);
}
.create-card .tab-icon {
  color: var(--bs-white);
  background-color: var(--tt-accent);
}
.create-card:hover {
  border-color: var(--tt-accent);
  background-color: var(--tt-create-bg-hover);
}

/* the layout follows the room the cards have (the sidebar takes space too), not the screen width */
.tabs-wrap {
  container-type: inline-size;
}

/* not enough room for four: the three sections on one row, the create card as a slim bar below */
@container (max-width: 899.98px) {
  .tab-cards {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  .create-card {
    grid-column: 1 / -1;
    justify-content: center;
    padding: 10px 16px;
  }
  .create-card .tab-hint {
    display: none !important;
  }
  .create-card .tab-icon {
    width: 32px;
    height: 32px;
    font-size: 15px;
  }
}

/* narrow: compact section cards with the icon on top and no hint line */
@container (max-width: 639.98px) {
  .tab-cards {
    gap: 8px;
  }
  .tab-card:not(.create-card) {
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 12px 6px;
    text-align: center !important;
  }
  .tab-card:not(.create-card) .tab-hint {
    display: none !important;
  }
  .tab-card:not(.create-card) .tab-icon {
    width: 38px;
    height: 38px;
    font-size: 16px;
  }
  .tab-label {
    font-size: 0.8125rem;
  }
  .tab-count {
    margin-top: 2px;
    padding: 1px 8px;
    font-size: 0.75rem;
  }
  .news-dot {
    top: 8px;
    right: 8px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .tab-card,
  .tab-icon {
    transition: none;
  }
  .tab-card:hover {
    transform: none;
  }
  .news-dot {
    animation: none;
  }
}
</style>
