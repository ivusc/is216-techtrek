import {
  addApplicationService,
  addReviewService,
  deleteReviewService,
  deleteApplicationService,
  fetchAllApplications,
  updateApplicationService,
  updateReviewService,
} from '@/services/trackerService';
import { acceptHMRUpdate, defineStore } from 'pinia';
import { ref } from 'vue';

export const useApplicationsStore = defineStore('applications', () => {
  const applications = ref([]);
  const isLoading = ref(false); // first fetch only, the tracker shows a full-page loader for it
  const isSaving = ref(false); // moves, edits and deletes, the page stays on screen
  const status = ref(null);
  const celebration = ref(null);

  function celebrate(application, step = 'congrats') {
    celebration.value = { application, step };
  }

  function dismissCelebration() {
    celebration.value = null;
  }

  function reachedOffer(previousStatus, application) {
    return application.status === 'offer' && previousStatus !== 'offer' && !application.review;
  }

  async function fetchApplications() {
    isLoading.value = true;
    status.value = null;

    try {
      const data = await fetchAllApplications();
      if (data != null) {
        applications.value = data;
      } else {
        status.value = 'Applications could not be loaded right now.';
      }
    } catch (error) {
      status.value = 'There was an error: ' + error.message;
    } finally {
      isLoading.value = false;
    }
  }

  // "Add application" form; returns true when it worked so the form can close
  async function addApplication(opportunity, details) {
    isSaving.value = true;
    status.value = null;

    try {
      const created = await addApplicationService(opportunity, details);
      applications.value.push(created);
      if (reachedOffer(undefined, created)) celebrate(created);
      return true;
    } catch (error) {
      console.error(error);
      // the server sends { error } for things like a missing title
      status.value = 'Could not add the application: ' + (error.response?.data?.error ?? error.message);
      return false;
    } finally {
      isSaving.value = false;
    }
  }

  async function updateApplicationStatus(id, newStatus) {
    const application = applications.value.find((item) => item._id === id);
    if (!application) {
      status.value = 'Unable to find application.';
      return;
    }
    if (application.status === newStatus) {
      return;
    }

    status.value = null;
    isSaving.value = true;
    const previous = application.status;
    try {
      await updateApplicationService(id, { status: newStatus });
      application.status = newStatus;
      if (reachedOffer(previous, application)) celebrate(application);
    } catch (error) {
      console.error(error);
      status.value = 'There was an error: ' + error.message;
    } finally {
      isSaving.value = false;
    }
  }

  async function updateApplication(id, changes) {
    status.value = null;

    const index = applications.value.findIndex((item) => item._id === id);
    if (index === -1) {
      status.value = 'Unable to find application.';
      return;
    }

    isSaving.value = true;
    const previous = applications.value[index].status;
    try {
      const updatedApplication = await updateApplicationService(id, changes);
      applications.value[index] = updatedApplication;
      if (reachedOffer(previous, updatedApplication)) celebrate(updatedApplication);
    } catch (error) {
      console.error(error);
      status.value = 'There was an error: ' + error.message;
    } finally {
      isSaving.value = false;
    }
  }

  // shares new tips, or saves changes to tips already shared. The form says which one it is
  // (editing = true), so an edit is never sent as a second share.
  // Returns the updated application, or null when it failed.
  async function submitReview(id, review, editing = false) {
    isSaving.value = true;
    status.value = null;

    try {
      const reviewed = editing ? await updateReviewService(id, review) : await addReviewService(id, review);
      const index = applications.value.findIndex((item) => item._id === id);
      if (index !== -1) applications.value[index] = reviewed;
      dismissCelebration();
      return reviewed;
    } catch (error) {
      console.error(error);
      const action = editing ? 'Could not save your tips: ' : 'Could not share your tips: ';
      status.value = action + (error.response?.data?.error ?? error.message);
      return null;
    } finally {
      isSaving.value = false;
    }
  }

  // takes my tips down; returns the updated application, or null when it failed
  async function deleteReview(id) {
    isSaving.value = true;
    status.value = null;

    try {
      const updated = await deleteReviewService(id);
      const index = applications.value.findIndex((item) => item._id === id);
      applications.value[index] = updated;
      return updated;
    } catch (error) {
      console.error(error);
      status.value = 'Could not remove your tips: ' + (error.response?.data?.error ?? error.message);
      return null;
    } finally {
      isSaving.value = false;
    }
  }

  async function deleteApplication(id) {
    isSaving.value = true;
    status.value = null;

    try {
      await deleteApplicationService(id);
      applications.value = applications.value.filter((a) => a._id !== id);
    } catch (error) {
      console.error(error);
      status.value = 'There was an error: ' + error.message;
    } finally {
      isSaving.value = false;
    }
  }

  return {
    applications,
    isLoading,
    isSaving,
    status,
    celebration,
    fetchApplications,
    addApplication,
    updateApplicationStatus,
    updateApplication,
    deleteApplication,
    celebrate,
    dismissCelebration,
    submitReview,
    deleteReview,
  };
});

// while developing, edits to this file replace the running store instead of keeping the old code
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useApplicationsStore, import.meta.hot));
}
