<script setup>
import { formatDate, formatDateTime } from '@/utils/date'
import { typeBadge } from '@/constants'
import {
  getMonthlySalary,
  getPrizeAmount,
  getUrgentText,
  getPostedText,
  getPlatform,
  getJobType
} from '@/utils/opportunity'

defineProps({
  item: { type: Object, required: true },
  saved: { type: Boolean, default: false }
})

defineEmits(['close', 'toggle-save'])
</script>

<template>
  <!-- dark background behind the panel, clicking it closes the panel -->
  <div class="offcanvas-backdrop fade show" @click="$emit('close')"></div>

  <div class="offcanvas offcanvas-end show">
    <div class="offcanvas-header">
      <span class="text-overline text-body-tertiary">OPPORTUNITY DETAILS</span>
      <div class="d-flex align-items-center gap-2">
        <a :href="item.url" target="_blank" class="btn btn-sm bg-white border" :title="'Open on ' + getPlatform(item)">
          <i class="bi bi-box-arrow-up-right"></i>
        </a>
        <button class="btn-close" title="Close" aria-label="Close" @click="$emit('close')"></button>
      </div>
    </div>

    <!-- only the middle part scrolls, the buttons stay at the bottom -->
    <div class="offcanvas-body pt-0">
      <!-- organisation -->
      <div class="d-flex align-items-center gap-2 mb-3">
        <div
          class="avatar avatar-lg rounded d-flex justify-content-center align-items-center fw-semibold"
          :class="item.type === 'hackathon' ? 'bg-tt-peach text-body' : 'bg-primary-subtle text-body-secondary'"
        >
          {{ item.organisation?.slice(0, 2).toUpperCase() }}
        </div>
        <div>
          <p class="small fw-semibold mb-0">{{ item.organisation }}</p>
          <p class="text-caption text-body-tertiary mb-0">
            {{ item.location }}
            <span v-if="getPostedText(item) !== ''"> · {{ getPostedText(item) }}</span>
          </p>
        </div>
      </div>

      <h2 class="mb-2">{{ item.title }}</h2>

      <!-- tags -->
      <div class="d-flex flex-wrap gap-1 mb-2">
        <span class="badge rounded-pill fw-medium" :class="typeBadge[item.type]">
          {{ item.type[0].toUpperCase() + item.type.slice(1) }}
        </span>
        <span v-if="getJobType(item) !== ''" class="badge rounded-pill fw-medium bg-body-secondary text-body-secondary">{{ getJobType(item) }}</span>
        <span v-for="theme in item.themes" :key="theme" class="badge rounded-pill fw-medium bg-body-secondary text-body-secondary">{{ theme }}</span>
        <span v-if="getUrgentText(item) !== ''" class="badge rounded-pill fw-medium bg-danger-subtle text-danger-emphasis">{{ getUrgentText(item) }}</span>
      </div>

      <!-- 4 info boxes -->
      <div class="row row-cols-2 g-2 mt-2 mb-4">
        <div class="col">
          <div class="d-flex align-items-center gap-2 h-100 bg-body-secondary rounded p-2">
            <span class="icon-box flex-shrink-0 d-flex justify-content-center align-items-center bg-white border rounded-1 small"><i class="bi bi-calendar3"></i></span>
            <div class="text-caption">
              <span class="d-block text-body-tertiary">{{ item.deadline ? 'Application deadline' : 'Posted on' }}</span>
              <strong v-if="item.deadline">{{ formatDateTime(item.deadline) }}</strong>
              <strong v-else-if="item.postedAt">{{ formatDate(item.postedAt) }}</strong>
              <strong v-else>Not listed</strong>
            </div>
          </div>
        </div>

        <div class="col">
          <div class="d-flex align-items-center gap-2 h-100 bg-body-secondary rounded p-2">
            <span class="icon-box flex-shrink-0 d-flex justify-content-center align-items-center bg-white border rounded-1 small">
              <i :class="item.type === 'hackathon' ? 'bi bi-trophy' : 'bi bi-currency-dollar'"></i>
            </span>
            <div class="text-caption">
              <span class="d-block text-body-tertiary">{{ item.type === 'hackathon' ? 'Prize pool' : 'Monthly allowance' }}</span>
              <strong v-if="item.type === 'hackathon' && getPrizeAmount(item) > 0">{{ item.prize }}</strong>
              <strong v-else-if="getMonthlySalary(item) > 0">S${{ getMonthlySalary(item).toLocaleString() }}</strong>
              <strong v-else>Not listed</strong>
            </div>
          </div>
        </div>

        <div class="col">
          <div class="d-flex align-items-center gap-2 h-100 bg-body-secondary rounded p-2">
            <span class="icon-box flex-shrink-0 d-flex justify-content-center align-items-center bg-white border rounded-1 small"><i class="bi bi-clock"></i></span>
            <div class="text-caption">
              <span class="d-block text-body-tertiary">{{ item.type === 'hackathon' ? 'Dates' : 'Job type' }}</span>
              <strong v-if="item.type === 'hackathon' && item.dates">{{ item.dates }}</strong>
              <strong v-else-if="getJobType(item) !== ''">{{ getJobType(item) }}</strong>
              <strong v-else>Not listed</strong>
            </div>
          </div>
        </div>

        <div class="col">
          <div class="d-flex align-items-center gap-2 h-100 bg-body-secondary rounded p-2">
            <span class="icon-box flex-shrink-0 d-flex justify-content-center align-items-center bg-white border rounded-1 small"><i class="bi bi-geo-alt"></i></span>
            <div class="text-caption">
              <span class="d-block text-body-tertiary">Location</span>
              <strong>{{ item.location ? item.location : 'Not listed' }}</strong>
            </div>
          </div>
        </div>
      </div>

      <!-- description (Adzuna jobs) -->
      <template v-if="item.description">
        <h3 class="h4 mb-1">About the role</h3>
        <p class="small text-body-secondary mb-3">{{ item.description }}</p>
      </template>

      <!-- themes (Devpost hackathons) -->
      <template v-if="item.themes && item.themes.length > 0">
        <h3 class="h4 mb-1">Themes</h3>
        <ul class="list-unstyled small text-body-secondary mb-3">
          <li v-for="theme in item.themes" :key="theme" class="mb-1">
            <i class="bi bi-check-circle text-primary me-1"></i> {{ theme }}
          </li>
        </ul>
      </template>

      <p v-if="item.registrations" class="small text-body-secondary mb-3">
        {{ item.registrations.toLocaleString() }} people have registered so far.
      </p>

      <div class="d-flex gap-2 bg-warning-subtle rounded p-2 text-caption">
        <i class="bi bi-lightbulb"></i>
        Practise "Tell me about a project you're proud of" in Interview Prep before applying.
      </div>
    </div>

    <!-- buttons at the bottom of the panel -->
    <div class="d-flex flex-wrap gap-2 p-3 border-top">
      <button
        class="btn btn-sm fw-semibold text-nowrap"
        :class="saved ? 'btn-light' : 'btn-outline-primary'"
        @click="$emit('toggle-save')"
      >
        <i :class="saved ? 'bi bi-bookmark-fill' : 'bi bi-bookmark'"></i>
        {{ saved ? 'Saved' : 'Save' }}
      </button>

      <!-- link to real listing -->
      <a :href="item.url" target="_blank" class="btn btn-sm btn-tt-accent fw-semibold text-nowrap flex-grow-1">
        <i class="bi bi-box-arrow-up-right"></i> Apply on {{ getPlatform(item) }}
      </a>
    </div>
  </div>
</template>
