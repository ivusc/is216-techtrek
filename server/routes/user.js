const express = require('express');
const userController = require('../controllers/user-controller');
const router = express.Router();

router.post('/register', userController.createUser);
router.post('/login', userController.login);
router.get('/me', userController.me);
router.patch('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;
