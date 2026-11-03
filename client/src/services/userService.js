import serverAPI from './serverAPI';

export async function fetchMe() {
  const response = await serverAPI.get('/me', { timeout: 10000 });
  return response.data;
}

export async function login(userName, password) {
  const response = await serverAPI.post(
    '/login',
    { userName, password },
    { skipAuthRedirect: true },
  );
  return response.data.user;
}

export async function register(userName, password) {
  const response = await serverAPI.post('/register', { userName, password });
  return response.data.user;
}

export async function logout() {
  await serverAPI.post('/logout');
}

export async function updateMe(changes) {
  const response = await serverAPI.patch('/me', changes);
  return response.data.user;
}

export async function changePassword(currentPassword, newPassword) {
  await serverAPI.patch('/me/password', { currentPassword, newPassword });
}

export async function deleteMe(password) {
  await serverAPI.delete('/me', { data: { password } });
}
