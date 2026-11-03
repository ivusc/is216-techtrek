import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import serverAPI from '@/services/serverAPI';

export const useUserStore = defineStore('user', () => {
  // states
  const username = ref(null);
  const _id = ref(null);
  const skills = ref([]);
  const linkedinUrl = ref(null);
  const githubUrl = ref(null);
  const displayName = ref(null);
  const faculty = ref(null);
  const onboarded = ref(false); // false until the first-time setup (name, school, skills) is done
  // profile page
  const year = ref(null);
  const bio = ref('');
  const skillLevels = ref({}); // { "Vue.js": "Advanced" }
  const careerInterests = ref({ roles: [], opportunityTypes: [], workType: '', availableFrom: '' });
  const openToTeams = ref(true);
  const hasCheckedSession = ref(false); // true once we have asked the server who is logged in

  // getters
  const isLoggedIn = computed(() => !!_id.value);

  // actions
  function setUser(user) {
    _id.value = user?._id ?? null;
    username.value = user?.userName ?? null;
    skills.value = user?.skills ?? [];
    linkedinUrl.value = user?.linkedinUrl ?? null;
    githubUrl.value = user?.githubUrl ?? null;
    displayName.value = user?.displayName ?? null;
    faculty.value = user?.faculty ?? null;
    onboarded.value = user?.onboarded === true;
    year.value = user?.year ?? null;
    bio.value = user?.bio ?? '';
    skillLevels.value = user?.skillLevels ?? {};
    careerInterests.value = {
      roles: user?.careerInterests?.roles ?? [],
      opportunityTypes: user?.careerInterests?.opportunityTypes ?? [],
      workType: user?.careerInterests?.workType ?? '',
      availableFrom: user?.careerInterests?.availableFrom ?? '',
    };
    openToTeams.value = user?.openToTeams !== false;
  }

  // changes: any of the profile fields above (the server sends back the updated user)
  async function updateProfile(changes) {
    const response = await serverAPI.patch('/me', changes);
    setUser(response.data.user);
  }

  // asks the server who is logged in (the session cookie survives a page refresh, the store does not)
  async function fetchMe() {
    try {
      const response = await serverAPI.get('/me');
      setUser(response.data.isAuthenticated ? response.data.user : null);
    } catch (error) {
      console.error(error);
      setUser(null);
    } finally {
      hasCheckedSession.value = true;
    }
  }

  // errors are left for the login / sign up panel to show
  async function login(userName, password) {
    const response = await serverAPI.post('/login', { userName, password });
    setUser(response.data.user);
  }

  async function register(userName, password) {
    const response = await serverAPI.post('/register', { userName, password });
    setUser(response.data.user);
  }

  async function logout() {
    try {
      await serverAPI.post('/logout');
    } catch (error) {
      console.error(error);
    }
    setUser(null);
  }

  return {
    username,
    _id,
    skills,
    linkedinUrl,
    githubUrl,
    displayName,
    faculty,
    onboarded,
    year,
    bio,
    skillLevels,
    careerInterests,
    openToTeams,
    hasCheckedSession,
    isLoggedIn,
    fetchMe,
    login,
    register,
    logout,
    updateProfile,
  };
});
