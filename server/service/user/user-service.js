const { IllegalArguementError, DatabaseError } = require('./user-service-errors');
const User = require('../../models/User');
const Application = require('../../models/Application');
const InterviewAttempt = require('../../models/interviewAttempt');
const bycrpt = require('bcryptjs');

const SALT_ROUNDS = 12;
const MIN_PASSWORD_LENGTH = 8;

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
    });
    return user;
  } catch (err) {
    if (err.name === 'ValidationError') throw new IllegalArguementError(err.message);
    throw new DatabaseError('Database could not create new user.');
  }
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

// trimmed, no blanks or duplicates (ignoring case), at most 12 - same rules as the Teams page
function cleanSkills(skills) {
  if (!Array.isArray(skills)) return [];
  const cleaned = [];
  for (const skill of skills) {
    const text = String(skill).trim().slice(0, 40);
    const alreadyThere = cleaned.some((item) => item.toLowerCase() === text.toLowerCase());
    if (text !== '' && !alreadyThere) cleaned.push(text);
  }
  return cleaned.slice(0, 12);
}

// { "Vue.js": "Advanced" } from the client -> [{ skill, level }] for the database,
// keeping only Beginner / Intermediate / Advanced
function cleanSkillLevels(levels) {
  const cleaned = [];
  for (const [skill, level] of Object.entries(levels ?? {})) {
    if (['Beginner', 'Intermediate', 'Advanced'].includes(level)) {
      cleaned.push({ skill: String(skill).trim().slice(0, 40), level });
    }
  }
  return cleaned;
}

// profile links: blank removes the link, anything else has to be a web address
function cleanLink(link, siteName) {
  const text = String(link ?? '').trim();
  if (text !== '' && !/^https?:\/\/\S+$/i.test(text)) {
    throw new IllegalArguementError(`Your ${siteName} link should start with https://`);
  }
  return text;
}

/**
 * Only the fields that were sent are changed.
 * @param {Schema.Types.ObjectId} userId
 * @param {{newUserName?: String, password?: String, skills?: [String], linkedinUrl?: String, githubUrl?: String, displayName?: String, faculty?: String, onboarded?: Boolean}} changes
 * @throws {IllegalArguementError, DatabaseError}
 * @returns {Promise<Document | null>} the updated user, or null if not found
 */
async function updateUser(userId, changes) {
  const update = {};

  if (changes.newUserName !== undefined) {
    const cleanedUserName = validateUserName(changes.newUserName).toLowerCase();
    const existing = await findUserByUserName(cleanedUserName);
    if (existing != null && String(existing._id) !== String(userId)) {
      throw new IllegalArguementError('Username already exists.');
    }
    update.userName = cleanedUserName;
  }

  if (changes.password !== undefined) {
    validatePassword(changes.password);
    update.password = await bycrpt.hash(changes.password, SALT_ROUNDS);
  }

  if (changes.skills !== undefined) update.skills = cleanSkills(changes.skills);
  if (changes.linkedinUrl !== undefined) update.linkedinUrl = cleanLink(changes.linkedinUrl, 'LinkedIn');
  if (changes.githubUrl !== undefined) update.githubUrl = cleanLink(changes.githubUrl, 'GitHub');

  if (changes.displayName !== undefined) {
    const name = String(changes.displayName).trim();
    if (name.length == 0) throw new IllegalArguementError('Please enter your name.');
    update.displayName = name;
  }
  if (changes.faculty !== undefined) update.faculty = changes.faculty;
  if (changes.onboarded !== undefined) update.onboarded = Boolean(changes.onboarded);

  // profile page fields (the User model checks the allowed values)
  if (changes.year !== undefined) update.year = changes.year === null || changes.year === '' ? undefined : Number(changes.year);
  if (changes.bio !== undefined) update.bio = String(changes.bio).trim();
  if (changes.skillLevels !== undefined) update.skillLevels = cleanSkillLevels(changes.skillLevels);
  if (changes.careerInterests !== undefined) {
    const interests = changes.careerInterests ?? {};
    update.careerInterests = {
      roles: cleanSkills(interests.roles),
      opportunityTypes: Array.isArray(interests.opportunityTypes) ? interests.opportunityTypes : [],
      workType: interests.workType || undefined,
      availableFrom: interests.availableFrom || undefined,
    };
  }
  if (changes.openToTeams !== undefined) update.openToTeams = Boolean(changes.openToTeams);

  try {
    const user = await User.findByIdAndUpdate(userId, update, { returnDocument: 'after', runValidators: true });
    return user;
  } catch (err) {
    if (err.name === 'ValidationError') throw new IllegalArguementError(err.message);
    throw new DatabaseError('Database could not update user.');
  }
}

/**
 * Deletes the user with their applications and interview attempts.
 * @param {Schema.Types.ObjectId} userId
 * @throws {DatabaseError}
 * @returns {void}
 */
async function deleteUserById(userId) {
  try {
    // remove the user's own data too, so nothing is left pointing at a deleted user
    await Application.deleteMany({ userId: userId });
    await InterviewAttempt.deleteMany({ userId: userId });
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
  deleteUserById,
};
