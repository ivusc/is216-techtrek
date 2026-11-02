import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';

export const useUserStore = defineStore('user', () => {
  const isLoggedIn = ref(false);
  const userInfo = ref(null);
  const username = ref(null);
  const _id = ref(null);
  const skills = ref([]);
  const linkedinUrl = ref(null);
  const githubUrl = ref(null);

  async function setInfo() {
    const response = await axios.get("http://localhost:8000/me");
    if (!response.data.isAuthenticated) {
      throw new Error("Backend says this user is not authenticated?");
    }
    (_id.value, username.value, skills.value, linkedinUrl.value, githubUrl.value = response.data.user);
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
