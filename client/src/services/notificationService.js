import serverAPI from './serverAPI'

const BASE_URL = '/notifications'

export async function fetchNotifications() {
  const response = await serverAPI.get(BASE_URL)
  return response.data
}

export async function markNotificationRead(notificationId) {
  const response = await serverAPI.patch(BASE_URL + '/' + notificationId + '/read')
  return response.data
}

export async function markAllNotificationsRead() {
  await serverAPI.patch(BASE_URL + '/read')
}
