const Team = require('../models/Team');
const TeamRequest = require('../models/TeamRequest');
const notificationService = require('./notification-service');

// Pending requests and invites that can no longer be answered are closed by TechTrek, so nobody waits
// on them forever. The person who asked (or was invited) gets a notification saying why.
//   reason 'full'   - the team has no open spots left
//   reason 'closed' - the team's closing date has passed
async function closePending(team, reason) {
  const pending = await TeamRequest.find({ teamId: team._id, status: 'pending' });
  if (pending.length === 0) return 0;

  await TeamRequest.updateMany(
    { _id: { $in: pending.map((request) => request._id) }, status: 'pending' },
    { status: 'declined', closedReason: reason },
  );
  await Promise.all(
    pending.map((request) =>
      notificationService.notify({
        userId: request.userId,
        type: reason === 'full' ? 'team-full' : 'team-closed',
        team,
        about: request.kind === 'invite' ? 'invite' : 'request',
      }),
    ),
  );
  return pending.length;
}

// after someone joins (or the team shrinks): no spots left means the rest can't get in
async function closeIfFull(team) {
  if (team.slotsOpen > 0) return 0;
  return closePending(team, 'full');
}

// teams past their closing date that still have pending requests or invites.
// It runs when people open their requests or notifications; to save trips to the database it only
// really checks once every 30 seconds (tests pass force: true).
const EXPIRY_CHECK_EVERY = 30 * 1000;
let lastExpiryCheck = 0;

async function closeExpired(now = new Date(), { force = false } = {}) {
  if (!force && now.getTime() - lastExpiryCheck < EXPIRY_CHECK_EVERY) return 0;
  lastExpiryCheck = now.getTime();
  const waitingTeamIds = await TeamRequest.find({ status: 'pending' }).distinct('teamId');
  if (waitingTeamIds.length === 0) return 0;
  const expired = await Team.find({ _id: { $in: waitingTeamIds }, closesAt: { $lt: now } });
  const counts = await Promise.all(expired.map((team) => closePending(team, 'closed')));
  return counts.reduce((sum, count) => sum + count, 0);
}

// tests: forget when the last check ran
function resetExpiryCheck() {
  lastExpiryCheck = 0;
}

module.exports = { closePending, closeIfFull, closeExpired, resetExpiryCheck };
