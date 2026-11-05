const Application = require('../models/Application');
const Notification = require('../models/Notification');

const DAY = 24 * 60 * 60 * 1000;

// applications that are finished don't need reminders
const FINISHED_STATUSES = ['rejected', 'results'];

// whole days until the deadline, counted the same way as the client's getDaysLeft
function daysUntil(deadline, now) {
  return Math.ceil((new Date(deadline) - now) / DAY);
}

// which reminder is due: '3-day' with 2 or 3 days left, '1-day' with 1 day left or on the day,
// nothing otherwise (further away, or already past)
function reminderFor(deadline, now) {
  if (!deadline || new Date(deadline) <= now) return null;
  const daysLeft = daysUntil(deadline, now);
  if (daysLeft <= 1) return '1-day';
  if (daysLeft <= 3) return '3-day';
  return null;
}

// Adds a "due soon" notification for each of the user's tracked applications whose deadline is
// 3 days or 1 day away. It runs whenever the user loads their notifications (there is no
// background job on the server), so each reminder is saved at most once per application and
// deadline: running it again changes nothing. If the deadline moves, the new date gets its own reminders.
// A failed reminder must never break loading notifications, so errors are logged and swallowed.
async function sendDeadlineReminders(userId, now = new Date()) {
  try {
    const applications = await Application.find({ userId, status: { $nin: FINISHED_STATUSES } })
      .select('deadline opportunityId')
      .populate('opportunityId', 'title organisation deadline');

    for (const application of applications) {
      const opportunity = application.opportunityId;
      // the deadline set on the application, else the listing's own deadline (same as the tracker)
      const deadline = application.deadline ?? opportunity?.deadline ?? null;
      const reminder = reminderFor(deadline, now);
      if (!reminder) continue;

      try {
        // upsert: only creates the reminder if this exact one does not exist yet
        await Notification.updateOne(
          { userId, type: 'deadline-reminder', applicationId: application._id, reminder, deadline },
          {
            $setOnInsert: {
              title: opportunity?.title,
              organisation: opportunity?.organisation,
              daysLeft: daysUntil(deadline, now),
            },
          },
          { upsert: true },
        );
      } catch (err) {
        // two requests at once can race to create the same reminder; the unique index stops the second
        if (err.code !== 11000) throw err;
      }
    }
  } catch (err) {
    console.error('Could not send deadline reminders', err);
  }
}

module.exports = { sendDeadlineReminders, reminderFor };
