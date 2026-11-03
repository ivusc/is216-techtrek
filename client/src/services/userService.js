import serverAPI from './serverAPI';

export async function fetchMe() {
  const response = await serverAPI.get('/me');
  return response.data;
}

export async function login(userName, password) {
  const response = await serverAPI.post('/login', { userName, password });
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
