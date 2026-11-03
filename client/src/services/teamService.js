import axios from 'axios'

const BASE_URL = (import.meta.env.VITE_SERVER_URL ?? 'http://localhost:8000') + '/teams'

export async function fetchProfile(userId) {
  const response = await axios.get(BASE_URL + '/me', { params: { userId } })
  return response.data
}

export async function updateSkills(userId, skills) {
  const response = await axios.patch(BASE_URL + '/me/skills', { userId, skills })
  return response.data
}

export async function fetchTeams(userId) {
  const response = await axios.get(BASE_URL, { params: { userId } })
  return response.data
}

export async function fetchMyTeams(userId) {
  const response = await axios.get(BASE_URL + '/mine', { params: { userId } })
  return response.data
}

export async function fetchEvents() {
  const response = await axios.get(BASE_URL + '/events')
  return response.data
}

export async function createTeam(userId, team) {
  const response = await axios.post(BASE_URL, { userId, ...team })
  return response.data
}

export async function updateTeam(userId, teamId, changes) {
  const response = await axios.patch(BASE_URL + '/' + teamId, { userId, ...changes })
  return response.data
}

export async function deleteTeam(userId, teamId) {
  await axios.delete(BASE_URL + '/' + teamId, { params: { userId } })
}

export async function sendRequest(userId, teamId, request) {
  const response = await axios.post(BASE_URL + '/' + teamId + '/requests', { userId, ...request })
  return response.data
}

export async function fetchIncomingRequests(userId) {
  const response = await axios.get(BASE_URL + '/requests/incoming', { params: { userId } })
  return response.data
}

export async function fetchSentRequests(userId) {
  const response = await axios.get(BASE_URL + '/requests/sent', { params: { userId } })
  return response.data
}

export async function answerRequest(userId, requestId, status) {
  const response = await axios.patch(BASE_URL + '/requests/' + requestId, { userId, status })
  return response.data
}

export async function withdrawRequest(userId, requestId) {
  await axios.delete(BASE_URL + '/requests/' + requestId, { params: { userId } })
}

export function getErrorMessage(error) {
  return error.response?.data?.error ?? error.message
}
