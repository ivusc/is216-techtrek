import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import * as userService from '@/services/userService';

export const useUserStore = defineStore('user', () => {
  // states
  const user = ref(null);
  const hasCheckedSession = ref(false); // true once we have asked the server who is logged in

  // getters
  const _id = computed(() => user.value?._id ?? null);
  const username = computed(() => user.value?.userName ?? null);
  const displayName = computed(() => user.value?.displayName ?? null);
  const avatarUpdatedAt = computed(() => user.value?.avatar?.updatedAt ?? '');
  const skills = computed(() => user.value?.skills ?? []);
  const linkedinUrl = computed(() => user.value?.linkedinUrl ?? null);
  const githubUrl = computed(() => user.value?.githubUrl ?? null);
  const isLoggedIn = computed(() => !!_id.value);

  // actions
  function setUser(profile) {
    user.value = profile ?? null;
  }

  function clearSession() {
    setUser(null);
    hasCheckedSession.value = true;
  }

  // asks the server who is logged in (the session cookie survives a page refresh, the store does not)
  async function fetchMe() {
    try {
      const session = await userService.fetchMe();
      setUser(session.isAuthenticated ? session.user : null);
    } catch (error) {
      console.error(error);
      setUser(null);
    } finally {
      hasCheckedSession.value = true;
    }
  }

  // errors are left for the login / sign up panel to show
  async function login(userName, password) {
    setUser(await userService.login(userName, password));
  }

  async function register(userName, password) {
    setUser(await userService.register(userName, password));
  }

  async function logout() {
    try {
      await userService.logout();
    } catch (error) {
      console.error(error);
    }
    clearSession();
  }

  async function updateMe(changes) {
    setUser(await userService.updateMe(changes));
  }

  async function changePassword(currentPassword, newPassword) {
    await userService.changePassword(currentPassword, newPassword);
  }

  async function uploadAvatar(blob) {
    setUser(await userService.uploadAvatar(blob));
  }

  async function removeAvatar() {
    setUser(await userService.removeAvatar());
  }

  async function deleteMe(password) {
    await userService.deleteMe(password);
    clearSession();
  }

  return {
    user,
    username,
    displayName,
    avatarUpdatedAt,
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
    clearSession,
    updateMe,
    changePassword,
    deleteMe,
    uploadAvatar,
    removeAvatar,
  };
});
