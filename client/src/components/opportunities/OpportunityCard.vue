<script setup>
import { formatDate } from '@/utils/date'
import { typeBadge } from '@/constants'
import {
  getLocationGroup,
  getMonthlySalary,
  getPrizeAmount,
  getPrizeText,
  getUrgentText,
  getPostedText,
  getPlatform
} from '@/utils/opportunity'
import MatchMeter from './MatchMeter.vue'

defineProps({
  item: { type: Object, required: true },
  saved: { type: Boolean, default: false },
  teamCount: { type: Number, default: 0 }, // open teams for this hackathon, shown on "Find team"
  mySkills: { type: Array, default: () => [] } // the user's skills, for the match meter
})

const emit = defineEmits(['details', 'toggle-save', 'find-team'])

// clicks on the card's own buttons and links are left to them
function openDetails(event) {
  if (event.target.closest('button, a, input, select')) return
  emit('details')
}
</script>

<template>
  <!-- the whole card opens the details panel; its own buttons (Track, Find team...) still do just their job -->
  <div
    class="opp-card card h-100 card-hover"
    tabindex="0"
    :aria-label="'Open details for ' + item.title"
    @click="openDetails"
    @keydown.enter.self="emit('details')"
  >
    <!-- avatar, organisation + location -->
    <div class="d-flex align-items-center gap-3">
      <div
        class="opp-logo rounded-3 d-flex justify-content-center align-items-center fw-semibold flex-shrink-0"
        :class="item.type === 'hackathon' ? 'bg-tt-peach text-body' : 'bg-primary-subtle text-primary'"
      >
        {{ item.organisation?.slice(0, 2).toUpperCase() }}
      </div>
      <div class="flex-grow-1 min-w-0">
        <p class="small fw-semibold text-truncate mb-0">{{ item.organisation }}</p>
        <p class="text-caption text-body-tertiary text-truncate mb-0">
          <i :class="getLocationGroup(item) === 'Online' ? 'bi bi-globe2' : 'bi bi-globe'"></i>
          {{ item.location }}
        </p>
      </div>
    </div>

    <div class="d-flex flex-column gap-2">
      <!-- title -->
      <h3 class="opp-title mb-0">{{ item.title }}</h3>

      <!-- tags -->
      <div class="d-flex flex-wrap gap-2">
        <span class="badge rounded-pill fw-medium" :class="typeBadge[item.type]">
          {{ item.type[0].toUpperCase() + item.type.slice(1) }}
        </span>
        <span v-if="item.themes && item.themes.length > 0" class="badge rounded-pill fw-medium bg-body-secondary text-body-secondary">
          {{ item.themes[0] }}
        </span>
        <span v-if="getUrgentText(item) !== ''" class="badge rounded-pill fw-medium bg-danger-subtle text-danger-emphasis">
          {{ getUrgentText(item) }}
        </span>
      </div>

      <!-- deadline (hackathons) or posted date (jobs), then prize or salary -->
      <div class="d-flex flex-wrap gap-3 small fw-medium text-body-secondary">
        <span v-if="item.deadline">
          <i class="bi bi-clock me-1"></i>
          {{ item.type === 'hackathon' ? 'Register by' : 'Closes' }} {{ formatDate(item.deadline) }}
        </span>
        <span v-else>
          <i class="bi bi-clock me-1"></i> {{ getPostedText(item) }}
        </span>

        <span v-if="item.type === 'hackathon' && getPrizeAmount(item) > 0">
          <i class="bi bi-trophy me-1"></i> {{ getPrizeText(item) }}
        </span>
        <span v-else-if="getMonthlySalary(item) > 0">
          <i class="bi bi-currency-dollar me-1"></i> S${{ getMonthlySalary(item).toLocaleString() }}/mo
          <span v-if="item.salaryIsPredicted" class="text-body-tertiary" title="Estimated by Adzuna, not given in the listing">est.</span>
        </span>
      </div>
    </div>

    <MatchMeter :item="item" :my-skills="mySkills" />

    <!-- mt-auto keeps the footer at the bottom when the card is stretched to the row height -->
    <hr class="mt-auto mb-0 border-secondary-subtle opacity-100" />

    <!-- source + buttons -->
    <div class="d-flex align-items-center flex-wrap gap-2">
      <p class="opp-via text-caption text-body-tertiary text-truncate mb-0">via {{ getPlatform(item) }}</p>
      <!-- the buttons wrap together onto their own row when the card is too narrow (hackathons on phones) -->
      <div class="d-flex flex-wrap justify-content-end gap-2 ms-auto">
        <!-- Details opens the details panel for jobs AND hackathons (the link to the website is inside the panel) -->
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
        <button class="btn btn-sm fw-semibold text-nowrap" :class="saved ? 'btn-light' : 'btn-primary'" @click="$emit('toggle-save')">
          <i :class="saved ? 'bi bi-check-lg' : 'bi bi-plus-lg'"></i>
          {{ saved ? 'Tracked' : 'Track' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.opp-card {
  padding: 20px;
  gap: 14px;
}.opp-logo {
  width: 44px;
  height: 44px;
  font-family: var(--bs-heading-font-family, inherit);
}
.opp-title {
  font-size: 18px;
  line-height: 26px;
  font-weight: 600;
  letter-spacing: -0.25px;
}
.opp-via {
  flex: 1 1 0;
  min-width: 3.5rem;
}
</style>
