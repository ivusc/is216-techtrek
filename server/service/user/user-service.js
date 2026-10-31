const { Document } = require('mongoose');
const { IllegalArguementError, DatabaseError } = require('./user-service-errors');
const User = require('../../models/User');
const bycrpt = require('bcryptjs');

const SALT_ROUNDS = 12;

/**
 *
 * @param {String} userId
 * @param {String} password
 * @throws {DatabaseError, IllegalArguementError}
 * @returns {void}
 */
async function createUser(userName,password) {
  const {cleanedUserName, cleanedPassword}= await validateUserNameAndPassword(userName, password);


  const encryptedPassword = await bycrpt.hash(password, SALT_ROUNDS);
  try {
    await User.create({
      userName: cleanedUserName,
      password: encryptedPassword
    })
  } catch (err) {
    throw new DatabaseError("Database could not create new user.")
  }
}

/**
 *
 * @param {*} userName
 * @param {*} password
 * @throws {IllegalArguementError, DataBaseError}
 * @returns {Promise<{cleanedUserName: String, cleanedPassword: String}>} an object containing trimmed username and password
 */
async function validateUserNameAndPassword(userName, password) {
  const cleanedUserName = userName.trim();
  if (cleanedUserName.length == 0 ) throw new IllegalArguementError("Username cannot be blank!");

  const cleanedPassword = password.trim();
  if (cleanedPassword.length == 0) throw new IllegalArguementError("Password cannot be blank or only contain spaces!")

  const result = await findUserByUserName(cleanedUserName);
  if (result != null) throw new IllegalArguementError("Username already exists.");


  return {cleanedUserName, cleanedPassword};
}

/**
 *
 * @param {String} userName
 * @throws {DatabaseError}
 * @returns {Document | null} Document of user if found, else null
 */
async function findUserByUserName(userName) {
  try {
    const user = await User.findOne({userName: userName});
    return user;
  } catch (err) {
    throw new DatabaseError("Database could not find user by username.");
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
    throw new DatabaseError("Database could not find user by userId.");
  }
}

/**
 * @param {String} oldUserName
 * @param {String} newUserName
 * @param {String} password
 * @param {[String]} skill
 * @param {String} linkedinUrl
 * @param {String} githubUrl
 * @throws {IllegalArguementError, DataBaseError}
 * @returns {void}
 */
async function updateUser(oldUserName, newUserName, password, skills=[], linkedinUrl=undefined, githubUrl=undefined) {
  let cleanedUserName;
  let cleanedPassword;
  try {
    cleanedUserName, cleanedPassword = validateUserNameAndPassword(newUserName, password)
  } catch (err) {
    throw err;
  }

  const encryptedPassword = await bycrpt.hash(cleanedPassword, SALT_ROUNDS);
  try {
    User.updateOne(
      {userName : oldUserName},
      {
        userName : newUserName,
        password : encryptedPassword,
        skills : skills,
        linkedinUrl : linkedinUrl,
        githubUrl : githubUrl
      }
    )
  } catch (err) {
    throw new DatabaseError("Database could not update user.")
  }
}

/**
 *
 * @param {String} userName
 * @throws {DatabaseError}
 * @returns {void}
 */
async function deleteUserByUserName(userName){
  try {
    User.deleteOne({userName : userName});
  } catch (err) {
    throw new DatabaseError("Database could not delete user.")
  }
}

module.exports = {
  createUser,
  findUserByUserName,
  findUserByUserId,
  updateUser,
  deleteUserByUserName
}
