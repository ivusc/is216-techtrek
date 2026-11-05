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

export async function uploadAvatar(blob) {
  const response = await serverAPI.put('/me/avatar', blob, {
    headers: { 'Content-Type': blob.type },
  });
  return response.data.user;
}

// use one of the illustrated characters (key from fetchAvatarPresets) as my profile picture
export async function setAvatarPreset(preset) {
  const response = await serverAPI.put('/me/avatar/preset', { preset });
  return response.data.user;
}

// the characters to pick from: [{ key, label, group: 'female' | 'male' }]
export async function fetchAvatarPresets() {
  const response = await serverAPI.get('/avatars');
  return response.data.presets;
}

// where a character's picture is, for an <img>
export function avatarPresetUrl(key) {
  return `${serverAPI.defaults.baseURL}/avatars/${key}`;
}

export async function removeAvatar() {
  const response = await serverAPI.delete('/me/avatar');
  return response.data.user;
}

// someone's profile page: their profile and SMU email (never their Telegram)
export async function fetchProfile(userId) {
  const response = await serverAPI.get('/users/' + encodeURIComponent(userId));
  return response.data.user;
}
