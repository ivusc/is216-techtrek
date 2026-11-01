import { defineStore } from "pinia";
import { ref } from "vue";

export const useAuthStore = defineStore('user', ()=> {
  const username = ref("not set");
  const isLoggedIn = ref(false);

  return {
    username,
    isLoggedIn
  }
})
