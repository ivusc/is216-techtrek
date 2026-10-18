<script setup>
import { ref, computed, onMounted } from 'vue';
import './tracker.css';
import OpportunityHeader from '@/components/opportunities/OpportunityHeader.vue';
import TrackerToolbar from '@/components/tracker/TrackerToolbar.vue';
import KanbanColumn from '@/components/tracker/KanbanColumn.vue';
import CalendarView from '@/components/tracker/CalendarView.vue';
import ApplicationDetailModal from '@/components/tracker/ApplicationDetailModal.vue';
import { trackerStages } from '@/constants';
import { isDueThisWeek, isOverdue } from '@/utils/application';
import { storeToRefs } from 'pinia';
import { useApplicationsStore } from '@/store/applications';

const applicationStore = useApplicationsStore();
const { applications, status, isLoading } = storeToRefs(applicationStore);
const { fetchApplications, updateApplicationStatus, updateApplication, deleteApplication } = applicationStore;

const search = ref('');
const viewMode = ref('board'); // 'board' or 'calendar'
const typeFilter = ref(''); // '' = all types
const deadlineFilter = ref(''); // '' | 'week' | 'overdue'
const hideRejected = ref(false);

onMounted(fetchApplications);

console.log(applications)

// applications that pass the search box and the toolbar filters
const filteredApplications = computed(() => {
  const keyword = search.value.trim().toLowerCase();

  return applications.value.filter((application) => {
    const opportunity = application.opportunityId;

    if (keyword !== '') {
      const text = (opportunity.title + ' ' + opportunity.organisation).toLowerCase();
      if (!text.includes(keyword)) {
        return false;
      }
    }
    if (typeFilter.value !== '' && opportunity.type !== typeFilter.value) {
      return false;
    }
    if (hideRejected.value && application.status === 'rejected') {
      return false;
    }
    if (deadlineFilter.value === 'week' && !isDueThisWeek(application)) {
      return false;
    }
    if (deadlineFilter.value === 'overdue' && !isOverdue(application)) {
      return false;
    }
    return true;
  });
});

// "Hide rejected" also removes the Rejected column
const visibleStages = computed(() => {
  if (hideRejected.value) {
    return trackerStages.filter((stage) => stage.status !== 'rejected');
  }
  return trackerStages;
});

const dueThisWeekCount = computed(() => filteredApplications.value.filter(isDueThisWeek).length);

function applicationsInStage(status) {
  return filteredApplications.value.filter((application) => application.status === status);
}

//move to a diff status type
async function moveApplication(applicationId, newStatus) {
  await updateApplicationStatus(applicationId, newStatus);
}

// "Add application", a column's + button or its "Add" button (status = the column, or 'saved' from the toolbar)
function openAddForm(status) {
  // TODO: open the add application form with this status selected
  console.log('add application to', status);
}

// calendar view's "Export to Google Calendar (.ics)" button
function exportCalendar() {
  // TODO: download the deadlines and interviews as an .ics file
  console.log('export calendar');
}

// the application shown in the detail modal (null = modal is closed)
const selectedApplication = ref(null);

function openDetails(application) {
  selectedApplication.value = application;
}

function closeDetails() {
  selectedApplication.value = null;
}

// UPDATE changes = { status, notes, interviewAt, deadline }
async function saveDetails(changes) {
  await updateApplication(selectedApplication.value._id, changes);
  if (!status.value) closeDetails();
}

// DELETE
async function deleteSelected() {
  await deleteApplication(selectedApplication.value._id);
  if (!status.value) closeDetails();
}
</script>

<template>
  <div class="p-2">
    <OpportunityHeader v-model="search" title="Application tracker" :subtitle="viewMode === 'board'
      ? 'Drag cards between stages. Deadlines sync to your calendar.'
      : 'Every deadline, interview and hackathon in one month view.'" type="applications" />

    <div v-if="status" class="alert alert-danger" role="alert">{{ status }}</div>

    <div v-if="isLoading">
      <p>Loading...</p>
    </div>

    <div v-else>
      <TrackerToolbar v-model:view-mode="viewMode" v-model:type="typeFilter" v-model:deadline="deadlineFilter"
        v-model:hide-rejected="hideRejected" :total="filteredApplications.length" :due-this-week="dueThisWeekCount"
        @add="openAddForm('saved')" />

      <div v-if="viewMode === 'board'" class="kanban-board d-flex gap-3 align-items-start pb-2">
        <KanbanColumn v-for="stage in visibleStages" :key="stage.status" :stage="stage"
          :applications="applicationsInStage(stage.status)" @add="openAddForm(stage.status)" @open="openDetails"
          @move="moveApplication" />
      </div>

      <CalendarView v-else :applications="filteredApplications" @open="openDetails" @export="exportCalendar" />

      <!-- Details Modal -->
      <ApplicationDetailModal v-if="selectedApplication" :key="selectedApplication._id"
        :application="selectedApplication" @close="closeDetails" @save="saveDetails" @delete="deleteSelected" />
    </div>
  </div>
</template>
