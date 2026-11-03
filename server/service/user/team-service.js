import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/teams',
});

export function getErrorMessage(error) {
  return error.response?.data?.error || error.message || 'An unexpected error occurred';
}

export async function fetchProfile(userId) {
  const { data } = await api.get('/me', { params: { userId } });
  return data;
}

export async function updateSkills(userId, skills) {
  const { data } = await api.patch('/me/skills', { userId, skills });
  return data;
}

export async function fetchTeams(userId) {
  const { data } = await api.get('/', { params: { userId } });
  return data;
}

export async function fetchMyTeams(userId) {
  const { data } = await api.get('/mine', { params: { userId } });
  return data;
}

export async function fetchEvents() {
  const { data } = await api.get('/events');
  return data;
}

export async function createTeam(userId, payload) {
  const { data } = await api.post('/', { userId, ...payload });
  return data;
}

export async function updateTeam(userId, teamId, payload) {
  const { data } = await api.patch(`/${teamId}`, { userId, ...payload });
  return data;
}

export async function deleteTeam(userId, teamId) {
  await api.delete(`/${teamId}`, { params: { userId } });
}

export async function sendRequest(userId, teamId, payload) {
  const { data } = await api.post(`/${teamId}/requests`, { userId, ...payload });
  return data;
}

export async function fetchIncomingRequests(userId) {
  const { data } = await api.get('/requests/incoming', { params: { userId } });
  return data;
}

export async function fetchSentRequests(userId) {
  const { data } = await api.get('/requests/sent', { params: { userId } });
  return data;
}

export async function answerRequest(userId, requestId, status) {
  const { data } = await api.patch(`/requests/${requestId}`, { userId, status });
  return data;
}

export async function withdrawRequest(userId, requestId) {
  await api.delete(`/requests/${requestId}`, { params: { userId } });
}