<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import './opportunities.css'
import OpportunityTabs from '@/components/opportunities/OpportunityTabs.vue'
import OpportunityFilters from '@/components/opportunities/OpportunityFilters.vue'
import OpportunityCardList from '@/components/opportunities/OpportunityCardList.vue'
import OpportunityDetails from '@/components/opportunities/OpportunityDetails.vue'
import { fetchAllOpportunities, fetchJobsPage, saveOpportunity, deleteOpportunity } from '@/services/opportunityService'
import {
  getKey,
  getDaysLeft,
  getLocationGroup,
  getMonthlySalary,
  getPrizeAmount,
  isPaid
} from '@/utils/opportunity'
import PageHeader from '@/components/PageHeader.vue'

const jobs = ref([])
const hackathons = ref([])

const activeTab = ref('all')

const status = ref('') // error message
const isLoading = ref(true) // loading messsage 
const lastUpdated = ref('') // last updated time
const search = ref('')
const locationFilter = ref('')
const paidOnly = ref(false)
const sortBy = ref('closing')
const viewMode = ref('grid')

const PAGE_SIZE = 9
const visibleCount = ref(PAGE_SIZE)
const jobsPage = ref(1)
const hasMoreJobs = ref(true)

// the opportunity shown in the details panel (null = panel is closed)
const selectedItem = ref(null)

// saved opportunities: {key: card key, id: _id saved in the database}
const savedItems = ref([])
const isSaving = ref(false)

// gets all jobs n hackathons from our express server and puts them into the jobs 
const loadData = async () => {
  isLoading.value = true
  status.value = ''
  try {
    const data = await fetchAllOpportunities()

    // the server sends null for a source that failed, so check before using it
    if (data.jobs != null) {
      jobs.value = data.jobs.jobs
    } else {
      status.value = 'Jobs could not be loaded right now.'
    }

    if (data.hackathons != null) {
      hackathons.value = data.hackathons.hackathons
    } else {
      status.value = 'Hackathons could not be loaded right now.'
    }

    lastUpdated.value = new Date().toLocaleTimeString('en-SG', { hour: 'numeric', minute: '2-digit' })
  } catch (error) {
    console.error(error)
    status.value = 'There was an error: ' + error.message
  }

  isLoading.value = false
}

onMounted(loadData)

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

// details panel 
// shows the details panel for this card (Details button)
function openDetails(item) {
  selectedItem.value = item
}

// hides the panel (x button or clicking the dark background)
function closeDetails() {
  selectedItem.value = null
}

// takes displayedItems, keeps only the ones that pass the search + filters, then sorts them
const filteredItems = computed(() => {
  const result = []
  const keyword = search.value.trim().toLowerCase()

  for (const item of displayedItems.value) {
    if (keyword !== '') {
      const text = (item.title + ' ' + item.organisation + ' ' + item.location).toLowerCase()
      if (!text.includes(keyword)) {
        continue // skip this item
      }
    }
    if (locationFilter.value !== '' && getLocationGroup(item) !== locationFilter.value) {
      continue
    }
    if (paidOnly.value && !isPaid(item)) {
      continue
    }
    result.push(item)
  }

  if (sortBy.value === 'closing') {
    // earliest deadline first, items without a deadline go last
    result.sort(function (a, b) {
      const timeA = a.deadline ? new Date(a.deadline).getTime() : Infinity
      const timeB = b.deadline ? new Date(b.deadline).getTime() : Infinity
      if (timeA === timeB) {
        return 0
      }
      return timeA < timeB ? -1 : 1
    })
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

// only the first 9 / 18 / 27 / (whatever number) cards
const visibleItems = computed(() => {
  return filteredItems.value.slice(0, visibleCount.value)
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
watch([activeTab, search, locationFilter, paidOnly, sortBy], () => {
  visibleCount.value = PAGE_SIZE
})

// puts the search, filters and sort back to original page shown
function clearAll() {
  search.value = ''
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
  try {
    const data = await fetchJobsPage(jobsPage.value + 1)
    let added = 0
    for (const job of data.jobs) {
      // only add jobs we do not have yet
      let alreadyHave = false
      for (const existing of jobs.value) {
        if (existing.externalId === job.externalId) {
          alreadyHave = true
        }
      }
      if (!alreadyHave) {
        jobs.value.push(job)
        added++
      }
    }
    jobsPage.value++
    if (added === 0) {
      hasMoreJobs.value = false
    }
    visibleCount.value += PAGE_SIZE
  } catch (error) {
    console.error(error)
    hasMoreJobs.value = false
  }
}

// position of the card in savedItems, -1 if it is not saved
function findSaved(item) {
  return savedItems.value.findIndex((saved) => saved.key === getKey(item))
}

// click once to save (to the database)  click again to unsave (delete it)
const toggleSave = async (item) => {
  if (isSaving.value) {
    return // a request is still running
  }
  isSaving.value = true

  try {
    const index = findSaved(item)
    if (index === -1) {
      // POST sends back the saved opportunity with its _id, keep the _id so we can delete it later
      // TODO: after login is done, also POST /application with the userId and this _id
      const saved = await saveOpportunity(item)
      savedItems.value.push({ key: getKey(item), id: saved._id })
    } else {
      await deleteOpportunity(savedItems.value[index].id)
      savedItems.value.splice(index, 1) // remove it from the array
    }
  } catch (error) {
    console.error(error)
    status.value = 'Could not update "' + item.title + '": ' + error.message
  }

  isSaving.value = false
}

</script>

<template>
  <div class="p-2">
    <PageHeader v-model="search" />

    <OpportunityTabs
      v-model:tab="activeTab"
      v-model:view-mode="viewMode"
      :counts="{ all: jobs.length + hackathons.length, jobs: jobs.length, hackathons: hackathons.length }"
    />

    <OpportunityFilters
      v-model:location="locationFilter"
      v-model:paid-only="paidOnly"
      v-model:sort-by="sortBy"
      @clear="clearAll"
    />

    <!-- results line, error, loading, nothing found -->
    <p v-if="!isLoading" class="text-body-tertiary mb-3">
      <strong class="text-body">{{ filteredItems.length }} results</strong>
      <small v-if="closingThisWeek > 0"> · {{ closingThisWeek }} closing this week</small>
      <small v-if="lastUpdated !== ''"> · updated {{ lastUpdated }}</small>
    </p>

    <div v-if="status !== ''" class="alert alert-danger d-flex justify-content-between align-items-center py-2">
      {{ status }}
      <button class="btn btn-sm btn-link text-tt-accent fw-semibold" @click="loadData">Retry</button>
    </div>

    <p v-if="isLoading" class="text-center text-body-secondary py-5">Loading opportunities...</p>
    <p v-else-if="filteredItems.length === 0 && status === ''" class="text-center text-body-secondary py-5">No opportunities match your filters.</p>

    <OpportunityCardList
      :items="visibleItems"
      :view-mode="viewMode"
      :saved-items="savedItems"
      @details="openDetails"
      @toggle-save="toggleSave"
    />

    <div v-if="!isLoading && filteredItems.length > 0 && canLoadMore" class="text-center mt-4">
      <button class="btn btn-outline-primary fw-semibold px-4" @click="loadMore">Load more opportunities</button>
    </div>

    <OpportunityDetails
      v-if="selectedItem"
      :item="selectedItem"
      :saved="findSaved(selectedItem) !== -1"
      @close="closeDetails"
      @toggle-save="toggleSave(selectedItem)"
    />
  </div>
</template>
