<script setup>
import { ref } from 'vue'
import { formatDate } from '@/utils/date'
import { typeBadge } from '@/constants'
import { flyToTracker } from '@/utils/flyToTracker'
import {
  getLocationGroup,
  getMonthlySalary,
  getPrizeAmount,
  getPrizeText,
  getUrgentText,
  getPostedText,
  getPlatform
} from '@/utils/opportunity'

const props = defineProps({
  item: { type: Object, required: true },
  saved: { type: Boolean, default: false },
  teamCount: { type: Number, default: 0 } // open teams for this hackathon, shown on "Find team"
})

const emit = defineEmits(['details', 'toggle-save', 'find-team'])

// Track: a copy of this row flies into the Tracker icon ("add to cart"); untracking just untracks
const rowEl = ref(null)
function track() {
  if (!props.saved) flyToTracker(rowEl.value)
  emit('toggle-save')
}


// clicks on the card's own buttons and links are left to them
function openDetails(event) {
  if (event.target.closest('button, a, input, select')) return
  emit('details')
}
</script>

<template>
  <!-- list view: one row per opportunity, same info as OpportunityCard laid out sideways -->
  <!-- the whole row opens the details panel; its own buttons still do just their job -->
  <div
    ref="rowEl"
    class="opp-row row-hover"
    tabindex="0"
    :aria-label="'Open details for ' + item.title"
    @click="openDetails"
    @keydown.enter.self="emit('details')"
  >
    <div
      class="opp-row-logo rounded-3 d-flex justify-content-center align-items-center fw-semibold"
      :class="item.type === 'hackathon' ? 'bg-tt-peach text-body' : 'bg-primary-subtle text-primary'"
    >
      {{ item.organisation?.slice(0, 2).toUpperCase() }}
    </div>

    <!-- title + tags, then organisation · location -->
    <div class="opp-row-main min-w-0">
      <div class="d-flex align-items-center gap-2 min-w-0">
        <h3 class="opp-row-title text-truncate mb-0">{{ item.title }}</h3>
        <span class="badge rounded-pill fw-medium flex-shrink-0" :class="typeBadge[item.type]">
          {{ item.type[0].toUpperCase() + item.type.slice(1) }}
        </span>
        <span v-if="item.roles?.length" class="badge rounded-pill fw-medium flex-shrink-0 role-tag" :title="'Role: ' + item.roles[0].label">
          {{ item.roles[0].label }}
        </span>
        <span v-if="getUrgentText(item) !== ''" class="badge rounded-pill fw-medium flex-shrink-0 bg-danger-subtle text-danger-emphasis">
          {{ getUrgentText(item) }}
        </span>
      </div>
      <p class="small text-body-secondary text-truncate mb-0">
        <span class="fw-medium text-body">{{ item.organisation }}</span>
        · <i :class="getLocationGroup(item) === 'Online' ? 'bi bi-globe2' : 'bi bi-geo-alt'"></i> {{ item.location }}
        <span class="text-body-tertiary"> · via {{ getPlatform(item) }}</span>
      </p>
    </div>

    <!-- deadline or posted date, then prize or salary -->
    <div class="opp-row-meta small fw-medium text-body-secondary">
      <span v-if="item.deadline" class="text-nowrap">
        <i class="bi bi-clock me-1"></i>{{ item.type === 'hackathon' ? 'Register by' : 'Closes' }} {{ formatDate(item.deadline) }}
      </span>
      <span v-else class="text-nowrap"><i class="bi bi-clock me-1"></i>{{ getPostedText(item) }}</span>

      <span v-if="item.type === 'hackathon' && getPrizeAmount(item) > 0" class="text-nowrap">
        <i class="bi bi-trophy me-1"></i>{{ getPrizeText(item) }}
      </span>
      <span v-else-if="getMonthlySalary(item) > 0" class="text-nowrap">
        <i class="bi bi-currency-dollar me-1"></i>S${{ getMonthlySalary(item).toLocaleString() }}/mo
        <span v-if="item.salaryIsPredicted" class="text-body-tertiary" title="Estimated by Adzuna, not given in the listing">est.</span>
      </span>
    </div>

    <div class="opp-row-actions d-flex align-items-center gap-2">
      <button class="btn btn-sm btn-link fw-semibold text-decoration-none text-nowrap" @click="$emit('details')">Details</button>
      <button
        v-if="item.type === 'hackathon'"
        type="button"
        class="btn btn-sm btn-outline-primary fw-semibold text-nowrap"
        :title="teamCount > 0 ? teamCount + (teamCount === 1 ? ' team is' : ' teams are') + ' looking for members' : 'No teams yet - start one'"
        :aria-label="teamCount > 0 ? 'Find team, ' + teamCount + ' open' : 'Find team'"
        @click="$emit('find-team')"
      >
        Find team
        <span v-if="teamCount > 0" class="badge rounded-pill bg-primary ms-1">{{ teamCount }}</span>
      </button>
      <button class="btn btn-sm fw-semibold text-nowrap" :class="saved ? 'btn-light' : 'btn-primary'" @click="track">
        <i :class="saved ? 'bi bi-check-lg' : 'bi bi-plus-lg'"></i>
        {{ saved ? 'Tracked' : 'Track' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
/* the job's role (Frontend, Data, ...): the same names as the Role filter */
.role-tag {
  color: var(--tt-chip-text);
  background-color: var(--tt-chip-bg);
  border: 1px solid var(--tt-chip-border);
}

.opp-row {
  display: grid;
  /* fixed meta + actions widths so the columns line up from row to row */
  grid-template-columns: 44px minmax(0, 1fr) 190px 280px;
  grid-template-areas: 'logo main meta actions';
  align-items: center;
  column-gap: 16px;
  row-gap: 10px;
  padding: 16px 20px;
  transition: background-color 0.15s;
}
.opp-row:hover {
  background-color: var(--bs-tertiary-bg);
}
.opp-row + .opp-row {
  border-top: 1px solid var(--bs-border-color-translucent);
}
.opp-row-logo {
  grid-area: logo;
  width: 44px;
  height: 44px;
  font-family: var(--bs-heading-font-family, inherit);
}
.opp-row-main {
  grid-area: main;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.opp-row-title {
  font-size: 16px;
  line-height: 24px;
  font-weight: 600;
  letter-spacing: -0.2px;
}
.opp-row-meta {
  grid-area: meta;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.opp-row-actions {
  grid-area: actions;
  justify-content: flex-end;
}

/* narrower screens: meta and buttons drop under the title */
@container opportunity-list (max-width: 979.98px) {
  .opp-row {
    grid-template-columns: 44px minmax(0, 1fr);
    grid-template-areas: 'logo main' '. meta' 'actions actions';
  }
  .opp-row-meta {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 4px 16px;
  }
}
</style>
