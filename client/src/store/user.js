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
    hasCheckedSession,
    isLoggedIn,
    fetchMe,
    login,
    register,
    logout,
  };
});
