import {
  addApplicationService,
  deleteApplicationService,
  fetchApplicationService,
  fetchAllApplications,
  updateApplicationService,
} from '@/services/trackerService';
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useApplicationsStore = defineStore('applications', () => {
  const applications = ref([]);
  const isLoading = ref(false); // first fetch only, the tracker shows a full-page loader for it
  const isSaving = ref(false); // moves, edits and deletes, the page stays on screen
  const status = ref(null);

  async function fetchApplications() {
    isLoading.value = true;
    status.value = null;

    try {
      const data = await fetchAllApplications();
      if (data != null) {
        applications.value = data;
        console.log(applications.value);
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
      applications.value.push(await fetchApplicationService(created._id));
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
    status.value = null;

    const application = applications.value.find((item) => item._id === id);
    if (!application || application.status === newStatus) {
      status.value = 'Unable to find application.';
      return;
    }

    isSaving.value = true;
    try {
      await updateApplicationService(id, { status: newStatus });
      application.status = newStatus;
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
    try {
      const updatedApplication = await updateApplicationService(id, changes);
      applications.value[index] = updatedApplication;
    } catch (error) {
      console.error(error);
      status.value = 'There was an error: ' + error.message;
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
    fetchApplications,
    addApplication,
    updateApplicationStatus,
    updateApplication,
    deleteApplication,
  };
});
