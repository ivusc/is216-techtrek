import serverAPI from './serverAPI';

const BASE_URL = '/teams';

export async function fetchTeams() {
  const response = await serverAPI.get(BASE_URL);
  return response.data;
}

export async function fetchMyTeams() {
  const response = await serverAPI.get(BASE_URL + '/mine');
  return response.data;
}

export async function createTeam(team) {
  const response = await serverAPI.post(BASE_URL, team);
  return response.data;
}

export async function updateTeam(teamId, changes) {
  const response = await serverAPI.patch(BASE_URL + '/' + teamId, changes);
  return response.data;
}

export async function deleteTeam(teamId) {
  await serverAPI.delete(BASE_URL + '/' + teamId);
}

export async function leaveTeam(teamId) {
  await serverAPI.post(BASE_URL + '/' + teamId + '/leave')
}

export async function sendRequest(teamId, request) {
  const response = await serverAPI.post(BASE_URL + '/' + teamId + '/requests', request);
  return response.data;
}

export async function fetchMatches(teamId) {
  const response = await serverAPI.get(BASE_URL + '/' + teamId + '/matches');
  return response.data;
}

export async function fetchIncomingRequests() {
  const response = await serverAPI.get(BASE_URL + '/requests/incoming');
  return response.data;
}

export async function fetchSentRequests() {
  const response = await serverAPI.get(BASE_URL + '/requests/sent');
  return response.data;
}

// role: the open role to accept them into (left out = the role they asked for)
export async function answerRequest(requestId, status, role) {
  const body = role ? { status, role } : { status };
  const response = await serverAPI.patch(BASE_URL + '/requests/' + requestId, body);
  return response.data;
}

export async function withdrawRequest(requestId) {
  await serverAPI.delete(BASE_URL + '/requests/' + requestId);
}

// invites: a team lead invites a friend by SMU email
export async function inviteToTeam(teamId, invite) {
  const response = await serverAPI.post(BASE_URL + '/' + teamId + '/invites', invite);
  return response.data;
}

export async function fetchTeamInvites(teamId) {
  const response = await serverAPI.get(BASE_URL + '/' + teamId + '/invites');
  return response.data;
}

export async function cancelInvite(inviteId) {
  await serverAPI.delete(BASE_URL + '/invites/' + inviteId);
}

// invites sent to me
export async function fetchMyInvites() {
  const response = await serverAPI.get(BASE_URL + '/invites');
  return response.data;
}

export async function answerInvite(inviteId, status) {
  const response = await serverAPI.patch(BASE_URL + '/invites/' + inviteId, { status });
  return response.data;
}

// the team lead gives a member (or themself) a role; returns the updated team
export async function assignRole(teamId, userId, role) {
  const response = await serverAPI.patch(BASE_URL + '/' + teamId + '/members/' + userId, { role });
  return response.data;
}

export function getErrorMessage(error) {
  return error.response?.data?.error ?? error.message;
}

// one team, for a shared link (/teams/<id>)
export async function fetchTeam(teamId) {
  const response = await serverAPI.get(`${BASE_URL}/${teamId}`);
  return response.data;
}
