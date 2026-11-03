const mongoose = require('mongoose');
const userService = require('../service/user/user-service');
const {
  DatabaseError,
  IllegalArguementError,
  WrongPasswordError,
} = require('../service/user/user-service-errors');
const bycrpt = require('bcryptjs');
const { startSession, isSessionExpired, endSession } = require('../middleware/session');
const { sniffImageType, extensionOf } = require('../service/avatar');

const EDITABLE_FIELDS = [
  'displayName',
  'year',
  'course',
  'about',
  'skills',
  'linkedinUrl',
  'githubUrl',
  'openToTeams',
];

function handleUserError(res, err) {
  if (err instanceof IllegalArguementError) {
    return res.status(400).json({ error: err.message });
  }
  if (err instanceof WrongPasswordError) {
    return res.status(403).json({ error: err.message });
  }
  if (err instanceof DatabaseError) {
    return res.status(500).json({ error: err.message });
  }
  console.error(err);
  return res.status(500).json({ error: 'Something unexpected went wrong.' });
}

async function createUser(req, res) {
  const { userName, password } = req.body ?? {};
  if (typeof userName != 'string' || typeof password != 'string') {
    return res.status(400).json({ error: 'UserName or Password was empty' });
  }

  try {
    const cleanedUserName = userName.trim().toLowerCase();
    const profile = await userService.createUser(cleanedUserName, password);

    // log the new user in straight away
    await startSession(req, profile);
    return res.status(201).json({ user: profile });
  } catch (err) {
    return handleUserError(res, err);
  }
}

async function login(req, res) {
  const { userName, password } = req.body ?? {};
  if (typeof userName != 'string' || typeof password != 'string') {
    return res.status(400).json({ error: 'UserName or Password was empty' });
  }

  let profile;
  try {
    const cleanedUserName = userName.trim().toLowerCase();
    profile = await userService.findUserByUserName(cleanedUserName);
  } catch (err) {
    return handleUserError(res, err);
  }

  if (profile == null) return res.status(404).json({ error: 'User not found.' });

  const isCorrectPassword = await bycrpt.compare(password, profile.password);

  if (!isCorrectPassword) return res.status(401).json({ error: 'Wrong password.' });

  await startSession(req, profile);
  return res.status(200).json({ user: profile });
}

async function me(req, res) {
  if (!req.session?.user) {
    return res.json({ isAuthenticated: false, user: null });
  }

  let profile = null;
  if (!isSessionExpired(req.session)) {
    try {
      profile = await userService.findUserByUserId(req.session.user._id);
    } catch (err) {
      return handleUserError(res, err);
    }
  }

  if (profile == null) {
    await endSession(req, res);
    return res.json({ isAuthenticated: false, user: null });
  }

  return res.json({ isAuthenticated: true, user: profile });
}

async function updateUser(req, res) {
  const changes = req.body ?? {};
  const lockedFields = Object.keys(changes).filter((field) => !EDITABLE_FIELDS.includes(field));
  if (lockedFields.length > 0) {
    return res.status(400).json({ error: `These fields cannot be changed here: ${lockedFields.join(', ')}` });
  }
  const userId = req.session.user._id;

  try {
    const profile = await userService.updateUser(userId, changes);
    if (!profile) return res.status(404).json({ error: 'User not found.' });

    return res.status(200).json({ user: profile });
  } catch (err) {
    return handleUserError(res, err);
  }
}

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body ?? {};
  if (typeof currentPassword != 'string' || typeof newPassword != 'string') {
    return res.status(400).json({ error: 'Current and new password are required.' });
  }

  try {
    await userService.changePassword(req.session.user._id, currentPassword, newPassword);
  } catch (err) {
    return handleUserError(res, err);
  }
  return res.status(204).end();
}

async function uploadAvatar(req, res) {
  const imageType = Buffer.isBuffer(req.body) ? sniffImageType(req.body) : null;
  if (!imageType || !req.is(imageType)) {
    return res.status(400).json({ error: 'Upload a JPEG, PNG or WebP image.' });
  }

  try {
    const profile = await userService.setAvatar(req.session.user._id, req.body, imageType);
    return res.json({ user: profile });
  } catch (err) {
    return handleUserError(res, err);
  }
}

async function removeAvatar(req, res) {
  try {
    const profile = await userService.removeAvatar(req.session.user._id);
    return res.json({ user: profile });
  } catch (err) {
    return handleUserError(res, err);
  }
}

async function getAvatar(req, res) {
  let avatar = null;
  if (mongoose.isValidObjectId(req.params.id)) {
    try {
      avatar = await userService.findAvatar(req.params.id);
    } catch (err) {
      return handleUserError(res, err);
    }
  }
  if (!avatar) return res.status(404).json({ error: 'No photo.' });

  res.set({
    'Content-Type': avatar.contentType,
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'none'; sandbox",
    'Content-Disposition': `inline; filename="avatar.${extensionOf(avatar.contentType)}"`,
    'Cache-Control': 'private, max-age=86400',
  });
  return res.send(avatar.data);
}

// DELETE /me  deletes the logged-in user's account, then logs them out
async function deleteUser(req, res) {
  const { password } = req.body ?? {};
  try {
    await userService.deleteUserById(req.session.user._id, password);
  } catch (err) {
    return handleUserError(res, err);
  }

  destroySession(req, res);
}

async function logout(req, res) {
  if (!req.session) return res.status(204).end();
  destroySession(req, res);
}

async function destroySession(req, res) {
  try {
    await endSession(req, res);
  } catch {
    return res.status(500).json({ error: 'Failed to log out' });
  }
  return res.status(204).end();
}

module.exports = {
  createUser,
  login,
  me,
  updateUser,
  changePassword,
  uploadAvatar,
  removeAvatar,
  getAvatar,
  deleteUser,
  logout,
};
