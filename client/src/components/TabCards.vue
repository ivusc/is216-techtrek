<script setup>
// section tabs as big tappable cards (Teams, Opportunities, Interview), with an optional action card at the end
// tabs: [{ key, label, hint, icon, count?, news?, to? }] — count is the chip text, news adds the pink chip and dot.
// Cards with `to` are links to other pages (Home) instead of tabs, so the row is a nav, not a tablist.
import { computed } from 'vue'

const props = defineProps({
  tabs: { type: Array, required: true },
  label: { type: String, required: true },
  idPrefix: { type: String, required: true },
  action: { type: Object, default: null }
})

const tab = defineModel('tab', { type: String, default: '' })

const isNav = computed(() => props.tabs.some((item) => item.to))

defineEmits(['action'])
</script>

<template>
  <div class="tabs-wrap mb-4">
  <component
    :is="isNav ? 'nav' : 'div'"
    class="tab-cards"
    :class="{ 'with-action': action, 'many-tabs': tabs.length > 3 }"
    :style="{ '--tabs': tabs.length }"
    :role="isNav ? undefined : 'tablist'"
    :aria-label="label"
  >
    <component
      :is="item.to ? 'RouterLink' : 'button'"
      v-for="item in tabs"
      :id="idPrefix + item.key"
      :key="item.key"
      :to="item.to"
      :type="item.to ? undefined : 'button'"
      :role="item.to ? undefined : 'tab'"
      class="tab-card text-start text-decoration-none"
      :class="{ active: !item.to && tab === item.key, 'has-news': item.news }"
      :aria-selected="item.to ? undefined : tab === item.key"
      @click="item.to || (tab = item.key)"
    >
      <span class="tab-icon rounded-circle d-flex align-items-center justify-content-center flex-shrink-0">
        <i class="bi" :class="item.icon" aria-hidden="true"></i>
      </span>
      <span class="tab-text min-w-0">
        <span class="tab-label d-block fw-semibold">{{ item.label }}</span>
        <span class="tab-hint d-block text-caption">{{ item.hint }}</span>
        <span v-if="item.count !== undefined" class="tab-count d-inline-block fw-semibold">{{ item.count }}</span>
      </span>
      <span v-if="item.news" class="news-dot" aria-hidden="true"></span>
    </component>

    <!-- an action (e.g. posting a team) is a card of its own, so it sits with the sections instead of floating -->
    <button v-if="action" type="button" class="tab-card create-card text-start" @click="$emit('action')">
      <span class="tab-icon rounded-circle d-flex align-items-center justify-content-center flex-shrink-0">
        <i class="bi" :class="action.icon" aria-hidden="true"></i>
      </span>
      <span class="tab-text min-w-0">
        <span class="tab-label d-block fw-semibold">{{ action.label }}</span>
        <span class="tab-hint d-block text-caption">{{ action.hint }}</span>
      </span>
    </button>
  </component>
  </div>
</template>

<style scoped>
.tab-cards {
  display: grid;
  grid-template-columns: repeat(var(--tabs), minmax(0, 1fr));
  gap: 12px;
}
.tab-cards.with-action {
  grid-template-columns: repeat(var(--tabs), minmax(0, 1fr)) minmax(0, 1fr);
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
  box-shadow: 0 6px 16px rgba(85, 64, 191, 0.16);
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

/* not enough room: the sections on one row, the action card as a slim bar below */
@container (max-width: 899.98px) {
  .tab-cards.with-action {
    grid-template-columns: repeat(var(--tabs), minmax(0, 1fr));
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
    white-space: normal;
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

/* phones: the label and count say enough, so the icon goes and the cards stay short */
@container (max-width: 479.98px) {
  .tab-card:not(.create-card) {
    gap: 4px;
    padding: 10px 6px;
  }
  .tab-card:not(.create-card) .tab-icon {
    display: none !important;
  }
}

/* very narrow (320px phones): four cards don't fit their labels in one row, so they go 2 × 2 */
@container (max-width: 359.98px) {
  .tab-cards.many-tabs {
    grid-template-columns: repeat(2, minmax(0, 1fr));
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
