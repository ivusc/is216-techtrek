<script setup>
import { computed } from 'vue'
import OpportunityCard from './OpportunityCard.vue'
import OpportunityRow from './OpportunityRow.vue'
import { getKey } from '@/utils/opportunity'

const props = defineProps({
  items: { type: Array, required: true },
  viewMode: { type: String, default: 'grid' }, // 'grid' or 'list'
  savedItems: { type: Array, default: () => [] } // [{ key, id }] of every saved item
})

// keys of the saved items, so each card knows if it is saved
const savedKeys = computed(() => props.savedItems.map((saved) => saved.key))

// passes the clicked item up, the parent opens the panel / saves it
defineEmits(['details', 'toggle-save'])
</script>

<template>
  <!-- list view: one card holding a row per item -->
  <div v-if="viewMode === 'list'" class="card shadow-sm overflow-hidden" style="container: opportunity-list / inline-size" :class="{ 'd-none': items.length === 0 }">
    <OpportunityRow
      v-for="item in items"
      :key="getKey(item)"
      :item="item"
      :saved="savedKeys.includes(getKey(item))"
      @details="$emit('details', item)"
      @toggle-save="$emit('toggle-save', item)"
    />
  </div>

  <!-- grid view: 3 cards per row on a laptop, fewer on smaller screens; cards in a row share one height -->
  <div v-else class="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3">
    <div v-for="item in items" :key="getKey(item)" class="col">
      <OpportunityCard
        :item="item"
        :saved="savedKeys.includes(getKey(item))"
        @details="$emit('details', item)"
        @toggle-save="$emit('toggle-save', item)"
      />
    </div>
  </div>
</template>
