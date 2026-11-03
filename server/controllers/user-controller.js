const userService = require('../service/user/user-service');
const { DatabaseError, IllegalArguementError } = require('../service/user/user-service-errors');
const bycrpt = require('bcryptjs');
const { regenerateSession, endSession } = require('../middleware/session');

// What we keep about the user in the session (never the password)
function toSessionUser(profile) {
  return { _id: profile._id };
}

function handleUserError(res, err) {
  if (err instanceof IllegalArguementError) {
    return res.status(400).json({ error: err.message });
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
    await regenerateSession(req);
    req.session.user = toSessionUser(profile);
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

  await regenerateSession(req);
  req.session.user = toSessionUser(profile);
  return res.status(200).json({ user: profile });
}

async function me(req, res) {
  if (!req.session?.user) {
    return res.json({ isAuthenticated: false, user: null });
  }

  let profile;
  try {
    profile = await userService.findUserByUserId(req.session.user._id);
  } catch (err) {
    return handleUserError(res, err);
  }

  if (profile == null) {
    await endSession(req, res);
    return res.json({ isAuthenticated: false, user: null });
  }

  return res.json({ isAuthenticated: true, user: profile });
}

// PATCH /me  body: any of newUserName, password, skills, linkedinUrl, githubUrl
async function updateUser(req, res) {
  const { newUserName, password, skills, linkedinUrl, githubUrl } = req.body ?? {};
  const userId = req.session.user._id;

  try {
    const profile = await userService.updateUser(userId, { newUserName, password, skills, linkedinUrl, githubUrl });
    if (!profile) return res.status(404).json({ error: 'User not found.' });

    return res.status(200).json({ user: profile });
  } catch (err) {
    return handleUserError(res, err);
  }
}

// DELETE /me  deletes the logged-in user's account, then logs them out
async function deleteUser(req, res) {
  try {
    await userService.deleteUserById(req.session.user._id);
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
  deleteUser,
  logout,
};
