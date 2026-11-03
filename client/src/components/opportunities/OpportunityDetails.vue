<script setup>
import { computed, onMounted, onUnmounted } from 'vue'
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

const props = defineProps({
  item: { type: Object, required: true },
  saved: { type: Boolean, default: false }
})

const emit = defineEmits(['close', 'toggle-save'])

function onKeydown(event) {
  if (event.key === 'Escape') {
    emit('close')
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))

const isHackathon = computed(() => props.item.type === 'hackathon')

// the 4 grey boxes under the badges: { icon, label, value }
const infoBoxes = computed(() => {
  const item = props.item

  let dateValue = 'Not listed'
  if (item.deadline) {
    dateValue = formatDateTime(item.deadline)
  } else if (item.postedAt) {
    dateValue = formatDate(item.postedAt)
  }

  let moneyValue = 'Not listed'
  if (isHackathon.value && getPrizeAmount(item) > 0) {
    moneyValue = item.prize
  } else if (getMonthlySalary(item) > 0) {
    moneyValue = 'S$' + getMonthlySalary(item).toLocaleString()
    if (item.salaryIsPredicted) {
      moneyValue += ' (estimated by Adzuna)'
    }
  }

  let timeValue = 'Not listed'
  if (isHackathon.value && item.dates) {
    timeValue = item.dates
  } else if (getJobType(item) !== '') {
    timeValue = getJobType(item)
  }

  return [
    {
      icon: 'bi-calendar',
      label: item.deadline ? 'Application deadline' : 'Posted on',
      value: dateValue
    },
    {
      icon: isHackathon.value ? 'bi-trophy' : 'bi-currency-dollar',
      label: isHackathon.value ? 'Prize pool' : 'Monthly allowance',
      value: moneyValue
    },
    {
      icon: 'bi-clock',
      label: isHackathon.value ? 'Dates' : 'Job type',
      value: timeValue
    },
    {
      icon: 'bi-geo-alt',
      label: 'Location',
      value: item.location ? item.location : 'Not listed'
    }
  ]
})
</script>

<template>
  <!-- dark background behind the panel, clicking it closes the panel -->
  <div class="offcanvas-backdrop fade show" @click="$emit('close')"></div>

  <div class="offcanvas offcanvas-end show details-drawer" role="dialog" aria-labelledby="details-title">
    <!-- only this part scrolls, the buttons stay at the bottom -->
    <div class="details-body">
      <!-- header: label + open listing + close -->
      <div class="d-flex align-items-center gap-2">
        <span class="text-overline text-body-tertiary flex-grow-1">Details</span>
        <a
          :href="item.url"
          target="_blank"
          class="btn bg-white details-icon-btn"
          :title="'Open on ' + getPlatform(item)"
          :aria-label="'Open on ' + getPlatform(item)"
        >
          <i class="bi bi-box-arrow-up-right"></i>
        </a>
        <button class="btn bg-white details-icon-btn" type="button" title="Close" aria-label="Close" @click="$emit('close')">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>

      <!-- organisation -->
      <div class="d-flex align-items-center gap-3">
        <div
          class="details-logo h3 mb-0 d-flex justify-content-center align-items-center"
          :class="isHackathon ? 'bg-tt-peach text-body' : 'bg-primary-subtle text-primary'"
        >
          {{ item.organisation?.slice(0, 2).toUpperCase() }}
        </div>
        <div class="min-w-0">
          <p class="fw-semibold mb-0">{{ item.organisation }}</p>
          <p class="small text-body-tertiary mb-0">
            {{ item.location }}
            <span v-if="getPostedText(item) !== ''"> · {{ getPostedText(item) }}</span>
          </p>
        </div>
      </div>

      <h1 id="details-title" class="mb-0">{{ item.title }}</h1>

      <!-- tags -->
      <div class="d-flex flex-wrap details-badges">
        <span class="badge rounded-pill details-badge" :class="typeBadge[item.type]">
          {{ item.type[0].toUpperCase() + item.type.slice(1) }}
        </span>
        <span v-if="getJobType(item) !== ''" class="badge rounded-pill details-badge bg-body-secondary text-body-secondary">
          {{ getJobType(item) }}
        </span>
        <span v-for="theme in item.themes" :key="theme" class="badge rounded-pill details-badge bg-white border text-body-secondary">
          {{ theme }}
        </span>
        <span v-if="getUrgentText(item) !== ''" class="badge rounded-pill details-badge bg-danger-subtle text-danger-emphasis">
          {{ getUrgentText(item) }}
        </span>
      </div>

      <!-- 4 info boxes -->
      <div class="details-info-grid">
        <div v-for="box in infoBoxes" :key="box.label" class="details-info-box">
          <span class="details-info-icon text-primary">
            <i class="bi" :class="box.icon"></i>
          </span>
          <div class="min-w-0">
            <span class="d-block text-caption text-body-tertiary">{{ box.label }}</span>
            <span class="small fw-semibold">{{ box.value }}</span>
          </div>
        </div>
      </div>

      <!-- description (Adzuna jobs) -->
      <section v-if="item.description" class="d-flex flex-column gap-2">
        <h2 class="h4 mb-0">About the role</h2>
        <p class="text-body-secondary mb-0">{{ item.description }}</p>
      </section>

      <!-- themes (Devpost hackathons) -->
      <section v-if="item.themes && item.themes.length > 0" class="d-flex flex-column gap-2">
        <h2 class="h4 mb-0">Themes</h2>
        <ul class="list-unstyled d-flex flex-column gap-2 mb-0">
          <li v-for="theme in item.themes" :key="theme" class="d-flex gap-2 text-body-secondary">
            <i class="bi bi-check-circle text-primary"></i>
            {{ theme }}
          </li>
        </ul>
      </section>

      <p v-if="item.registrations" class="text-body-secondary mb-0">
        {{ item.registrations.toLocaleString() }} people have registered so far.
      </p>

      <div class="details-tip d-flex align-items-center bg-warning-subtle small fw-medium">
        <i class="bi bi-lightbulb"></i>
        Practise "Tell me about a project you're proud of" in Interview Prep before applying.
      </div>
    </div>

    <!-- buttons at the bottom of the panel -->
    <div class="details-footer d-flex justify-content-end border-top">
      <!-- same as the card's Track button: adds it to the tracker's Saved column, click again to remove -->
      <button
        class="btn fw-semibold text-nowrap details-btn"
        :class="saved ? 'btn-light' : 'btn-outline-primary'"
        type="button"
        @click="$emit('toggle-save')"
      >
        <i :class="saved ? 'bi bi-check-lg' : 'bi bi-plus-lg'"></i>
        {{ saved ? 'Tracked' : 'Track' }}
      </button>

      <!-- link to the real listing -->
      <a :href="item.url" target="_blank" class="btn btn-tt-accent fw-semibold text-nowrap details-btn">
        <i class="bi bi-box-arrow-up-right"></i> Apply on {{ getPlatform(item) }}
      </a>
    </div>
  </div>
</template>
