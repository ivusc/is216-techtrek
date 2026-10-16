<script setup>
import { ref, computed, onMounted } from 'vue'
import './tracker.css'
import OpportunityHeader from '@/components/opportunities/OpportunityHeader.vue'
import TrackerToolbar from '@/components/tracker/TrackerToolbar.vue'
import KanbanColumn from '@/components/tracker/KanbanColumn.vue'
import { trackerStages } from '@/constants'
import { getDaysLeft } from '@/utils/opportunity'
import { getApplicationDeadline } from '@/utils/application'
import { fetchAllApplications, updateApplicationStatus } from '@/services/trackerService'

// TODO: load from GET /application?userId=... instead of the sample data
const applications = ref([])

const search = ref('')
const viewMode = ref('board') // 'board' or 'calendar'
const typeFilter = ref('') // '' = all types
const deadlineFilter = ref('') // '' | 'week' | 'overdue'
const hideRejected = ref(false)

const status = ref('') // error message
const isLoading = ref(true) // loading messsage 

async function loadData() {
  isLoading.value = true
  status.value = ''
  
  try {
    const data = await fetchAllApplications()

    // the server sends null for a source that failed, so check before using it
    if (data != null) {
      applications.value = data
      console.log(applications.value)
    } else {
      status.value = 'Applications could not be loaded right now.'
    }

  } catch (error) {
    console.error(error)
    status.value = 'There was an error: ' + error.message
  }

  isLoading.value = false
}

onMounted(loadData);

function isDueThisWeek(application) {
  const daysLeft = getDaysLeft({ deadline: getApplicationDeadline(application) })
  return daysLeft !== null && daysLeft >= 0 && daysLeft <= 7
}

function isOverdue(application) {
  const daysLeft = getDaysLeft({ deadline: getApplicationDeadline(application) })
  return daysLeft !== null && daysLeft < 0
}

// applications that pass the search box and the toolbar filters
const filteredApplications = computed(() => {
  const keyword = search.value.trim().toLowerCase()

  return applications.value.filter((application) => {
    const opportunity = application.opportunityId

    if (keyword !== '') {
      const text = (opportunity.title + ' ' + opportunity.organisation).toLowerCase()
      if (!text.includes(keyword)) {
        return false
      }
    }
    if (typeFilter.value !== '' && opportunity.type !== typeFilter.value) {
      return false
    }
    if (hideRejected.value && application.status === 'rejected') {
      return false
    }
    if (deadlineFilter.value === 'week' && !isDueThisWeek(application)) {
      return false
    }
    if (deadlineFilter.value === 'overdue' && !isOverdue(application)) {
      return false
    }
    return true
  })
})

// "Hide rejected" also removes the Rejected column
const visibleStages = computed(() => {
  if (hideRejected.value) {
    return trackerStages.filter((stage) => stage.status !== 'rejected')
  }
  return trackerStages
})

const dueThisWeekCount = computed(() => filteredApplications.value.filter(isDueThisWeek).length)

function applicationsInStage(status) {
  return filteredApplications.value.filter((application) => application.status === status)
}

// card dropped on another column, or picked from the card's ... menu
async function moveApplication(applicationId, newStatus) {
  const application = applications.value.find((item) => item._id === applicationId)
  if (!application || application.status === newStatus) {
    return
  }

  try{
    await updateApplicationStatus(applicationId, { status: newStatus });
    application.status = newStatus;
  } catch (error) {
    console.error(error)
    status.value = 'There was an error: ' + error.message
  }
}

// "Add application", a column's + button or its "Add" button (status = the column, or 'saved' from the toolbar)
function openAddForm(status) {
  // TODO: open the add application form with this status selected
  console.log('add application to', status)
}

// card clicked
function openDetails(application) {
  // TODO: open the application detail modal (Figma screen 06)
  console.log('open application', application._id)
}
</script>

<template>
  <div class="p-2">
    <OpportunityHeader
      v-model="search"
      title="Application tracker"
      subtitle="Drag cards between stages. Deadlines sync to your calendar."
      type="applications"
    />

    <TrackerToolbar
      v-model:view-mode="viewMode"
      v-model:type="typeFilter"
      v-model:deadline="deadlineFilter"
      v-model:hide-rejected="hideRejected"
      :total="filteredApplications.length"
      :due-this-week="dueThisWeekCount"
      @add="openAddForm('saved')"
    />

    <div v-if="viewMode === 'board'" class="kanban-board d-flex gap-3 align-items-start pb-2">
      <KanbanColumn
        v-for="stage in visibleStages"
        :key="stage.status"
        :stage="stage"
        :applications="applicationsInStage(stage.status)"
        @add="openAddForm(stage.status)"
        @open="openDetails"
        @move="moveApplication"
      />
    </div>

    <!-- TODO: calendar view (Figma screen 07) -->
    <p v-else class="text-center text-body-secondary py-5">Calendar view is not built yet.</p>
  </div>
</template>
