const { IllegalArguementError, DatabaseError, WrongPasswordError } = require('./user-service-errors');
const User = require('../../models/User');
const Application = require('../../models/Application');
const InterviewAttempt = require('../../models/interviewAttempt');
const Team = require('../../models/Team');
const TeamRequest = require('../../models/TeamRequest');
const Notification = require('../../models/Notification');
const bycrpt = require('bcryptjs');
const { MAX_SKILLS, cleanSkills } = require('../skills');

const SALT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;
const OPTIONAL_FIELDS = ['year', 'course', 'about', 'linkedinUrl', 'githubUrl', 'telegram'];

/**
 *
 * @param {String} userName
 * @param {String} password
 * @throws {DatabaseError, IllegalArguementError}
 * @returns {Promise<Document>} the new user
 */
async function createUser(userName, password) {
  const cleanedUserName = validateUserName(userName);
  validatePassword(password);
  await checkUserNameIsFree(cleanedUserName);

  const encryptedPassword = await bycrpt.hash(password, SALT_ROUNDS);
  try {
    const user = await User.create({
      userName: cleanedUserName,
      password: encryptedPassword,
      displayName: displayNameFromEmail(cleanedUserName),
      onboarded: false,
    });
    return user;
  } catch (err) {
    if (err.name === 'ValidationError') throw new IllegalArguementError(err.message);
    throw new DatabaseError('Database could not create new user.');
  }
}

function displayNameFromEmail(userName) {
  return userName
    .split('@')[0]
    .split(/[._-]+/)
    .filter((part) => part !== '')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
    .slice(0, 60);
}

/**
 * @param {String} userName
 * @throws {IllegalArguementError}
 * @returns {String} trimmed username
 */
function validateUserName(userName) {
  const cleanedUserName = String(userName ?? '').trim();
  if (cleanedUserName.length == 0) throw new IllegalArguementError('Username cannot be blank!');
  return cleanedUserName;
}

/**
 * The password is checked here because the database only ever sees the hash,
 * so the length rules in the User model cannot check the real password.
 * @param {String} password
 * @throws {IllegalArguementError}
 */
function validatePassword(password) {
  const text = String(password ?? '');
  if (text.trim().length == 0) throw new IllegalArguementError('Password cannot be blank or only contain spaces!');
  if (text.length < MIN_PASSWORD_LENGTH) {
    throw new IllegalArguementError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long!`);
  }
}

/**
 * @param {String} userName
 * @throws {IllegalArguementError, DatabaseError}
 */
async function checkUserNameIsFree(userName) {
  const result = await findUserByUserName(userName);
  if (result != null) throw new IllegalArguementError('Username already exists.');
}

/**
 *
 * @param {String} userName
 * @throws {DatabaseError}
 * @returns {Document | null} Document of user if found, else null
 */
async function findUserByUserName(userName) {
  try {
    const user = await User.findOne({ userName: userName });
    return user;
  } catch (err) {
    throw new DatabaseError('Database could not find user by username.');
  }
}

/**
 *
 * @param {Schema.Types.ObjectId} userId
 * @throws {DatabaseError}
 * @returns {Document | null} Document of user if found, else null
 */
async function findUserByUserId(userId) {
  try {
    const user = await User.findById(userId);
    return user;
  } catch (err) {
    throw new DatabaseError('Database could not find user by userId.');
  }
}

/**
 * Only the fields that were sent are changed.
 * @param {Schema.Types.ObjectId} userId
 * @throws {IllegalArguementError, DatabaseError}
 * @returns {Promise<Document | null>} the updated user, or null if not found
 */
async function updateUser(userId, changes) {
  if ('skills' in changes && !isSkillList(changes.skills)) {
    throw new IllegalArguementError(`Skills must be a list of at most ${MAX_SKILLS}.`);
  }

  const set = {};
  const unset = {};
  for (const [field, value] of Object.entries(changes)) {
    if (OPTIONAL_FIELDS.includes(field) && isBlank(value)) unset[field] = 1;
    else if (field === 'skills') set[field] = cleanSkills(value);
    // "@kellie_j" and "kellie_j" are the same Telegram username
    else if (field === 'telegram') set[field] = String(value).trim().replace(/^@/, '');
    else set[field] = value;
  }

  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: set, $unset: unset },
      { returnDocument: 'after', runValidators: true },
    );
    return user;
  } catch (err) {
    if (err.name === 'ValidationError' || err.name === 'CastError') {
      throw new IllegalArguementError(err.message);
    }
    throw new DatabaseError('Database could not update user.');
  }
}

function isSkillList(skills) {
  return Array.isArray(skills) && skills.length <= MAX_SKILLS;
}

function isBlank(value) {
  return value == null || String(value).trim() === '';
}

async function checkPassword(user, password) {
  const isCorrect = user != null && (await bycrpt.compare(String(password ?? ''), user.password));
  if (!isCorrect) throw new WrongPasswordError('Wrong password.');
}

async function changePassword(userId, currentPassword, newPassword) {
  const user = await findUserByUserId(userId);
  await checkPassword(user, currentPassword);
  validatePassword(newPassword);
  user.password = await bycrpt.hash(newPassword, SALT_ROUNDS);
  try {
    await user.save();
  } catch (err) {
    throw new DatabaseError('Database could not change the password.');
  }
}

async function setAvatar(userId, data, contentType) {
  try {
    return await User.findByIdAndUpdate(
      userId,
      { avatar: { data, contentType, updatedAt: new Date() } },
      { returnDocument: 'after' },
    );
  } catch (err) {
    throw new DatabaseError('Database could not save the photo.');
  }
}

async function removeAvatar(userId) {
  try {
    return await User.findByIdAndUpdate(
      userId,
      { $unset: { avatar: 1 } },
      { returnDocument: 'after' },
    );
  } catch (err) {
    throw new DatabaseError('Database could not remove the photo.');
  }
}

async function findAvatar(userId) {
  try {
    const user = await User.findById(userId).select('+avatar.data +avatar.contentType');
    return user?.avatar?.data ? user.avatar : null;
  } catch (err) {
    throw new DatabaseError('Database could not find the photo.');
  }
}

// what other students see on someone's profile page: everything on their profile and their SMU
// email, but never their Telegram (that stays inside their teams)
const PUBLIC_PROFILE_FIELDS =
  'userName displayName faculty year course about skills openToTeams githubUrl linkedinUrl avatar.updatedAt';

async function findPublicProfile(userId) {
  try {
    return await User.findById(userId).select(PUBLIC_PROFILE_FIELDS);
  } catch (err) {
    throw new DatabaseError('Database could not find the profile.');
  }
}

/**
 * Deletes the user with their applications and interview attempts.
 * @param {Schema.Types.ObjectId} userId
 * @throws {DatabaseError}
 * @returns {void}
 */
async function deleteUserById(userId, password) {
  const user = await findUserByUserId(userId);
  await checkPassword(user, password);

  try {
    await TeamRequest.deleteMany({ userId: userId });
    const ledTeamIds = await Team.find({ leaderId: userId }).distinct('_id');
    await TeamRequest.deleteMany({ teamId: { $in: ledTeamIds } });
    await Team.deleteMany({ _id: { $in: ledTeamIds } });
    const joinedTeams = await Team.find({ 'members.userId': userId });
    for (const team of joinedTeams) {
      team.members = team.members.filter((member) => String(member.userId) !== String(userId));
      team.syncStatus();
      await team.save();
    }
    // remove the user's own data too, so nothing is left pointing at a deleted user
    await Application.deleteMany({ userId: userId });
    await InterviewAttempt.deleteMany({ userId: userId });
    await Notification.deleteMany({ userId: userId });
    await User.findByIdAndDelete(userId);
  } catch (err) {
    throw new DatabaseError('Database could not delete user.');
  }
}

module.exports = {
  createUser,
  findUserByUserName,
  findUserByUserId,
  updateUser,
  changePassword,
  setAvatar,
  removeAvatar,
  findAvatar,
  findPublicProfile,
  deleteUserById,
};
