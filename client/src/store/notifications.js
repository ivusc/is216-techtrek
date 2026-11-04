import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as notificationService from '@/services/notificationService'

const REFRESH_MS = 30000 // check for new notifications every 30 seconds while logged in

export const useNotificationStore = defineStore('notifications', () => {
  // states
  const notifications = ref([])
  const unreadCount = ref(0)
  const isLoading = ref(false)
  let timer = null

  // actions
  async function refresh() {
    isLoading.value = true
    try {
      const data = await notificationService.fetchNotifications()
      notifications.value = data.notifications
      unreadCount.value = data.unreadCount
    } catch (error) {
      // a missed refresh is fine, the next one will catch up
      console.error(error)
    }
    isLoading.value = false
  }

  async function markRead(notification) {
    if (notification.read) return
    notification.read = true
    unreadCount.value = Math.max(0, unreadCount.value - 1)
    try {
      await notificationService.markNotificationRead(notification._id)
    } catch (error) {
      console.error(error)
    }
  }

  async function markAllRead() {
    for (const notification of notifications.value) {
      notification.read = true
    }
    unreadCount.value = 0
    try {
      await notificationService.markAllNotificationsRead()
    } catch (error) {
      console.error(error)
    }
  }

  // also refresh when the user comes back to the tab
  function onVisible() {
    if (document.visibilityState === 'visible') refresh()
  }

  function start() {
    if (timer) return
    refresh()
    timer = setInterval(refresh, REFRESH_MS)
    document.addEventListener('visibilitychange', onVisible)
  }

  function stop() {
    clearInterval(timer)
    timer = null
    document.removeEventListener('visibilitychange', onVisible)
    notifications.value = []
    unreadCount.value = 0
  }

  return { notifications, unreadCount, isLoading, refresh, markRead, markAllRead, start, stop }
})
