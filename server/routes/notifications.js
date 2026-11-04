const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification-controller');

router.get('/', notificationController.getNotifications);
router.patch('/read', notificationController.markAllRead);
router.patch('/:id/read', notificationController.markRead);

module.exports = router;
