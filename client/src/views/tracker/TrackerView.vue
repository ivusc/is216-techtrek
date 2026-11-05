<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import './tracker.css';
import TrackerToolbar from '@/components/tracker/TrackerToolbar.vue';
import KanbanColumn from '@/components/tracker/board/KanbanColumn.vue';
import CalendarView from '@/components/tracker/calendar/CalendarView.vue';
import TrackerHistory from '@/components/tracker/history/TrackerHistory.vue';
import ApplicationDetailModal from '@/components/tracker/ApplicationDetailModal.vue';
import AddApplicationModal from '@/components/tracker/AddApplicationModal.vue';
import OfferCelebrationModal from '@/components/tracker/OfferCelebrationModal.vue';
import TipsThanksToast from '@/components/tracker/TipsThanksToast.vue';
import { trackerStages, hackathonStages } from '@/constants';
import { isDueThisWeek, isOverdue, isEventType, isArchived } from '@/utils/application';
import { storeToRefs } from 'pinia';
import { useApplicationsStore } from '@/store/applications';
import { buildIcsFile } from '@/utils/calendar';
import PageHeader from '@/components/PageHeader.vue';
import TrekLoader from '@/components/TrekLoader.vue';

const applicationStore = useApplicationsStore();
const { applications, status, isLoading, isSaving, celebration } = storeToRefs(applicationStore);
const {
  fetchApplications,
  updateApplicationStatus,
  updateApplication,
  deleteApplication,
  celebrate,
  dismissCelebration,
  submitReview,
  deleteReview,
} = applicationStore;

const search = ref('');
const route = useRoute();
const router = useRouter();
const viewMode = ref(route.query.view === 'history' ? 'history' : 'board'); // 'board', 'calendar' or 'history'
const typeFilter = ref(''); // '' = all types
const deadlineFilter = ref(''); // '' | 'week' | 'overdue'
const hideRejected = ref(false);
// which board: jobs & internships, or hackathons & competitions (they have different steps).
// /tracker?board=hackathons opens the hackathon board
const board = ref(route.query.board === 'hackathons' ? 'hackathons' : 'jobs');

// a type filter from the other board would hide everything, so clear it when switching
watch(board, () => {
  typeFilter.value = '';
});

// /tracker?open=<applicationId> (from a reminder, Home's deadlines or the calendar) opens that card's
// details once the applications have loaded, on the board it belongs to
const linkNotFound = ref(false);
function openFromLink() {
  const id = route.query.open;
  if (!id) return;
  const application = applications.value.find((item) => item._id === id);
  if (application) {
    board.value = isEventType(application.opportunityId.type) ? 'hackathons' : 'jobs';
    openDetails(application);
  } else {
    linkNotFound.value = true;
  }
}

onMounted(async () => {
  await fetchApplications();
  openFromLink();
});
// a link clicked while already on the Tracker (e.g. from the bell)
watch(() => route.query.open, openFromLink);
onUnmounted(dismissCelebration);

function clearFilters() {
  search.value = '';
  typeFilter.value = '';
  deadlineFilter.value = '';
  hideRejected.value = false;
}

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

function onBoard(application, name) {
  return isEventType(application.opportunityId.type) === (name === 'hackathons');
}

// the board only shows its own kind (and nothing that moved to History); the calendar shows both
const activeApplications = computed(() => filteredApplications.value.filter((application) => !isArchived(application)));
const boardApplications = computed(() => activeApplications.value.filter((application) => onBoard(application, board.value)));
const boardCounts = computed(() => ({
  jobs: activeApplications.value.filter((application) => onBoard(application, 'jobs')).length,
  hackathons: activeApplications.value.filter((application) => onBoard(application, 'hackathons')).length,
}));

// History: everything that left the board. Only the search and type filters apply here
// (deadlines and "Hide rejected" are about what's still going on).
const historyApplications = computed(() => {
  const keyword = search.value.trim().toLowerCase();
  return applications.value.filter((application) => {
    const opportunity = application.opportunityId;
    if (!isArchived(application)) return false;
    if (keyword !== '' && !(opportunity.title + ' ' + opportunity.organisation).toLowerCase().includes(keyword)) return false;
    return typeFilter.value === '' || opportunity.type === typeFilter.value;
  });
});
const historyCount = computed(() => applications.value.filter(isArchived).length);

// "Move to history" from a card's menu, and "Back to board" from History
const movingId = ref('');
async function setArchived(applicationId, archived) {
  movingId.value = applicationId;
  await updateApplication(applicationId, { archivedAt: archived ? new Date().toISOString() : null });
  movingId.value = '';
}

// hackathons have their own columns; "Hide rejected" removes the jobs' Rejected column
const visibleStages = computed(() => {
  if (board.value === 'hackathons') {
    return hackathonStages;
  }
  if (hideRejected.value) {
    return trackerStages.filter((stage) => stage.status !== 'rejected');
  }
  return trackerStages;
});

const shownApplications = computed(() => {
  if (viewMode.value === 'board') return boardApplications.value;
  if (viewMode.value === 'history') return historyApplications.value;
  return filteredApplications.value;
});
const dueThisWeekCount = computed(() => shownApplications.value.filter(isDueThisWeek).length);

function applicationsInStage(status) {
  return boardApplications.value.filter((application) => application.status === status);
}

//move to a diff status type
// the card's "Followed up" button: note the date, which hides the nudge for another 14 days
async function markFollowedUp(applicationId) {
  await updateApplication(applicationId, { followedUpAt: new Date().toISOString() });
}

async function moveApplication(applicationId, newStatus) {
  await updateApplicationStatus(applicationId, newStatus);
}

// stage the add form starts in (null = form is closed); the form opens on the board's own tab
const addFormStatus = ref(null);
const addFormKind = computed(() => (board.value === 'hackathons' ? 'event' : 'job'));

// "Add application", a column's + button or its "Add" button (stage = the column, or 'saved' from the toolbar)
function openAddForm(stage) {
  status.value = null;
  addFormStatus.value = stage;
}

function closeAddForm() {
  addFormStatus.value = null;
}

async function addNewApplication(opportunity, details) {
  const added = await applicationStore.addApplication(opportunity, details);
  if (added) closeAddForm();
}

// calendar view's "Export to Google Calendar (.ics)" button
function exportCalendar() {
  const text = buildIcsFile(filteredApplications.value)
  const file = new Blob([text], { type: 'text/calendar' });
  const url = URL.createObjectURL(file);

  const link = document.createElement('a');
  link.href = url;
  link.download = 'techtrek-applications.ics';
  link.click();

  URL.revokeObjectURL(url);
}

// the application shown in the detail modal (null = modal is closed)
const selectedApplication = ref(null);

// true when the modal reopens right after tips were shared or edited
const tipsJustSaved = ref(false);

function openDetails(application) {
  tipsJustSaved.value = false;
  selectedApplication.value = application;
}

function closeDetails() {
  selectedApplication.value = null;
  // drop ?open= so a refresh doesn't open it again
  if (route.query.open) {
    const rest = { ...route.query };
    delete rest.open;
    router.replace({ query: rest });
  }
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

// share or edit tips from the detail modal; once saved, the modal opens again showing them
let tipsFromDetails = false;
function shareTips() {
  const application = selectedApplication.value;
  closeDetails();
  status.value = null;
  tipsFromDetails = true;
  celebrate(application, 'form');
}

// the thank-you pop-up after tips are saved (null = hidden)
const thanks = ref(null);

async function saveTips(review) {
  const edited = Boolean(celebration.value.application.review);
  const saved = await submitReview(celebration.value.application._id, review, edited);
  if (saved) thanks.value = { key: Date.now(), edited, organisation: saved.opportunityId?.organisation ?? '' };
  if (saved && tipsFromDetails) {
    tipsJustSaved.value = true;
    selectedApplication.value = saved;
  }
  if (saved) tipsFromDetails = false;
}

function closeTips() {
  const application = celebration.value?.application;
  dismissCelebration();
  status.value = null;
  // Cancel on an edit goes back to the job, so the tips are still on screen
  if (tipsFromDetails && application) selectedApplication.value = application;
  tipsFromDetails = false;
}

async function deleteTips() {
  tipsJustSaved.value = false;
  const updated = await deleteReview(selectedApplication.value._id);
  if (updated) selectedApplication.value = updated;
}
</script>

<template>
  <div class="p-2 h-100 d-flex flex-column overflow-hidden">
    <PageHeader v-model="search" title="Application tracker" :subtitle="viewMode === 'board'
      ? 'Drag cards between stages. Deadlines sync to your calendar.'
      : viewMode === 'history'
        ? 'Everything that has finished, newest first.'
        : 'Every deadline, interview and hackathon in one month view.'" type="applications" />

    <div v-if="status" class="alert alert-danger" role="alert">{{ status }}</div>
    <div v-if="linkNotFound" class="alert alert-warning d-flex align-items-center gap-2" role="status">
      <span class="flex-grow-1">That application isn't in your tracker any more.</span>
      <button type="button" class="btn-close" aria-label="Dismiss" @click="linkNotFound = false"></button>
    </div>

    <TrekLoader
      v-if="isLoading"
      title="Loading your tracker"
      :captions="['Gathering your applications…', 'Sorting cards into columns…', 'Checking upcoming deadlines…']"
    />

    <div v-else class="d-flex flex-column flex-grow-1 min-h-0">
      <TrackerToolbar v-model:view-mode="viewMode" v-model:board="board" v-model:type="typeFilter" v-model:deadline="deadlineFilter"
        v-model:hide-rejected="hideRejected" :board-counts="boardCounts" :history-count="historyCount" :total="shownApplications.length" :due-this-week="dueThisWeekCount"
        @add="openAddForm('saved')" @clear="clearFilters" />

      <div v-if="viewMode === 'board'" class="kanban-board d-flex gap-3 pb-2 flex-grow-1 min-h-0">
        <KanbanColumn v-for="stage in visibleStages" :key="stage.status" :stage="stage"
          :applications="applicationsInStage(stage.status)" @add="openAddForm(stage.status)" @open="openDetails"
          @move="moveApplication" @follow-up="markFollowedUp" @archive="(id) => setArchived(id, true)" />
      </div>

      <TrackerHistory v-else-if="viewMode === 'history'" class="flex-grow-1 min-h-0 overflow-auto" :applications="historyApplications"
        :busy-id="movingId" @open="openDetails" @restore="(application) => setArchived(application._id, false)" />

      <CalendarView v-else class="flex-grow-1 min-h-0 overflow-auto" :applications="filteredApplications" @open="openDetails" @export="exportCalendar" />

      <AddApplicationModal v-if="addFormStatus" :status="addFormStatus" :kind="addFormKind" :is-saving="isSaving" :error="status ?? ''"
        @close="closeAddForm" @add="addNewApplication" />

      <!-- Details Modal -->
      <ApplicationDetailModal v-if="selectedApplication" :key="selectedApplication._id"
        :application="selectedApplication" :tips-just-saved="tipsJustSaved" @close="closeDetails" @save="saveDetails" @delete="deleteSelected"
        @share-tips="shareTips" @delete-tips="deleteTips" />

      <OfferCelebrationModal v-if="celebration" :key="celebration.step" :application="celebration.application"
        :step="celebration.step" :busy="isSaving" :error="status ?? ''" @close="closeTips"
        @next="celebrate(celebration.application, 'form')"
        @submit="saveTips" />

      <TipsThanksToast v-if="thanks" :key="thanks.key" :edited="thanks.edited" :organisation="thanks.organisation"
        @close="thanks = null" />
    </div>
  </div>
</template>
