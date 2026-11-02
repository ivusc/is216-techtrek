import { defineStore } from "pinia";
import { ref } from "vue";

export const useAuthStore = defineStore('user', ()=> {
  const username = ref("not set");
  const isLoggedIn = ref(false);
  const userInfo = ref("not set yet");


  function setInfo(userObject) {
    username.value = userObject?.username;
    userInfo.value = userObject?.value;
  }

  return {
    username,
    isLoggedIn,
    userInfo,
    setInfo
  }
})
