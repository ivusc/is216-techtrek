const Notification = require('../models/Notification');
const teamRequestService = require('../service/team-request-service');
const deadlineReminders = require('../service/deadline-reminders');
const opportunityAlerts = require('../service/opportunity-alerts');

const MAX_NOTIFICATIONS = 30;

function formatNotification(notification) {
  return {
    _id: notification._id,
    type: notification.type,
    actorName: notification.actorName ?? null,
    teamId: notification.teamId ?? null,
    teamName: notification.teamName ?? null,
    role: notification.role ?? null,
    about: notification.about ?? null,
    applicationId: notification.applicationId ?? null,
    title: notification.title ?? null,
    organisation: notification.organisation ?? null,
    deadline: notification.deadline ?? null,
    daysLeft: notification.daysLeft ?? null,
    jobCount: notification.jobCount ?? null,
    hackathonCount: notification.hackathonCount ?? null,
    skills: notification.skills ?? null,
    read: notification.read,
    createdAt: notification.createdAt,
  };
}

// GET /notifications - my latest notifications and how many I have not read
async function getNotifications(req, res) {
  const userId = req.session.user._id;
  try {
    // close requests to teams whose closing date has passed, so their notifications are in this list
    await teamRequestService.closeExpired();
    // add reminders for my tracked deadlines that are 3 days or 1 day away
    await deadlineReminders.sendDeadlineReminders(userId);
    // and tell me about new listings that mention my skills (checked every few hours at most)
    await opportunityAlerts.sendMatchAlerts(userId);
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ userId }).sort('-createdAt').limit(MAX_NOTIFICATIONS),
      Notification.countDocuments({ userId, read: false }),
    ]);
    res.json({ notifications: notifications.map(formatNotification), unreadCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
}

// PATCH /notifications/read - mark all of mine as read
async function markAllRead(req, res) {
  const userId = req.session.user._id;
  try {
    await Notification.updateMany({ userId, read: false }, { read: true });
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update notifications' });
  }
}

// PATCH /notifications/:id/read - mark one as read
async function markRead(req, res) {
  const userId = req.session.user._id;
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId },
      { read: true },
      { returnDocument: 'after' },
    );
    if (!notification) return res.status(404).json({ error: 'Notification not found' });
    res.json(formatNotification(notification));
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid ID' });
    console.error(err);
    res.status(500).json({ error: 'Failed to update notification' });
  }
}

module.exports = { getNotifications, markAllRead, markRead };
