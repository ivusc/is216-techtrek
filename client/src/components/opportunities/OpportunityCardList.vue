<script setup>
import { computed } from 'vue'
import OpportunityCard from './OpportunityCard.vue'
import OpportunityRow from './OpportunityRow.vue'
import { getKey } from '@/utils/opportunity'

const props = defineProps({
  items: { type: Array, required: true },
  viewMode: { type: String, default: 'grid' }, // 'grid' or 'list'
  savedItems: { type: Array, default: () => [] }, // [{ key, id }] of every saved item
  teamCounts: { type: Object, default: () => ({}) }, // { "Hackathon title": open teams }
  mySkills: { type: Array, default: () => [] } // the user's skills, for the match meter
})

// keys of the saved items, so each card knows if it is saved
const savedKeys = computed(() => props.savedItems.map((saved) => saved.key))

// passes the clicked item up, the parent opens the panel / saves it
defineEmits(['details', 'toggle-save', 'find-team'])
</script>

<template>
  <!-- list view: one card holding a row per item -->
  <!-- TransitionGroup slides the cards that stay into their new place when the filters or sort change -->
  <TransitionGroup
    v-if="viewMode === 'list'"
    tag="div"
    name="opp"
    class="card shadow-sm overflow-hidden"
    style="container: opportunity-list / inline-size"
    :class="{ 'd-none': items.length === 0 }"
  >
    <OpportunityRow
      v-for="item in items"
      :key="getKey(item)"
      :item="item"
      :saved="savedKeys.includes(getKey(item))"
      :team-count="teamCounts[item.title] ?? 0"
      @details="$emit('details', item)"
      @toggle-save="$emit('toggle-save', item)"
      @find-team="$emit('find-team', item)"
    />
  </TransitionGroup>

  <!-- grid view: 3 cards per row on a laptop, fewer on smaller screens; cards in a row share one height -->
  <TransitionGroup v-else tag="div" name="opp" class="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3">
    <div v-for="item in items" :key="getKey(item)" class="col">
      <OpportunityCard
        :item="item"
        :saved="savedKeys.includes(getKey(item))"
        :team-count="teamCounts[item.title] ?? 0"
        :my-skills="mySkills"
        @details="$emit('details', item)"
        @toggle-save="$emit('toggle-save', item)"
        @find-team="$emit('find-team', item)"
      />
    </div>
  </TransitionGroup>
</template>

<style scoped>
/* only moves and entries animate; leaving cards go at once so the others can slide into the gap */
.opp-move {
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
.opp-enter-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.opp-enter-from {
  opacity: 0;
  transform: scale(0.96);
}
@media (prefers-reduced-motion: reduce) {
  .opp-move,
  .opp-enter-active {
    transition: none;
  }
}
</style>
