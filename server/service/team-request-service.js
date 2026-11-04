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

// teams past their closing date that still have pending requests or invites
async function closeExpired(now = new Date()) {
  const waitingTeamIds = await TeamRequest.find({ status: 'pending' }).distinct('teamId');
  if (waitingTeamIds.length === 0) return 0;
  const expired = await Team.find({ _id: { $in: waitingTeamIds }, closesAt: { $lt: now } });
  let closed = 0;
  for (const team of expired) closed += await closePending(team, 'closed');
  return closed;
}

module.exports = { closePending, closeIfFull, closeExpired };
