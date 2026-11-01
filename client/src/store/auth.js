import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const userId = ref(localStorage.getItem('userId') ?? import.meta.env.VITE_DEV_USER_ID ?? '')

  function setUserId(id) {
    userId.value = id
    localStorage.setItem('userId', id)
  }

  return { userId, setUserId }
})
