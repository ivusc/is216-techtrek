<script setup>
import axios from 'axios'
import { ref, onMounted, computed } from 'vue'

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

const PAGE_SIZE = 9 // load more shows 9 cards at a time 
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
    const response = await axios.get(
      'http://localhost:8000/opportunity/all'
    )

    // the server sends null for a source that failed, so check before using it
    if (response.data.jobs != null) {
      jobs.value = response.data.jobs.jobs
    } else {
      status.value = 'Jobs could not be loaded right now.'
    }

    if (response.data.hackathons != null) {
      hackathons.value = response.data.hackathons.hackathons
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

// unique name for one card, e.g. "adzuna-123"
// (an Adzuna id and a Devpost id could be the same number, so item.externalId alone is not enough for :key)
function getKey(item) {
  return item.source + '-' + item.externalId
}

// days until the deadline, or null if there is no deadline (Adzuna jobs have none)
function getDaysLeft(item) {
  if (!item.deadline) {
    return null
  }
  return Math.ceil((new Date(item.deadline) - new Date()) / 86400000)
}

// formatDate: "2026-10-24T23:59:59Z" -> "24 Oct"
function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })
}

// "Singapore", "Online" or "Other", for the Location filter
function getLocationGroup(item) {
  if (!item.location) {
    return 'Other'
  }
  const location = item.location.toLowerCase()
  if (location.includes('singapore')) {
    return 'Singapore'
  }
  if (location.includes('online') || location.includes('remote')) {
    return 'Online'
  }
  return 'Other'
}

// Adzuna gives the salary per year, our pages shows per month
function getMonthlySalary(item) {
  if (!item.minSalary) {
    return 0
  }
  return Math.round(item.minSalary / 12)
}

// Devpost prize is text like "$10,000", i removed everything that is not a digit -> 10000
function getPrizeAmount(item) {
  if (!item.prize) {
    return 0
  }
  return Number(item.prize.replace(/[^0-9.]/g, ''))
}

//  "Paid only" filter (only hackathon with prize money, or job with a salary)
function isPaid(item) {
  if (item.type === 'hackathon') {
    return getPrizeAmount(item) > 0
  }
  return getMonthlySalary(item) > 0
}

// text for the red badge when the deadline is within 7 days, '' otherwise
function getUrgentText(item) {
  const days = getDaysLeft(item)
  if (days === null || days < 0 || days > 7) {
    return ''
  }
  if (days === 0) {
    return 'Closes today'
  }
  if (days === 1) {
    return '1 day left'
  }
  return days + ' days left'
}

// jobs have no deadline, so show when they were posted instead
function getPostedText(item) {
  if (!item.postedAt) {
    return ''
  }
  const days = Math.floor((new Date() - new Date(item.postedAt)) / 86400000)
  if (days <= 0) {
    return 'Posted today'
  }
  if (days === 1) {
    return 'Posted 1 day ago'
  }
  return 'Posted ' + days + ' days ago'
}

// details panel 
// shows the details panel for this card (Details button)
function openDetails(item) {
  selectedItem.value = item
}

// hides the panel (x button or clicking the dark background)
function closeDetails() {
  selectedItem.value = null
}

// "adzuna" -> "Adzuna", "devpost" -> "Devpost", for "via ..." and "Apply on ..."
function getPlatform(item) {
  return item.source[0].toUpperCase() + item.source.slice(1)
}

// formatDateTime: "2026-10-18T15:59:00Z" -> "18 Oct 2026, 11:59 pm"
function formatDateTime(dateString) {
  return new Date(dateString).toLocaleString('en-SG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

// Adzuna gives contractTime ("full_time") and contractType ("permanent") -> "Full time or Permanent"
function getJobType(item) {
  const parts = []
  if (item.contractTime) {
    const time = item.contractTime.replace('_', ' ')
    parts.push(time[0].toUpperCase() + time.slice(1))
  }
  if (item.contractType) {
    parts.push(item.contractType[0].toUpperCase() + item.contractType.slice(1))
  }
  return parts.join(' · ')
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


// resetPage: back to the first 9 cards when the tab / search / a filter changes
function resetPage() {
  visibleCount.value = PAGE_SIZE
}

function changeTab(tab) {
  activeTab.value = tab
  resetPage()
}

// puts the search, filters and sort back to original page shown
function clearAll() {
  search.value = ''
  locationFilter.value = ''
  paidOnly.value = false
  sortBy.value = 'closing'
  resetPage()
}

// first show the cards we already have, then get the next page of jobs from the server
const loadMore = async () => {
  if (visibleCount.value < filteredItems.value.length) {
    visibleCount.value += PAGE_SIZE
    return
  }
  try {
    const response = await axios.get(
      'http://localhost:8000/opportunity/jobs?page=' + (jobsPage.value + 1)
    )
    let added = 0
    for (const job of response.data.jobs) {
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
  for (let i = 0; i < savedItems.value.length; i++) {
    if (savedItems.value[i].key === getKey(item)) {
      return i
    }
  }
  return -1
}

function isSaved(item) {
  return findSaved(item) !== -1
}

// click once to save (to the database)  click again to unsave (delete it)
const toggleSave = async (item) => {
  if (isSaving.value) {
    return // a request is still running
  }
  isSaving.value = true

  try {
    if (!isSaved(item)) {
      // POST sends back the saved opportunity with its _id, keep the _id so we can delete it later
      // TODO: after login is done, also POST /application with the userId and this _id
      const response = await axios.post('http://localhost:8000/opportunity', item)
      savedItems.value.push({ key: getKey(item), id: response.data._id })
    } else {
      const index = findSaved(item)
      await axios.delete('http://localhost:8000/opportunity/' + savedItems.value[index].id)
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
  <div class="page">
    <div class="page-header">
      <div>
        <h1>Discover</h1>
        <p class="subtitle">Internships, jobs and hackathons — pulled live from Adzuna and Devpost.</p>
      </div>
      <div class="header-right">
        <div class="search-box">
          <i class="bi bi-search"></i>
          <input
            v-model="search"
            @input="resetPage"
            type="text"
            placeholder="Search opportunities..."
          >
        </div>
        <button class="bell"><i class="bi bi-bell"></i></button>
        <div class="profile">KJ</div>
      </div>
    </div>

    <div class="tabs-row">
      <div class="tabs">
        <button
          class="tab"
          :class="{ active: activeTab === 'all' }"
          @click="changeTab('all')"
        >
          All
          <span class="count">
            {{ jobs.length + hackathons.length }}
          </span>
        </button>

        <button
          class="tab"
          :class="{ active: activeTab === 'jobs' }"
          @click="changeTab('jobs')"
        >
          Jobs & internships
          <span class="count">
            {{ jobs.length }}
          </span>
        </button>

        <button
          class="tab"
          :class="{ active: activeTab === 'hackathons' }"
          @click="changeTab('hackathons')"
        >
          Hackathons
          <span class="count">
            {{ hackathons.length }}
          </span>
        </button>
      </div>

      <!-- grid / list toggle -->
      <div class="view-toggle">
        <button :class="{ active: viewMode === 'grid' }" @click="viewMode = 'grid'">
          <i class="bi bi-grid"></i> Grid
        </button>
        <button :class="{ active: viewMode === 'list' }" @click="viewMode = 'list'">
          <i class="bi bi-three-dots"></i> List
        </button>
      </div>
    </div>

    <!-- filters + sort -->
    <div class="filters">
      <span class="filters-label"><i class="bi bi-funnel"></i> Filters</span>

      <select v-model="locationFilter" @change="resetPage" class="filter" :class="{ on: locationFilter !== '' }">
        <option value="">Location</option>
        <option value="Singapore">Singapore</option>
        <option value="Online">Online / remote</option>
        <option value="Other">Elsewhere</option>
      </select>

      <button
        class="filter"
        :class="{ on: paidOnly }"
        @click="paidOnly = !paidOnly; resetPage()"
      >
        Paid only
      </button>

      <button class="clear-btn" @click="clearAll">Clear all</button>

      <div class="sort">
        Sort by
        <select v-model="sortBy" @change="resetPage">
          <option value="closing">Closing soonest</option>
          <option value="pay">Highest pay / prize</option>
          <option value="title">Title (A–Z)</option>
        </select>
      </div>
    </div>

    <!-- results line, error, loading, nothing found -->
    <p v-if="!isLoading" class="results">
      <strong>{{ filteredItems.length }} results</strong>
      <span v-if="closingThisWeek > 0"> · {{ closingThisWeek }} closing this week</span>
      <span v-if="lastUpdated !== ''"> · updated {{ lastUpdated }}</span>
    </p>

    <div v-if="status !== ''" class="error">
      {{ status }}
      <button @click="loadData">Retry</button>
    </div>

    <p v-if="isLoading" class="message">Loading opportunities...</p>
    <p v-else-if="filteredItems.length === 0 && status === ''" class="message">No opportunities match your filters.</p>

    <div class="cards-container" :class="{ list: viewMode === 'list' }">
      <div
        v-for="item in visibleItems"
        :key="getKey(item)"
        class="card"
      >
        <!-- avatar, organisation + location -->
        <div class="organisation">
          <div class="avatar" :class="{ 'avatar-hackathon': item.type === 'hackathon' }">
            {{ item.organisation?.slice(0, 2).toUpperCase() }}
          </div>
          <div class="org-info">
            <h3 class="org-name">{{ item.organisation }}</h3>
            <p class="location">
              <i :class="getLocationGroup(item) === 'Online' ? 'bi bi-globe2' : 'bi bi-geo-alt'"></i>
              {{ item.location }}
            </p>
          </div>
        </div>

        <!-- title -->
        <p class="title">{{ item.title }}</p>

        <!-- tags -->
        <div class="tags">
          <span class="badge" :class="'badge-' + item.type">
            {{ item.type[0].toUpperCase() + item.type.slice(1) }}
          </span>
          <span v-if="item.themes && item.themes.length > 0" class="badge badge-theme">
            {{ item.themes[0] }}
          </span>
          <span v-if="getUrgentText(item) !== ''" class="badge badge-urgent">
            {{ getUrgentText(item) }}
          </span>
        </div>

        <!-- deadline (hackathons) or posted date (jobs), then prize or salary -->
        <div class="info">
          <span v-if="item.deadline">
            <i class="bi bi-clock"></i>
            {{ item.type === 'hackathon' ? 'Register by' : 'Closes' }} {{ formatDate(item.deadline) }}
          </span>
          <span v-else>
            <i class="bi bi-clock"></i> {{ getPostedText(item) }}
          </span>

          <span v-if="item.type === 'hackathon' && getPrizeAmount(item) > 0">
            <i class="bi bi-trophy"></i> {{ item.prize }} prizes
          </span>
          <span v-else-if="getMonthlySalary(item) > 0">
            <i class="bi bi-currency-dollar"></i> S${{ getMonthlySalary(item).toLocaleString() }}/mo
          </span>
        </div>

        <!-- source + buttons -->
        <div class="bottom-info">
          <p class="source">via {{ getPlatform(item) }}</p>
          <div class="bottom-buttons">
            <!-- Details opens the details panel for jobs AND hackathons (the link to the website is inside the panel) -->
            <button class="details-btn" @click="openDetails(item)">
              Details
            </button>
            <RouterLink v-if="item.type === 'hackathon'" to="/teams" class="team-btn">
              Find team
            </RouterLink>
            <button
              class="card-save-btn"
              :class="{ saved: isSaved(item) }"
              @click="toggleSave(item)"
            >
              <i :class="isSaved(item) ? 'bi bi-bookmark-fill' : 'bi bi-bookmark'"></i>
              {{ isSaved(item) ? 'Saved' : 'Save' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!isLoading && filteredItems.length > 0 && canLoadMore" class="load-more">
      <button @click="loadMore">Load more opportunities</button>
    </div>

    <!-- dark background behind the panel, clicking it closes the panel -->
    <div v-if="selectedItem" class="overlay" @click="closeDetails"></div>

    <div v-if="selectedItem" class="drawer">
      <div class="drawer-body">
        <div class="drawer-top">
          <span class="drawer-label">OPPORTUNITY DETAILS</span>
          <div class="drawer-icons">
            <a :href="selectedItem.url" target="_blank" class="icon-btn" :title="'Open on ' + getPlatform(selectedItem)">
              <i class="bi bi-box-arrow-up-right"></i>
            </a>
            <button class="icon-btn" title="Close" @click="closeDetails">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
        </div>

        <!-- organisation -->
        <div class="drawer-org">
          <div class="avatar avatar-big" :class="{ 'avatar-hackathon': selectedItem.type === 'hackathon' }">
            {{ selectedItem.organisation?.slice(0, 2).toUpperCase() }}
          </div>
          <div>
            <p class="drawer-org-name">{{ selectedItem.organisation }}</p>
            <p class="drawer-org-sub">
              {{ selectedItem.location }}
              <span v-if="getPostedText(selectedItem) !== ''"> · {{ getPostedText(selectedItem) }}</span>
            </p>
          </div>
        </div>

        <h2 class="drawer-title">{{ selectedItem.title }}</h2>

        <!-- tags -->
        <div class="tags">
          <span class="badge" :class="'badge-' + selectedItem.type">
            {{ selectedItem.type[0].toUpperCase() + selectedItem.type.slice(1) }}
          </span>
          <span v-if="getJobType(selectedItem) !== ''" class="badge badge-theme">{{ getJobType(selectedItem) }}</span>
          <span v-for="theme in selectedItem.themes" :key="theme" class="badge badge-theme">{{ theme }}</span>
          <span v-if="getUrgentText(selectedItem) !== ''" class="badge badge-urgent">{{ getUrgentText(selectedItem) }}</span>
        </div>

        <!-- 4 info boxes -->
        <div class="info-grid">
          <div class="info-box">
            <span class="info-icon"><i class="bi bi-calendar3"></i></span>
            <div>
              <span class="info-label">{{ selectedItem.deadline ? 'Application deadline' : 'Posted on' }}</span>
              <strong v-if="selectedItem.deadline">{{ formatDateTime(selectedItem.deadline) }}</strong>
              <strong v-else-if="selectedItem.postedAt">{{ formatDate(selectedItem.postedAt) }}</strong>
              <strong v-else>Not listed</strong>
            </div>
          </div>

          <div class="info-box">
            <span class="info-icon">
              <i :class="selectedItem.type === 'hackathon' ? 'bi bi-trophy' : 'bi bi-currency-dollar'"></i>
            </span>
            <div>
              <span class="info-label">{{ selectedItem.type === 'hackathon' ? 'Prize pool' : 'Monthly allowance' }}</span>
              <strong v-if="selectedItem.type === 'hackathon' && getPrizeAmount(selectedItem) > 0">{{ selectedItem.prize }}</strong>
              <strong v-else-if="getMonthlySalary(selectedItem) > 0">S${{ getMonthlySalary(selectedItem).toLocaleString() }}</strong>
              <strong v-else>Not listed</strong>
            </div>
          </div>

          <div class="info-box">
            <span class="info-icon"><i class="bi bi-clock"></i></span>
            <div>
              <span class="info-label">{{ selectedItem.type === 'hackathon' ? 'Dates' : 'Job type' }}</span>
              <strong v-if="selectedItem.type === 'hackathon' && selectedItem.dates">{{ selectedItem.dates }}</strong>
              <strong v-else-if="getJobType(selectedItem) !== ''">{{ getJobType(selectedItem) }}</strong>
              <strong v-else>Not listed</strong>
            </div>
          </div>

          <div class="info-box">
            <span class="info-icon"><i class="bi bi-geo-alt"></i></span>
            <div>
              <span class="info-label">Location</span>
              <strong>{{ selectedItem.location ? selectedItem.location : 'Not listed' }}</strong>
            </div>
          </div>
        </div>

        <!-- description (Adzuna jobs) -->
        <template v-if="selectedItem.description">
          <h3 class="section-title">About the role</h3>
          <p class="description">{{ selectedItem.description }}</p>
        </template>

        <!-- themes (Devpost hackathons) -->
        <template v-if="selectedItem.themes && selectedItem.themes.length > 0">
          <h3 class="section-title">Themes</h3>
          <ul class="checklist">
            <li v-for="theme in selectedItem.themes" :key="theme">
              <i class="bi bi-check-circle"></i> {{ theme }}
            </li>
          </ul>
        </template>

        <p v-if="selectedItem.registrations" class="description">
          {{ selectedItem.registrations.toLocaleString() }} people have registered so far.
        </p>

        <div class="tip">
          <i class="bi bi-lightbulb"></i>
          Practise "Tell me about a project you're proud of" in Interview Prep before applying.
        </div>
      </div>

      <!-- buttons at the bottom of the panel -->
      <div class="drawer-footer">
        <button class="save-btn" :class="{ saved: isSaved(selectedItem) }" @click="toggleSave(selectedItem)">
          <i :class="isSaved(selectedItem) ? 'bi bi-bookmark-fill' : 'bi bi-bookmark'"></i>
          {{ isSaved(selectedItem) ? 'Saved' : 'Save' }}
        </button>
        <!-- goes to the real listing on Adzuna / Devpost -->
        <a :href="selectedItem.url" target="_blank" class="apply-btn">
          <i class="bi bi-box-arrow-up-right"></i> Apply on {{ getPlatform(selectedItem) }}
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  padding: 8px;
}

/* ---------- heading ---------- */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 20px;
}

.page-header h1 {
  margin-bottom: 4px;
}

.subtitle {
  color: #4d666e;
  margin: 0;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 100%;
}

.search-box {
  position: relative;
  min-width: 0;
}

.search-box i {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: #7e9298;
}

.search-box input {
  width: 260px;
  max-width: 100%;
  padding: 9px 16px 9px 38px;
  border: 1px solid #e8e2c3;
  border-radius: 999px;
  background-color: white;
}

.bell {
  width: 36px;
  height: 36px;
  border: 1px solid #e8e2c3;
  border-radius: 10px;
  background-color: white;
}

.profile {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: #fed9b7;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
}

/* ---------- tabs ---------- */
.tabs-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  border-bottom: 1px solid #e8e2c3;
  margin-bottom: 16px;
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  column-gap: 32px;
}

.tab {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
  color: #4d666e;
  padding: 14px 0;
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
}

.tab.active {
  color: #0081a7;
}

.tab.active::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: -1px;
  width: 100%;
  height: 2px;
  background-color: #0081a7;
}

.count {
  background-color: #f6f3da;
  color: #4d666e;
  border-radius: 999px;
  padding: 1px 8px;
  font-size: 11px;
  font-weight: 500;
}

.tab.active .count {
  background-color: #e2f2f6;
  color: #006a8a;
}

.view-toggle {
  display: flex;
  background-color: #f6f3da;
  border-radius: 10px;
  padding: 3px;
}

.view-toggle button {
  background: none;
  border: none;
  border-radius: 8px;
  padding: 5px 12px;
  font-size: 13px;
  color: #4d666e;
  cursor: pointer;
}

.view-toggle button.active {
  background-color: white;
  color: #12343f;
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(18, 52, 63, 0.1);
}

/* ---------- filters ---------- */
.filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.filters-label {
  color: #4d666e;
  font-size: 13px;
}

.filter {
  background-color: white;
  border: 1px solid #d3cba0;
  border-radius: 999px;
  padding: 5px 14px;
  font-size: 13px;
  color: #12343f;
  cursor: pointer;
}

.filter.on {
  background-color: #e2f2f6;
  border-color: #0081a7;
  color: #006a8a;
}

.clear-btn {
  background: none;
  border: none;
  color: #0081a7;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.sort {
  margin-left: auto;
  font-size: 13px;
  color: #7e9298;
}

.sort select {
  border: none;
  background: none;
  font-weight: 600;
  color: #12343f;
  cursor: pointer;
}

.results {
  font-size: 13px;
  color: #7e9298;
  margin-bottom: 16px;
}

.results strong {
  font-size: 15px;
  color: #12343f;
}

.error {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #fde5e2;
  color: #b8433a;
  padding: 10px 16px;
  border-radius: 10px;
  margin-bottom: 16px;
}

.error button {
  background: none;
  border: 1px solid #b8433a;
  color: #b8433a;
  border-radius: 8px;
  padding: 4px 12px;
}

.message {
  text-align: center;
  color: #4d666e;
  padding: 40px 0;
}

/* ---------- cards ---------- */
/* 3 cards per row on a laptop, fewer on smaller screens */
.cards-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 20px;
  align-items: start;
}

.card {
  display: flex;
  flex-direction: column;
  background-color: white;
  border: 1px solid #e8e2c3;
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 1px 2px rgba(18, 52, 63, 0.06), 0 2px 6px rgba(18, 52, 63, 0.06);
}

.organisation {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.avatar {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  background-color: #e2f2f6;
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 13px;
  font-weight: 600;
  color: #4d666e;
}

.avatar-hackathon {
  background-color: #fed9b7;
  color: #12343f;
}

.org-info {
  flex-grow: 1;
  min-width: 0;
}

.org-name {
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  line-height: 16px;
  letter-spacing: 0;
  margin: 0;
}

.location {
  margin: 0;
  font-size: 11px;
  color: #7e9298;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.title {
  font-family: 'Plus Jakarta Sans', sans-serif;
  font-size: 16px;
  font-weight: 500;
  line-height: 22px;
  color: #12343f;
  margin: 0 0 10px;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.badge {
  border-radius: 999px;
  padding: 3px 9px;
  font-size: 11px;
  font-weight: 500;
  line-height: 14px;
  background-color: #e2f2f6;
  color: #006a8a;
}

.badge-internship {
  background-color: #f6f3da;
  color: #4d666e;
}

.badge-hackathon {
  background-color: #fed9b7;
  color: #12343f;
}

.badge-theme {
  background-color: #f6f3da;
  color: #4d666e;
}

.badge-urgent {
  background-color: #fde5e2;
  color: #b8433a;
}

.info {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  font-size: 12px;
  color: #4d666e;
  padding-bottom: 14px;
  border-bottom: 1px solid #e8e2c3;
  margin-bottom: 12px;
}

.info i {
  margin-right: 3px;
}

.bottom-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap; /* if the card is too narrow, "via ..." goes above the buttons */
  gap: 8px;
}

.source {
  margin: 0;
  font-size: 11px;
  color: #7e9298;
  white-space: nowrap;
}

.bottom-buttons {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto; /* keep the buttons on the right */
}

/* stop the button text from breaking onto 2 lines */
.details-btn,
.team-btn,
.card-save-btn {
  white-space: nowrap;
}

.details-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: #0081a7;
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  padding: 6px 4px;
}

.team-btn {
  border: 1px solid #0081a7;
  color: #0081a7;
  background-color: white;
  border-radius: 8px;
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
}

.card-save-btn {
  background-color: #0081a7;
  color: white;
  border: 1px solid #0081a7;
  border-radius: 8px;
  padding: 5px 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.card-save-btn:hover {
  background-color: #006a8a;
}

.card-save-btn.saved {
  background-color: #e2f2f6;
  border-color: #e2f2f6;
  color: #006a8a;
}

.load-more {
  text-align: center;
  margin-top: 28px;
}

.load-more button {
  background-color: white;
  border: 1px solid #0081a7;
  color: #0081a7;
  border-radius: 10px;
  padding: 10px 24px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

/* ---------- details panel ---------- */
.overlay {
  position: fixed;
  inset: 0; /* top, right, bottom and left all 0 = covers the whole screen */
  background-color: rgba(18, 52, 63, 0.35);
  z-index: 1040; /* above the sidebar */
}

.drawer {
  position: fixed;
  top: 0;
  right: 0;
  width: 420px;
  max-width: 100%;
  height: 100vh;
  background-color: white;
  z-index: 1050; /* above the dark background */
  display: flex;
  flex-direction: column;
  box-shadow: -8px 0 24px rgba(18, 52, 63, 0.18);
  animation: slide-in 0.2s ease-out;
}

/* the panel slides in from the right */
@keyframes slide-in {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

.drawer-body {
  flex-grow: 1;
  overflow-y: auto; /* only the middle part scrolls, the buttons stay at the bottom */
  padding: 20px 22px;
}

.drawer-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.drawer-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: #7e9298;
}

.drawer-icons {
  display: flex;
  gap: 8px;
}

.icon-btn {
  width: 30px;
  height: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px solid #e8e2c3;
  border-radius: 8px;
  background-color: white;
  color: #12343f;
  text-decoration: none;
  cursor: pointer;
}

.drawer-org {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.avatar-big {
  width: 44px;
  height: 44px;
  font-size: 15px;
  border-radius: 10px;
}

.drawer-org-name {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
}

.drawer-org-sub {
  margin: 0;
  font-size: 11px;
  color: #7e9298;
}

.drawer-title {
  font-size: 22px;
  line-height: 28px;
  margin-bottom: 12px;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin: 16px 0 20px;
}

.info-box {
  display: flex;
  align-items: center;
  gap: 10px;
  background-color: #f6f3da;
  border-radius: 10px;
  padding: 10px 12px;
}

.info-icon {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px solid #d3cba0;
  border-radius: 7px;
  background-color: white;
  font-size: 13px;
}

.info-label {
  display: block;
  font-size: 10px;
  color: #7e9298;
}

.info-box strong {
  display: block;
  font-size: 11px;
  font-weight: 600;
  line-height: 15px;
}

.section-title {
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0;
  line-height: 18px;
  margin-bottom: 6px;
}

.description {
  font-size: 12px;
  line-height: 20px;
  color: #4d666e;
  margin-bottom: 16px;
}

.checklist {
  list-style: none;
  padding: 0;
  margin-bottom: 16px;
  font-size: 12px;
  color: #4d666e;
}

.checklist li {
  margin-bottom: 6px;
}

.checklist i {
  color: #0081a7;
  margin-right: 6px;
}

.tip {
  display: flex;
  gap: 8px;
  background-color: #fff0e2;
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 11px;
  line-height: 16px;
  color: #12343f;
}

.drawer-footer {
  display: flex;
  gap: 8px;
  padding: 14px 22px;
  border-top: 1px solid #e8e2c3;
}

.save-btn,
.apply-btn {
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
}

.save-btn {
  background-color: white;
  border: 1px solid #0081a7;
  color: #0081a7;
}

.save-btn.saved {
  background-color: #e2f2f6;
  border-color: #e2f2f6;
  color: #006a8a;
}

.apply-btn {
  flex-grow: 1;
  text-align: center;
  background-color: #f07167;
  border: 1px solid #f07167;
  color: white;
}

.apply-btn:hover {
  background-color: #e85d52;
}

/* list view: one card per row */
.cards-container.list {
  grid-template-columns: 1fr;
}

/* small screens (phones): one card per row, smaller gaps */
@media (max-width: 600px) {
  .cards-container {
    grid-template-columns: 1fr;
  }

  .tabs {
    column-gap: 16px;
  }

  .sort {
    margin-left: 0;
  }

  .search-box input {
    width: 200px;
  }

  /* details panel buttons go onto 2 lines */
  .drawer-footer {
    flex-wrap: wrap;
    padding: 12px 16px;
  }

  .apply-btn {
    width: 100%;
  }
}
</style>
