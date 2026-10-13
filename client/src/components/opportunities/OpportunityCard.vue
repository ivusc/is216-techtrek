<script setup>
import { formatDate } from '@/utils/date'
import { typeBadge } from '@/constants'
import {
  getLocationGroup,
  getMonthlySalary,
  getPrizeAmount,
  getUrgentText,
  getPostedText,
  getPlatform
} from '@/utils/opportunity'

defineProps({
  item: { type: Object, required: true },
  saved: { type: Boolean, default: false }
})

defineEmits(['details', 'toggle-save'])
</script>

<template>
  <div class="card p-3">
    <!-- avatar, organisation + location -->
    <div class="d-flex align-items-center gap-2 mb-3">
      <div
        class="avatar rounded-1 d-flex justify-content-center align-items-center small fw-semibold"
        :class="item.type === 'hackathon' ? 'bg-tt-peach text-body' : 'bg-primary-subtle text-body-secondary'"
      >
        {{ item.organisation?.slice(0, 2).toUpperCase() }}
      </div>
      <div class="flex-grow-1 min-w-0">
        <p class="text-caption fw-semibold mb-0">{{ item.organisation }}</p>
        <p class="text-caption text-body-tertiary text-truncate mb-0">
          <i :class="getLocationGroup(item) === 'Online' ? 'bi bi-globe2' : 'bi bi-geo-alt'"></i>
          {{ item.location }}
        </p>
      </div>
    </div>

    <!-- title -->
    <h3 class="h4 fw-medium mb-2">{{ item.title }}</h3>

    <!-- tags -->
    <div class="d-flex flex-wrap gap-1 mb-2">
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
    <div class="d-flex flex-wrap gap-3 text-caption text-body-secondary pb-3 mb-3 border-bottom">
      <span v-if="item.deadline">
        <i class="bi bi-clock me-1"></i>
        {{ item.type === 'hackathon' ? 'Register by' : 'Closes' }} {{ formatDate(item.deadline) }}
      </span>
      <span v-else>
        <i class="bi bi-clock me-1"></i> {{ getPostedText(item) }}
      </span>

      <span v-if="item.type === 'hackathon' && getPrizeAmount(item) > 0">
        <i class="bi bi-trophy me-1"></i> {{ item.prize }} prizes
      </span>
      <span v-else-if="getMonthlySalary(item) > 0">
        <i class="bi bi-currency-dollar me-1"></i> S${{ getMonthlySalary(item).toLocaleString() }}/mo
      </span>
    </div>

    <!-- source + buttons (if the card is too narrow, "via ..." goes above the buttons) -->
    <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
      <p class="text-caption text-body-tertiary text-nowrap mb-0">via {{ getPlatform(item) }}</p>
      <div class="d-flex align-items-center gap-1 ms-auto">
        <!-- Details opens the details panel for jobs AND hackathons (the link to the website is inside the panel) -->
        <button class="btn btn-sm btn-link fw-semibold text-decoration-none text-nowrap" @click="$emit('details')">
          Details
        </button>
        <RouterLink v-if="item.type === 'hackathon'" to="/teams" class="btn btn-sm btn-outline-primary fw-semibold text-nowrap">
          Find team
        </RouterLink>
        <button
          class="btn btn-sm fw-semibold text-nowrap"
          :class="saved ? 'btn-light' : 'btn-primary'"
          @click="$emit('toggle-save')"
        >
          <i :class="saved ? 'bi bi-bookmark-fill' : 'bi bi-bookmark'"></i>
          {{ saved ? 'Saved' : 'Save' }}
        </button>
      </div>
    </div>
  </div>
</template>
