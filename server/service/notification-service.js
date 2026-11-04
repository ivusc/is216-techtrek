const Notification = require('../models/Notification');
const User = require('../models/User');

function nameOf(user) {
  return user?.displayName || String(user?.userName ?? '').split('@')[0] || 'Someone';
}

// adds a notification. A failed notification must never break the team action that caused it,
// so errors are logged and swallowed.
async function notify({ userId, type, actor, actorId, team }) {
  try {
    if (!userId) return;
    // nobody gets told about something they did themselves
    const doerId = actor?._id ?? actorId;
    if (doerId && String(doerId) === String(userId)) return;

    let who = actor;
    if (!who && actorId) who = await User.findById(actorId).select('displayName userName');

    await Notification.create({
      userId,
      type,
      actorId: who?._id ?? actorId,
      actorName: who ? nameOf(who) : undefined,
      teamId: team?._id,
      teamName: team?.name,
    });
  } catch (err) {
    console.error('Could not save notification', err);
  }
}

// removes notifications that no longer make sense (e.g. a request that was taken back)
async function remove(filter) {
  try {
    await Notification.deleteMany(filter);
  } catch (err) {
    console.error('Could not remove notifications', err);
  }
}

module.exports = { notify, remove };
