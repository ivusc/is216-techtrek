import { fetchAllOpportunities, fetchJobs, fetchJobFilterOptions } from '@/services/opportunityService';
import {
  createApplicationService,
  deleteApplicationService,
  fetchAllApplications,
} from '@/services/trackerService';
import { fetchTeams } from '@/services/teamService';
import { getKey } from '@/utils/opportunity';
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useOpportunityStore = defineStore('opportunity', () => {
  const jobs = ref([]);
  const hackathons = ref([]);
  const isLoading = ref(true);
  const isSaving = ref(false);
  const status = ref(''); 
  const lastUpdated = ref(''); // time of the last successful fetch

  const jobsPage = ref(1);
  const hasMoreJobs = ref(true);

  // job filters, '' = any
  const jobType = ref(''); // fulltime | intern
  const jobField = ref(''); // an IT role key, e.g. frontend or data
  // [{ key, label }] IT roles from the server
  const roleOptions = ref([]);

  async function loadRoleOptions() {
    if (roleOptions.value.length > 0) return;
    try {
      const data = await fetchJobFilterOptions();
      roleOptions.value = data.roles;
    } catch (error) {
      console.error(error);
    }
  }

  const savedItems = ref([]);

  // { "Hackathon title": 3 } - how many teams with open slots each hackathon has, for the "Find team" buttons
  const teamCounts = ref({});

  // gets all jobs and hackathons from our express server
  async function fetchOpportunities() {
    isLoading.value = true;
    status.value = '';

    try {
      const data = await fetchAllOpportunities({ type: jobType.value, field: jobField.value });

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
      fetchTeamCounts();
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
      const opportunity = application.opportunityId;
      if (opportunity != null) {
        items.push({ key: getKey(opportunity), id: application._id });
      }
    }

    savedItems.value = items;
  }

  // gets the first page of jobs again after the job filters change, hackathons stay as they are
  async function reloadJobs() {
    isLoading.value = true;
    status.value = '';

    try {
      const data = await fetchJobs(1, { type: jobType.value, field: jobField.value });
      jobs.value = data.jobs;
      jobsPage.value = 1;
      hasMoreJobs.value = data.jobs.length > 0;
    } catch (error) {
      console.error(error);
      status.value = 'Jobs could not be loaded right now.';
    } finally {
      isLoading.value = false;
    }
  }

  // gets the next page of jobs and adds the ones we do not have yet
  async function fetchMoreJobs() {
    try {
      const data = await fetchJobs(jobsPage.value + 1, { type: jobType.value, field: jobField.value });

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
      return;
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

  // counted by event name, the same way the Teams page filters by event
  async function fetchTeamCounts() {
    try {
      const teams = await fetchTeams();
      const counts = {};
      for (const team of teams) {
        if (team.slotsOpen > 0) {
          counts[team.event.name] = (counts[team.event.name] ?? 0) + 1;
        }
      }
      teamCounts.value = counts;
    } catch (error) {
      console.error(error);
    }
  }

  function teamCountFor(item) {
    return teamCounts.value[item.title] ?? 0;
  }

  return {
    jobs,
    hackathons,
    isLoading,
    isSaving,
    status,
    lastUpdated,
    hasMoreJobs,
    jobType,
    jobField,
    roleOptions,
    loadRoleOptions,
    savedItems,
    teamCounts,
    fetchOpportunities,
    fetchTeamCounts,
    teamCountFor,
    reloadJobs,
    fetchMoreJobs,
    isSaved,
    toggleSave,
  };
});
