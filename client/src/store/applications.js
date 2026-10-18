import { deleteApplicationService, fetchAllApplications, updateApplicationService } from '@/services/trackerService';
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useApplicationsStore = defineStore('applications', () => {
  const applications = ref([]);
  const isLoading = ref(false);
  const status = ref(null);

  async function fetchApplications() {
    isLoading.value = true;
    status.value = null;
    
    try{
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

  async function updateApplicationStatus(id, newStatus) {
    isLoading.value = true;
    status.value = null;

    const application = applications.value.find((item) => item._id === id);
    if (!application || application.status === newStatus) {
      status.value = 'Unable to find application.'
      return;
    }

    try{
      await updateApplicationService(id, { status: newStatus });
      application.status = newStatus;
    } catch (error) {
      console.error(error);
      status.value = 'There was an error: ' + error.message;
    } finally {
      isLoading.value = false;
    }
  } 

  async function updateApplication(id, changes) {
    isLoading.value = true;
    status.value = null;

    const index = applications.value.findIndex((item) => item._id === id);
    if (index === -1) {
      status.value = 'Unable to find application.'
      return;
    };
    
    try {
      const updatedApplication = await updateApplicationService(id, changes);
      applications.value[index] = updatedApplication;
    } catch (error) {
      console.error(error);
      status.value = 'There was an error: ' + error.message;
    } finally {
      isLoading.value = false;
    }
  }

  async function deleteApplication(id) {
    isLoading.value = true;
    status.value = null;

    try{
      await deleteApplicationService(id);
      applications.value = applications.value.filter((a) => a._id !== id);
    } catch (error) {
      console.error(error);
      status.value = 'There was an error: ' + error.message;
    } finally {
      isLoading.value = false;
    }
  }

  return { applications, isLoading, status, fetchApplications, updateApplicationStatus, updateApplication, deleteApplication }
})