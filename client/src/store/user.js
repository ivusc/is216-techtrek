import { defineStore } from 'pinia';
import { ref } from 'vue';
import serverAPI from '@/services/serverAPI';

export const useUserStore = defineStore('user', () => {
  const isLoggedIn = ref(false);
  const userInfo = ref(null);
  const username = ref(null);
  const _id = ref(null);
  const skills = ref([]);
  const linkedinUrl = ref(null);
  const githubUrl = ref(null);

  async function setInfo() {
    const response = await serverAPI.get("/me");
    if (!response.data.isAuthenticated) {
      throw new Error("Backend says this user is not authenticated?");
    }
    _id.value = response.data.user._id;
    username.value = response.data.user.userName;
    skills.value = response.data.user.skills;
    linkedinUrl.value = response.data.user.linkedinUrl;
    githubUrl.value = response.data.user.githubUrl;
  };

  return {
    isLoggedIn,
    userInfo,
    username,
    _id,
    skills,
    linkedinUrl,
    githubUrl,
    setInfo,
  };
});
