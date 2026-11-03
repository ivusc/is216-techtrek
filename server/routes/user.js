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
router.put(
  '/me/avatar',
  requireLogin,
  express.raw({ type: 'image/*', limit: '100kb' }),
  userController.uploadAvatar,
);
router.delete('/me/avatar', requireLogin, userController.removeAvatar);
router.delete('/me', requireLogin, userController.deleteUser);

router.use((err, req, res, next) => {
  if (err.type !== 'entity.too.large') return next(err);
  return res.status(413).json({ error: 'Photo must be under 100 KB.' });
});

module.exports = router;
