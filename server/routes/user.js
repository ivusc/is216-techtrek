const express = require('express');
const userController = require('../controllers/user-controller');
const { requireLogin } = require('../middleware/auth');
const router = express.Router();

router.post('/register', userController.createUser);
router.post('/login', userController.login);
router.post('/logout', userController.logout);
router.get('/me', userController.me);
router.patch('/me', requireLogin, userController.updateUser);
router.patch('/me/password', requireLogin, userController.changePassword);
router.delete('/me', requireLogin, userController.deleteUser);

module.exports = router;
