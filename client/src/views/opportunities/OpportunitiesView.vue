<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import './opportunities.css'
import OpportunityTabs from '@/components/opportunities/OpportunityTabs.vue'
import OpportunityFilters from '@/components/opportunities/OpportunityFilters.vue'
import OpportunityCardList from '@/components/opportunities/OpportunityCardList.vue'
import OpportunityDetails from '@/components/opportunities/OpportunityDetails.vue'
import FindTeamPanel from '@/components/opportunities/FindTeamPanel.vue'
import QuickPickDeck from '@/components/opportunities/QuickPickDeck.vue'
import TrekLoader from '@/components/TrekLoader.vue'
import {
  getDaysLeft,
  getLocationGroup,
  isClosed,
  getMonthlySalary,
  getPrizeAmount,
  isPaid
} from '@/utils/opportunity'
import PageHeader from '@/components/PageHeader.vue'
import { useOpportunityStore } from '@/store/opportunity'
import { useUserStore } from '@/store/user'

// the store holds the fetched opportunities and does all the server calls
const opportunityStore = useOpportunityStore()
const { jobs, hackathons, isLoading, status, lastUpdated, hasMoreJobs, jobType, jobField, jobSector, sectorOptions, savedItems } =
  storeToRefs(opportunityStore)

const userStore = useUserStore()

const activeTab = ref('overview')
// Quick pick: go through the results one big card at a time instead of the grid
const quickPick = ref(false)

// the home page search sends people here with ?search=...
const search = ref(useRoute().query.search ?? '')
const locationFilter = ref('')
const paidOnly = ref(false)
// hackathon filters, done here because all hackathons are loaded at once
const themeFilter = ref('')
const closingWithin = ref('') // '' = any, otherwise a number of days
const sortBy = ref('closing')
const viewMode = ref('grid')

const PAGE_SIZE = 9
const visibleCount = ref(PAGE_SIZE)

// the opportunity shown in the details panel (null = panel is closed)
const selectedItem = ref(null)
// the hackathon whose teams are shown in the "Find team" panel (null = closed)
const findTeamItem = ref(null)

onMounted(() => {
  opportunityStore.fetchOpportunities()
  opportunityStore.loadSectorOptions()
})

// displayedItems: the items of the tab that is selected (same as before)
const displayedItems = computed(() => {
  if (activeTab.value === 'jobs') {
    return jobs.value
  }

  if (activeTab.value === 'hackathons') {
    return hackathons.value
  }

  const allItems = []

  for (const job of jobs.value) {
    allItems.push(job)
  }

  for (const hackathon of hackathons.value) {
    allItems.push(hackathon)
  }

  return allItems
})

// theme names from the loaded hackathons, most common first, for the Theme dropdown
const hackathonThemes = computed(() => {
  const counts = {}
  for (const hackathon of hackathons.value) {
    for (const name of hackathon.themes) {
      counts[name] = (counts[name] ?? 0) + 1
    }
  }
  return Object.keys(counts).sort((a, b) => counts[b] - counts[a])
})

// true if the item passes the search box and the filters.
// `override` tries other filter values without picking them, for the live counts on the filter chips
function passesFilters(item, override = {}) {
  const f = { location: locationFilter.value, paidOnly: paidOnly.value, theme: themeFilter.value, closingWithin: closingWithin.value, ...override }
  if (keyword.value !== '') {
    const text = (item.title + ' ' + item.organisation + ' ' + item.location).toLowerCase()
    if (!text.includes(keyword.value)) return false
  }
  if (f.location !== '' && getLocationGroup(item) !== f.location) return false
  if (f.paidOnly && !isPaid(item)) return false
  // Theme and Deadline only apply to hackathons
  if (item.type === 'hackathon') {
    if (f.theme !== '' && !item.themes.includes(f.theme)) return false
    if (f.closingWithin !== '') {
      const days = getDaysLeft(item)
      if (days === null || days < 0 || days > Number(f.closingWithin)) return false
    }
  }
  return true
}

const keyword = computed(() => search.value.trim().toLowerCase())

function countWith(items, override) {
  return items.filter((item) => passesFilters(item, override)).length
}

// what each tab would show with the current search + filters
const tabCounts = computed(() => ({ jobs: countWith(jobs.value), hackathons: countWith(hackathons.value) }))

// how many results each filter choice would give on this tab, updates as you type
const filterCounts = computed(() => {
  const items = displayedItems.value
  const counts = { location: {}, theme: {}, closingWithin: {}, paidOnly: countWith(items, { paidOnly: true }) }
  for (const location of ['Singapore', 'Online', 'Other']) counts.location[location] = countWith(items, { location })
  for (const theme of hackathonThemes.value) counts.theme[theme] = countWith(items, { theme })
  for (const days of ['7', '30']) counts.closingWithin[days] = countWith(items, { closingWithin: days })
  return counts
})

// details panel 
function openDetails(item) {
  selectedItem.value = item
}

function closeDetails() {
  selectedItem.value = null
}

// takes displayedItems, keeps only the ones that pass the search + filters, then sorts them
const filteredItems = computed(() => {
  const result = displayedItems.value.filter((item) => passesFilters(item))

  if (sortBy.value === 'closing') {
    return sortByClosing(result)
  } else if (sortBy.value === 'pay') {
    result.sort(function (a, b) {
      const payA = a.type === 'hackathon' ? getPrizeAmount(a) : getMonthlySalary(a)
      const payB = b.type === 'hackathon' ? getPrizeAmount(b) : getMonthlySalary(b)
      return payB - payA
    })
  } else {
    result.sort(function (a, b) {
      return a.title.localeCompare(b.title)
    })
  }

  return result
})

// jobs have no deadline, so they are sorted newest first instead.
// order: open hackathons by deadline, then jobs, then closed hackathons
function sortByClosing(items) {
  const open = []
  const jobsList = []
  const closed = []
  for (const item of items) {
    if (!item.deadline) {
      jobsList.push(item)
    } else if (isClosed(item)) {
      closed.push(item)
    } else {
      open.push(item)
    }
  }

  open.sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
  jobsList.sort((a, b) => new Date(b.postedAt ?? 0) - new Date(a.postedAt ?? 0))
  closed.sort((a, b) => new Date(b.deadline) - new Date(a.deadline)) // most recently closed first

  return open.concat(jobsList, closed)
}

// only the first 9 / 18 / 27 / (whatever number) cards
const visibleItems = computed(() => {
  return filteredItems.value.slice(0, visibleCount.value)
})

// the Overview tab shows a short Hackathons section and a Jobs section instead of one mixed grid,
const ALL_TAB_LIMITS = { hackathons: 3, jobs: 6 }

const SORT_SUBTITLES = {
  closing: { hackathons: 'Closing soonest', jobs: 'Newest first' },
  pay: { hackathons: 'Highest prize', jobs: 'Highest pay' },
  title: { hackathons: 'Title (A-Z)', jobs: 'Title (A-Z)' }
}

const allTabSections = computed(() => {
  const hackathonItems = filteredItems.value.filter((item) => item.type === 'hackathon')
  const jobItems = filteredItems.value.filter((item) => item.type !== 'hackathon')
  return [
    { tab: 'hackathons', title: 'Hackathons', items: hackathonItems },
    { tab: 'jobs', title: 'Jobs & internships', items: jobItems }
  ].map((section) => ({
    ...section,
    subtitle: SORT_SUBTITLES[sortBy.value][section.tab],
    shownItems: section.items.slice(0, ALL_TAB_LIMITS[section.tab])
  }))
})

// closingThisWeek: for the "· 3 closing this week" text
const closingThisWeek = computed(() => {
  let count = 0
  for (const item of filteredItems.value) {
    const days = getDaysLeft(item)
    if (days !== null && days >= 0 && days <= 7) {
      count++
    }
  }
  return count
})

// show the "Load more" button if there are cards not shown yet, or the server may have more jobs
const canLoadMore = computed(() => {
  if (visibleCount.value < filteredItems.value.length) {
    return true
  }
  return activeTab.value !== 'hackathons' && hasMoreJobs.value
})

//listens to changes in these variables, and resets to first 9 cards if changed
watch([activeTab, search, locationFilter, paidOnly, sortBy, jobSector, jobType, jobField, themeFilter, closingWithin], () => {
  visibleCount.value = PAGE_SIZE
})

// sector, role and work type are filtered by the server, so get the jobs again when they change
watch([jobSector, jobType, jobField], opportunityStore.reloadJobs)

function clearAll() {
  search.value = ''
  jobSector.value = 'tech'
  jobType.value = ''
  jobField.value = ''
  themeFilter.value = ''
  closingWithin.value = ''
  locationFilter.value = ''
  paidOnly.value = false
  sortBy.value = 'closing'
}

// first show the cards we already have, then get the next page of jobs from the server
const loadMore = async () => {
  if (visibleCount.value < filteredItems.value.length) {
    visibleCount.value += PAGE_SIZE
    return
  }
  await opportunityStore.fetchMoreJobs()
  visibleCount.value += PAGE_SIZE
}

</script>

<template>
  <div class="p-2">
    <PageHeader v-model="search" />

    <OpportunityTabs
      v-model:tab="activeTab"
      v-model:view-mode="viewMode"
      :counts="tabCounts"
    />

    <OpportunityFilters
      v-model:job-sector="jobSector"
      v-model:job-field="jobField"
      :sectors="sectorOptions"
      v-model:job-type="jobType"
      v-model:theme="themeFilter"
      v-model:closing-within="closingWithin"
      :tab="activeTab"
      :themes="hackathonThemes"
      v-model:location="locationFilter"
      v-model:paid-only="paidOnly"
      v-model:sort-by="sortBy"
      :counts="filterCounts"
      @clear="clearAll"
    />

    <!-- results line, error, loading, nothing found -->
    <div v-if="!isLoading" class="d-flex flex-wrap align-items-center gap-2 mb-3">
      <p class="text-body-tertiary mb-0">
        <strong class="text-body">{{ filteredItems.length }} results</strong>
        <small v-if="closingThisWeek > 0"> · {{ closingThisWeek }} closing this week</small>
        <small v-if="lastUpdated !== ''"> · updated {{ lastUpdated }}</small>
      </p>
      <button
        class="btn btn-sm rounded-pill fw-semibold ms-auto"
        :class="quickPick ? 'btn-primary' : 'btn-outline-primary'"
        :aria-pressed="quickPick"
        @click="quickPick = !quickPick"
      >
        <i class="bi bi-stack"></i> Quick pick
      </button>
    </div>

    <div v-if="status !== ''" class="alert alert-danger d-flex justify-content-between align-items-center py-2" role="alert">
      {{ status }}
      <button class="btn btn-sm btn-link text-tt-accent fw-semibold" @click="opportunityStore.fetchOpportunities">Retry</button>
    </div>

    <TrekLoader
      v-if="isLoading"
      title="Scouting opportunities"
      :captions="[
        'Packing snacks for the trek…',
        'Scouting internships on Adzuna…',
        'Hunting down hackathons on Devpost…',
        'Checking which deadlines are close…',
        'Almost there…',
      ]"
    />

    <QuickPickDeck
      v-else-if="quickPick"
      :items="filteredItems"
      :my-skills="userStore.skills"
      @close="quickPick = false"
      @details="openDetails"
    />

    <!-- Overview tab -->
    <template v-else-if="activeTab === 'overview'">
      <section
        v-for="(section, index) in allTabSections"
        :key="section.tab"
        :class="{ 'border-top pt-4 mt-4': index > 0 }"
      >
        <div class="d-flex flex-wrap align-items-center gap-2 mb-3">
          <h2 class="h5 fw-semibold mb-0">{{ section.title }}</h2>
          <span class="badge rounded-pill fw-medium bg-body-secondary text-body-secondary">{{ section.items.length }}</span>
          <small class="text-body-tertiary">{{ section.subtitle }}</small>
          <button
            v-if="section.items.length > section.shownItems.length"
            class="btn btn-sm btn-link fw-semibold text-decoration-none ms-auto p-0"
            @click="activeTab = section.tab"
          >
            See all {{ section.title.toLowerCase() }} <i class="bi bi-arrow-right"></i>
          </button>
        </div>

        <p v-if="section.items.length === 0" class="text-body-secondary py-3 mb-0">No {{ section.title.toLowerCase() }} match your filters.</p>

        <OpportunityCardList
          :items="section.shownItems"
          :view-mode="viewMode"
          :saved-items="savedItems"
          :team-counts="opportunityStore.teamCounts"
          :my-skills="userStore.skills"
          @find-team="findTeamItem = $event"
          @details="openDetails"
          @toggle-save="opportunityStore.toggleSave"
        />
      </section>
    </template>

    <!-- Jobs / Hackathons tab -->
    <template v-else>
      <p v-if="filteredItems.length === 0 && status === ''" class="text-center text-body-secondary py-5">No opportunities match your filters.</p>

      <OpportunityCardList
        :items="visibleItems"
        :view-mode="viewMode"
        :saved-items="savedItems"
        :team-counts="opportunityStore.teamCounts"
        :my-skills="userStore.skills"
        @find-team="findTeamItem = $event"
        @details="openDetails"
        @toggle-save="opportunityStore.toggleSave"
      />

      <div v-if="filteredItems.length > 0 && canLoadMore" class="text-center mt-4">
        <button class="btn btn-outline-primary fw-semibold px-4" @click="loadMore">Load more opportunities</button>
      </div>
    </template>

    <FindTeamPanel v-if="findTeamItem" :item="findTeamItem" @close="findTeamItem = null" />

    <OpportunityDetails
      v-if="selectedItem"
      :item="selectedItem"
      :saved="opportunityStore.isSaved(selectedItem)"
      @close="closeDetails"
      @toggle-save="opportunityStore.toggleSave(selectedItem)"
    />
  </div>
</template>
