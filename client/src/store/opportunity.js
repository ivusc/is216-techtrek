import { fetchAllOpportunities, fetchJobs } from '@/services/opportunityService';
import {
  createApplicationService,
  deleteApplicationService,
  fetchAllApplications,
} from '@/services/trackerService';
import { getKey } from '@/utils/opportunity';
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useOpportunityStore = defineStore('opportunity', () => {
  const jobs = ref([]);
  const hackathons = ref([]);
  const isLoading = ref(true); // true until the first fetch finishes, so the page shows its loading message
  const isSaving = ref(false); // tracking / untracking a card
  const status = ref(''); // error message, empty when there is no error
  const lastUpdated = ref(''); // time of the last successful fetch

  const jobsPage = ref(1); // last page of jobs fetched from the server
  const hasMoreJobs = ref(true);

  // tracked opportunities: { key: card key, id: _id of the application saved in the database }
  const savedItems = ref([]);

  // gets all jobs and hackathons from our express server
  async function fetchOpportunities() {
    isLoading.value = true;
    status.value = '';

    try {
      const data = await fetchAllOpportunities();

      // the server sends null for a source that failed, so check before using it
      if (data.jobs != null) {
        jobs.value = data.jobs.jobs;
      } else {
        status.value = 'Jobs could not be loaded right now.';
      }

      if (data.hackathons != null) {
        hackathons.value = data.hackathons.hackathons;
      } else {
        status.value = 'Hackathons could not be loaded right now.';
      }

      jobsPage.value = 1;
      hasMoreJobs.value = true;
      lastUpdated.value = new Date().toLocaleTimeString('en-SG', { hour: 'numeric', minute: '2-digit' });

      await fetchSavedItems();
    } catch (error) {
      console.error(error);
      status.value = 'There was an error: ' + error.message;
    } finally {
      isLoading.value = false;
    }
  }

  // gets the user's applications so cards tracked earlier show as tracked
  async function fetchSavedItems() {
    const applications = await fetchAllApplications();

    const items = [];
    for (const application of applications) {
      // the server fills in opportunityId with the full opportunity, which is null if it was deleted
      const opportunity = application.opportunityId;
      if (opportunity != null) {
        items.push({ key: getKey(opportunity), id: application._id });
      }
    }

    savedItems.value = items;
  }

  // gets the next page of jobs and adds the ones we do not have yet
  async function fetchMoreJobs() {
    try {
      const data = await fetchJobs(jobsPage.value + 1);

      let addedCount = 0;
      
      for (const job of data.jobs) {
        const alreadyHave = jobs.value.some((existing) => existing.externalId === job.externalId);
        if (!alreadyHave) {
          jobs.value.push(job);
          addedCount++;
        }
      }

      jobsPage.value++;
      if (addedCount === 0) {
        hasMoreJobs.value = false;
      }
    } catch (error) {
      console.error(error);
      hasMoreJobs.value = false;
    }
  }

  // position of the item in savedItems, -1 if it is not saved
  function findSavedIndex(item) {
    return savedItems.value.findIndex((saved) => saved.key === getKey(item));
  }

  function isSaved(item) {
    return findSavedIndex(item) !== -1;
  }

  // click once to track (creates an application), click again to untrack (deletes that application)
  async function toggleSave(item) {
    if (isSaving.value) {
      return; // a request is still running
    }

    isSaving.value = true;
    status.value = '';

    try {
      const index = findSavedIndex(item);
      if (index === -1) {
        // POST sends back the saved application with its _id, keep the _id so we can delete it later
        const savedApplication = await createApplicationService(item);
        savedItems.value.push({ key: getKey(item), id: savedApplication._id });
      } else {
        await deleteApplicationService(savedItems.value[index].id);
        savedItems.value.splice(index, 1);
      }
    } catch (error) {
      console.error(error);
      status.value = 'Could not update "' + item.title + '": ' + error.message;
    } finally {
      isSaving.value = false;
    }
  }

  return {
    jobs,
    hackathons,
    isLoading,
    isSaving,
    status,
    lastUpdated,
    hasMoreJobs,
    savedItems,
    fetchOpportunities,
    fetchMoreJobs,
    isSaved,
    toggleSave,
  };
});
