const mongoose = require('mongoose');
const Team = require('../models/Team');
const TeamRequest = require('../models/TeamRequest');
const User = require('../models/User');
const Opportunity = require('../models/Opportunity');
const { cleanSkills } = require('../service/skills');
const opportunityService = require('../service/opportunity-service');
const applicationService = require('../service/application-service');

const PROFILE_FIELDS = 'displayName faculty year course skills githubUrl linkedinUrl avatar.updatedAt';
const ANSWER_STATUSES = ['accepted', 'declined'];
const EVENT_FIELDS = ['opportunity', 'opportunityId', 'eventName', 'eventLocation', 'closesAt'];
const MAX_MATCHES = 20;

// --- Helper Functions ---
function matchedTeamSkills(userSkills = [], teamSkills = []) {
  const mine = userSkills.map((skill) => skill.toLowerCase());
  return teamSkills.filter((skill) => mine.includes(skill.toLowerCase()));
}

function handleError(res, err, fallback) {
  if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid ID' });
  if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
  if (err.code === 11000) {
    return res.status(409).json({ error: 'You have already asked to join this team' });
  }
  console.error(fallback, err.message);
  res.status(500).json({ error: fallback });
}

function hasValidSlots(teamSize, openSlots, memberCount, fewestOpen) {
  return (
    Number.isInteger(teamSize) &&
    Number.isInteger(openSlots) &&
    openSlots >= fewestOpen &&
    openSlots + memberCount <= teamSize
  );
}

function isLeader(team, userId) {
  return String(team.leaderId?._id ?? team.leaderId) === String(userId);
}

function isMember(team, userId) {
  return team.members.some(
    (member) => String(member.userId?._id ?? member.userId) === String(userId),
  );
}

function isTakingRequests(team) {
  return (
    team.status === 'open' && team.slotsOpen > 0 && (!team.closesAt || team.closesAt >= new Date())
  );
}

function linkedEvent(opportunity, closesAt) {
  return {
    event: {
      opportunityId: opportunity._id,
      name: opportunity.title,
      location: opportunity.location,
    },
    closesAt: closesAt || opportunity.deadline,
  };
}

async function resolveEvent(data) {
  if (data.opportunity) {
    return linkedEvent(await opportunityService.findOrCreateOpportunity(data.opportunity), data.closesAt);
  }
  if (!data.opportunityId) {
    return {
      event: { name: data.eventName, location: data.eventLocation },
      closesAt: data.closesAt,
    };
  }
  const opportunity = await Opportunity.findById(data.opportunityId);
  if (!opportunity) return null;
  return linkedEvent(opportunity, data.closesAt);
}

function populateTeam(query) {
  return query
    .populate({ path: 'leaderId', select: PROFILE_FIELDS })
    .populate({ path: 'members.userId', select: PROFILE_FIELDS });
}

function formatTeam(team, userId, requestStatus = null) {
  return {
    _id: team._id,
    name: team.name,
    event: team.event,
    closesAt: team.closesAt,
    teamSize: team.teamSize,
    externalMembers: team.externalMembers,
    slotsOpen: team.slotsOpen,
    pitch: team.pitch,
    skills: team.skills,
    autoAccept: team.autoAccept,
    status: team.status,
    leader: team.leaderId,
    members: (team.members || [])
      .filter((member) => member.userId)
      .map((member) => ({ user: member.userId, role: member.role })),
    isLeader: userId ? isLeader(team, userId) : false,
    requestStatus,
  };
}

function formatRequest(request) {
  const user = request.userId;
  const shown = request.shareProfile
    ? user
    : {
        _id: user?._id,
        displayName: user?.displayName,
        year: user?.year,
        course: user?.course,
        avatar: user?.avatar,
        skills: [],
      };

  return {
    _id: request._id,
    status: request.status,
    role: request.role,
    message: request.message,
    shareProfile: request.shareProfile,
    createdAt: request.createdAt,
    user: shown,
    team: request.teamId,
  };
}

// --- Controller Actions ---

async function getTeams(req, res) {
  const userId = req.session.user._id;

  try {
    const teams = await populateTeam(
      Team.find({
        status: { $in: ['open', 'closed'] },
        leaderId: { $ne: userId },
        'members.userId': { $ne: userId },
        $or: [{ closesAt: {$gte: new Date() } }, { closesAt: null }],
      }).sort('closesAt')
    );

    const requests = await TeamRequest.find({ userId, kind: { $ne: 'invite' }, teamId: { $in: teams.map((t) => t._id) } });
    // my request to each team, so the page can show "Request sent" and undo it
    const requestByTeam = {};
    for (const r of requests) requestByTeam[String(r.teamId)] = r;

    const result = teams
      .filter((t) => t.leaderId)
      .map((t) => {
        const request = requestByTeam[String(t._id)];
        return { ...formatTeam(t, userId, request?.status), requestId: request?._id ?? null };
      });

    res.json(result);
  } catch (err) {
    handleError(res, err, 'Failed to fetch teams');
  }
}

async function getMyTeams(req, res) {
  const userId = req.session.user._id;

  try {
    const teams = await populateTeam(
      Team.find({ $or: [{ leaderId: userId }, { 'members.userId': userId }] }).sort('-updatedAt')
    );
    const result = teams.filter((t) => t.leaderId).map((t) => formatTeam(t, userId));
    res.json(result);
  } catch (err) {
    handleError(res, err, 'Failed to fetch your teams');
  }
}

async function getEvents(req, res) {
  try {
    const events = await Opportunity.find({
      type: { $in: ['hackathon', 'competition'] },
      $or: [{ deadline: {$gte: new Date() } }, { deadline: null }],
    }).select('title organisation location deadline').sort('deadline').lean();

    res.json(events);
  } catch (err) {
    handleError(res, err, 'Failed to fetch events');
  }
}

async function createTeam(req, res) {
  const userId = req.session.user._id;
  const data = req.body ?? {};
  if (data.opportunityId && !mongoose.isValidObjectId(data.opportunityId)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }

  try {
    const resolved = await resolveEvent(data);
    if (!resolved) return res.status(404).json({ error: 'Event not found' });
    if (!resolved.event.name || String(resolved.event.name).trim() === '') {
      return res.status(400).json({ error: 'Pick a hackathon or type in the event name.' });
    }

    const teamSize = Number(data.teamSize);
    const openSlots = Number(data.openSlots);
    if (!hasValidSlots(teamSize, openSlots, 1, 1)) {
      return res.status(400).json({ error: 'Invalid slots configuration' });
    }

    const team = await Team.create({
      name: data.name,
      leaderId: userId,
      event: resolved.event,
      closesAt: resolved.closesAt,
      teamSize,
      externalMembers: teamSize - openSlots - 1,
      members: [{ userId, role: 'Team lead' }],
      pitch: data.pitch,
      skills: cleanSkills(data.skills),
      autoAccept: Boolean(data.autoAccept),
      status: data.status === 'draft' ? 'draft' : 'open',
    });

    // the leader's tracker card for this hackathon moves to "Team formed"
    if (team.status !== 'draft') {
      await applicationService.markTeamFormed(userId, resolved.event.opportunityId);
    }

    const populated = await populateTeam(Team.findById(team._id));
    res.status(201).json(formatTeam(populated, userId));
  } catch (err) {
    handleError(res, err, 'Failed to create team');
  }
}

async function updateTeam(req, res) {
  const { id: teamId } = req.params;
  const userId = req.session.user._id;
  const data = req.body ?? {};
  if (data.opportunityId && !mongoose.isValidObjectId(data.opportunityId)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }

  try {
    const team = await populateTeam(Team.findById(teamId));
    if (!team) return res.status(404).json({ error: 'Team not found' });
    if (!isLeader(team, userId)) return res.status(403).json({ error: 'Only leader can edit' });

    if (data.name !== undefined) team.name = data.name;
    if (data.pitch !== undefined) team.pitch = data.pitch;
    if (data.skills !== undefined) team.skills = cleanSkills(data.skills);
    if (data.autoAccept !== undefined) team.autoAccept = Boolean(data.autoAccept);

    if (data.teamSize !== undefined || data.openSlots !== undefined) {
      const teamSize = Number(data.teamSize ?? team.teamSize);
      const openSlots = Number(data.openSlots ?? team.slotsOpen);
      if (!hasValidSlots(teamSize, openSlots, team.members.length, 0)) {
        return res.status(400).json({ error: 'Invalid slots configuration' });
      }
      team.teamSize = teamSize;
      team.externalMembers = teamSize - openSlots - team.members.length;
    }

    if (EVENT_FIELDS.some((field) => data[field] !== undefined)) {
      const current = {
        opportunityId: team.event.opportunityId,
        eventName: team.event.name,
        eventLocation: team.event.location,
        closesAt: data.opportunityId || data.opportunity ? undefined : team.closesAt,
      };
      const resolved = await resolveEvent({ ...current, ...data });
      if (!resolved) return res.status(404).json({ error: 'Event not found' });
      team.event = resolved.event;
      team.closesAt = resolved.closesAt;
    }
    const publishing = data.status === 'open' && team.status === 'draft';
    if (publishing) {
      if (team.slotsOpen === 0) {
        return res.status(400).json({ error: 'Invalid slots configuration' });
      }
      team.status = 'open';
    }

    team.syncStatus();
    await team.save();
    if (publishing) {
      await applicationService.markTeamFormed(userId, team.event.opportunityId);
    }

    const updated = await populateTeam(Team.findById(team._id));
    res.json(formatTeam(updated, userId));
  } catch (err) {
    handleError(res, err, 'Failed to update team');
  }
}

async function deleteTeam(req, res) {
  const { id: teamId } = req.params;
  const userId = req.session.user._id;

  try {
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ error: 'Team not found' });
    if (!isLeader(team, userId)) return res.status(403).json({ error: 'Only leader can delete' });

    await TeamRequest.deleteMany({ teamId });
    await Team.findByIdAndDelete(teamId);
    res.status(204).end();
  } catch (err) {
    handleError(res, err, 'Failed to delete team');
  }
}

async function createRequest(req, res) {
  const { id: teamId } = req.params;
  const userId = req.session.user._id;
  const { role, message, shareProfile } = req.body ?? {};

  try {
    const team = await populateTeam(Team.findById(teamId));
    const user = await User.findById(userId);
    if (!team || !user) return res.status(404).json({ error: 'Team or User not found' });
    if (isMember(team, userId)) {
      return res.status(409).json({ error: 'You are already in this team' });
    }
    if (!isTakingRequests(team)) {
      return res.status(409).json({ error: 'This team is not taking requests' });
    }

    const request = await TeamRequest.create({
      teamId: team._id,
      userId,
      role,
      message,
      shareProfile: shareProfile !== false,
    });

    if (team.autoAccept && matchedTeamSkills(user.skills, team.skills).length > 0) {
      team.members.push({ userId, role });
      team.syncStatus();
      await team.save();
      await applicationService.markTeamFormed(userId, team.event?.opportunityId);
      request.status = 'accepted';
      await request.save();
    }

    res.status(201).json({ _id: request._id, status: request.status });
  } catch (err) {
    handleError(res, err, 'Failed to send request');
  }
}

async function respondToRequest(req, res) {
  const { id: requestId } = req.params;
  const userId = req.session.user._id;
  const { status } = req.body ?? {};
  if (!ANSWER_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Status must be accepted or declined' });
  }

  try {
    const request = await TeamRequest.findById(requestId);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    const team = await populateTeam(Team.findById(request.teamId));
    if (!isLeader(team, userId)) return res.status(403).json({ error: 'Only leader can respond' });
    if (status === 'accepted' && team.slotsOpen === 0) {
      return res.status(409).json({ error: 'This team is already full' });
    }

    const answered = await TeamRequest.findOneAndUpdate(
      { _id: requestId, status: 'pending' },
      { status },
      { returnDocument: 'after' },
    );
    if (!answered) return res.status(409).json({ error: 'This request has already been answered' });

    if (status === 'accepted') {
      team.members.push({ userId: answered.userId, role: answered.role });
      team.syncStatus();
      await team.save();
      await applicationService.markTeamFormed(answered.userId, team.event?.opportunityId);
    }

    res.json({ _id: answered._id, status: answered.status });
  } catch (err) {
    handleError(res, err, 'Failed to answer request');
  }
}

async function withdrawRequest(req, res) {
  const { id: requestId } = req.params;
  const userId = req.session.user._id;

  try {
    const request = await TeamRequest.findById(requestId);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (String(request.userId) !== String(userId)) return res.status(403).json({ error: 'Forbidden' });
    if (request.status !== 'pending') {
      return res.status(409).json({ error: 'This request has already been answered' });
    }

    await TeamRequest.findByIdAndDelete(requestId);
    res.status(204).end();
  } catch (err) {
    handleError(res, err, 'Failed to withdraw request');
  }
}

async function getMatches(req, res) {
  const userId = req.session.user._id;

  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ error: 'Team not found' });
    if (!isLeader(team, userId)) return res.status(403).json({ error: 'Only leader can see matches' });
    if (team.status !== 'open') {
      return res.status(409).json({ error: 'Only open teams get suggestions' });
    }
    if (team.skills.length === 0) return res.json([]);

    const candidates = await User.find({
      openToTeams: true,
      _id: { $nin: [team.leaderId, ...team.members.map((member) => member.userId)] },
      skills: { $in: team.skills },
    })
      .collation({ locale: 'en', strength: 2 })
      .select(PROFILE_FIELDS)
      .lean();

    const matches = candidates
      .map(({ skills, ...candidate }) => ({
        ...candidate,
        matchedSkills: matchedTeamSkills(skills, team.skills),
      }))
      .filter((candidate) => candidate.matchedSkills.length > 0)
      .sort((a, b) => b.matchedSkills.length - a.matchedSkills.length)
      .slice(0, MAX_MATCHES);

    res.json(matches);
  } catch (err) {
    handleError(res, err, 'Failed to fetch matches');
  }
}

async function getIncomingRequests(req, res) {
  const userId = req.session.user._id;
  try {
    const teamIds = await Team.find({ leaderId: userId }).distinct('_id');
    const requests = await TeamRequest.find({ teamId: { $in: teamIds }, kind: { $ne: 'invite' } })
      .populate({ path: 'userId', select: PROFILE_FIELDS })
      .populate({ path: 'teamId', select: 'name event', options: { lean: true } })
      .sort('-createdAt');

    res.json(requests.filter((r) => r.userId && r.teamId).map(formatRequest));
  } catch (err) {
    handleError(res, err, 'Failed to fetch requests');
  }
}

async function getSentRequests(req, res) {
  const userId = req.session.user._id;
  try {
    const requests = await TeamRequest.find({ userId, kind: { $ne: 'invite' } })
      .populate({ path: 'userId', select: PROFILE_FIELDS })
      .populate({ path: 'teamId', select: 'name event', options: { lean: true } })
      .sort('-createdAt');

    res.json(requests.filter((r) => r.userId && r.teamId).map(formatRequest));
  } catch (err) {
    handleError(res, err, 'Failed to fetch requests');
  }
}

// --- Invites ---

function formatInvite(invite) {
  const team = invite.teamId;
  return {
    _id: invite._id,
    status: invite.status,
    role: invite.role,
    message: invite.message,
    createdAt: invite.createdAt,
    user: invite.userId, // the invited person
    team: team
      ? {
          _id: team._id,
          name: team.name,
          event: team.event,
          pitch: team.pitch,
          skills: team.skills,
          leader: team.leaderId,
        }
      : null,
  };
}

// POST /teams/:id/invites  body: { userName (SMU email), role?, message? } - leader only
async function createInvite(req, res) {
  const { id: teamId } = req.params;
  const userId = req.session.user._id;
  const { userName, role, message } = req.body ?? {};
  const email = String(userName ?? '').trim().toLowerCase();

  if (!/^[^@\s]+@smu\.edu\.sg$/.test(email)) {
    return res.status(400).json({ error: 'Type your friend\'s @smu.edu.sg email.' });
  }

  try {
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ error: 'Team not found' });
    if (!isLeader(team, userId)) return res.status(403).json({ error: 'Only the team lead can invite people' });
    if (team.slotsOpen === 0) return res.status(409).json({ error: 'Your team is already full' });

    const friend = await User.findOne({ userName: email }).select('_id displayName userName');
    if (!friend) {
      return res.status(404).json({ error: 'No TechTrek account uses that email yet. Send them your invite link instead!' });
    }
    if (String(friend._id) === String(userId)) return res.status(400).json({ error: 'You are already in this team' });
    if (team.members.some((member) => String(member.userId) === String(friend._id))) {
      return res.status(409).json({ error: (friend.displayName || email) + ' is already in your team' });
    }

    const existing = await TeamRequest.findOne({ teamId: team._id, userId: friend._id });
    if (existing && existing.status === 'pending') {
      return res.status(409).json({
        error: existing.kind === 'invite'
          ? 'You already invited ' + (friend.displayName || email)
          : (friend.displayName || email) + ' already asked to join - check your Requests',
      });
    }
    // an old answered request or invite would block a new one, so clear it
    if (existing) await TeamRequest.deleteOne({ _id: existing._id });

    const invite = await TeamRequest.create({
      teamId: team._id,
      userId: friend._id,
      kind: 'invite',
      role,
      message,
    });

    res.status(201).json({ _id: invite._id, status: invite.status, user: friend });
  } catch (err) {
    handleError(res, err, 'Failed to send invite');
  }
}

// GET /teams/:id/invites - leader only: who this team has invited
async function getTeamInvites(req, res) {
  const { id: teamId } = req.params;
  const userId = req.session.user._id;
  try {
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ error: 'Team not found' });
    if (!isLeader(team, userId)) return res.status(403).json({ error: 'Only the team lead can see invites' });

    const invites = await TeamRequest.find({ teamId, kind: 'invite' })
      .populate({ path: 'userId', select: 'displayName userName avatar.updatedAt' })
      .sort('-createdAt');
    res.json(invites.filter((invite) => invite.userId).map(formatInvite));
  } catch (err) {
    handleError(res, err, 'Failed to fetch invites');
  }
}

// GET /teams/invites - invites sent to me that I have not answered
async function getMyInvites(req, res) {
  const userId = req.session.user._id;
  try {
    const invites = await TeamRequest.find({ userId, kind: 'invite', status: 'pending' })
      .populate({
        path: 'teamId',
        select: 'name event pitch skills leaderId',
        populate: { path: 'leaderId', select: 'displayName userName avatar.updatedAt' },
      })
      .sort('-createdAt');
    res.json(invites.filter((invite) => invite.teamId).map(formatInvite));
  } catch (err) {
    handleError(res, err, 'Failed to fetch invites');
  }
}

// PATCH /teams/invites/:id  body: { status: accepted | declined } - the invited person answers
async function respondToInvite(req, res) {
  const { id: inviteId } = req.params;
  const userId = req.session.user._id;
  const { status } = req.body ?? {};
  if (!ANSWER_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Status must be accepted or declined' });
  }

  try {
    const invite = await TeamRequest.findById(inviteId);
    if (!invite || invite.kind !== 'invite') return res.status(404).json({ error: 'Invite not found' });
    if (String(invite.userId) !== String(userId)) return res.status(403).json({ error: 'This invite is for someone else' });

    const team = await Team.findById(invite.teamId);
    if (!team) return res.status(404).json({ error: 'This team no longer exists' });
    if (status === 'accepted' && team.slotsOpen === 0) {
      return res.status(409).json({ error: 'Sorry, this team filled up before you answered' });
    }

    const answered = await TeamRequest.findOneAndUpdate(
      { _id: inviteId, status: 'pending' },
      { status },
      { returnDocument: 'after' },
    );
    if (!answered) return res.status(409).json({ error: 'You already answered this invite' });

    if (status === 'accepted') {
      team.members.push({ userId, role: answered.role });
      team.syncStatus();
      await team.save();
      await applicationService.markTeamFormed(userId, team.event?.opportunityId);
    }

    res.json({ _id: answered._id, status: answered.status, team: { _id: team._id, name: team.name } });
  } catch (err) {
    handleError(res, err, 'Failed to answer invite');
  }
}

// DELETE /teams/invites/:id - the leader takes back an invite that has not been answered
async function cancelInvite(req, res) {
  const { id: inviteId } = req.params;
  const userId = req.session.user._id;
  try {
    const invite = await TeamRequest.findById(inviteId);
    if (!invite || invite.kind !== 'invite') return res.status(404).json({ error: 'Invite not found' });
    const team = await Team.findById(invite.teamId);
    if (!team || !isLeader(team, userId)) return res.status(403).json({ error: 'Only the team lead can cancel invites' });

    await TeamRequest.deleteOne({ _id: inviteId });
    res.status(204).end();
  } catch (err) {
    handleError(res, err, 'Failed to cancel invite');
  }
}

module.exports = {
  getTeams,
  getMyTeams,
  getEvents,
  createTeam,
  updateTeam,
  deleteTeam,
  createRequest,
  getMatches,
  getIncomingRequests,
  getSentRequests,
  respondToRequest,
  withdrawRequest,
  createInvite,
  getTeamInvites,
  getMyInvites,
  respondToInvite,
  cancelInvite,
};