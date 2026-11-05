const mongoose = require('mongoose');
const Team = require('../models/Team');
const TeamRequest = require('../models/TeamRequest');
const User = require('../models/User');
const Opportunity = require('../models/Opportunity');
const { cleanSkills, sameSkill } = require('../service/skills');
const opportunityService = require('../service/opportunity-service');
const applicationService = require('../service/application-service');
const notificationService = require('../service/notification-service');
const teamRequestService = require('../service/team-request-service');

const PROFILE_FIELDS = 'displayName faculty year course about skills githubUrl linkedinUrl avatar.updatedAt';
// a team also loads how to contact each person (SMU email, Telegram); formatTeam only passes these on
// to people in that team
const CONTACT_FIELDS = 'userName telegram';
const TEAM_PERSON_FIELDS = PROFILE_FIELDS + ' ' + CONTACT_FIELDS;
const ANSWER_STATUSES = ['accepted', 'declined'];
const EVENT_FIELDS = ['opportunity', 'opportunityId', 'eventName', 'eventLocation', 'closesAt'];
const MAX_MATCHES = 20;

// --- Helper Functions ---
function matchedTeamSkills(userSkills = [], teamSkills = []) {
  // "nodejs" on a profile matches "Node.js" on a team
  return teamSkills.filter((wanted) => userSkills.some((mine) => sameSkill(mine, wanted)));
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

const MAX_ROLE_LENGTH = 60;

// the roles a leader typed for their open spots: trimmed, blanks dropped
function cleanRoles(roles) {
  if (!Array.isArray(roles)) return [];
  return roles
    .map((role) => String(role ?? '').trim().slice(0, MAX_ROLE_LENGTH))
    .filter((role) => role !== '');
}

function tooManyRoles(res, team) {
  const spots = team.slotsOpen === 1 ? '1 open spot' : team.slotsOpen + ' open spots';
  return res.status(400).json({ error: `You have ${spots}, so list at most ${team.slotsOpen} roles.` });
}

// the open role a request is for, spelt the way the team wrote it (null = not one of them)
function matchOpenRole(team, role) {
  const wanted = String(role ?? '').trim().toLowerCase();
  return team.openRoles.find((open) => open.toLowerCase() === wanted) ?? null;
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
    .populate({ path: 'leaderId', select: TEAM_PERSON_FIELDS })
    .populate({ path: 'members.userId', select: TEAM_PERSON_FIELDS });
}

// a person in a team: their contact details only go to people in the same team
function teamPerson(user, canContact) {
  if (!user || typeof user.toObject !== 'function') return user;
  const person = user.toObject();
  if (!canContact) {
    delete person.userName;
    delete person.telegram;
  }
  return person;
}

function formatTeam(team, userId, requestStatus = null) {
  const inTeam = Boolean(userId) && (isLeader(team, userId) || isMember(team, userId));
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
    openRoles: team.openRoles ?? [],
    autoAccept: team.autoAccept,
    status: team.status,
    leader: teamPerson(team.leaderId, inTeam),
    members: (team.members || [])
      .filter((member) => member.userId)
      .map((member) => ({ user: teamPerson(member.userId, inTeam), role: member.role })),
    canContact: inTeam, // people in the team can see each other's email and Telegram
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
    closedReason: request.closedReason ?? null,
    createdAt: request.createdAt,
    user: shown,
    team: request.teamId,
  };
}

// --- Controller Actions ---

async function getTeams(req, res) {
  const userId = req.session.user._id;

  try {
    // the teams and my requests load at the same time
    const [teams, requests] = await Promise.all([
      populateTeam(
        Team.find({
          status: { $in: ['open', 'closed'] },
          leaderId: { $ne: userId },
          'members.userId': { $ne: userId },
          $or: [{ closesAt: {$gte: new Date() } }, { closesAt: null }],
        }).sort('closesAt')
      ),
      TeamRequest.find({ userId, kind: { $ne: 'invite' } }),
    ]);
    // my request to each team, so the page can show "Request sent" and undo it
    const requestByTeam = {};
    for (const r of requests) requestByTeam[String(r.teamId)] = r;

    const result = teams
      .filter((t) => t.leaderId)
      .map((t) => {
        // a request TechTrek closed (the team was full) means I can ask again
        const request = requestByTeam[String(t._id)];
        const live = request && !request.closedReason ? request : null;
        return { ...formatTeam(t, userId, live?.status ?? null), requestId: live?._id ?? null };
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

    if (cleanRoles(data.openRoles).length > openSlots) {
      return tooManyRoles(res, { slotsOpen: openSlots });
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
      openRoles: cleanRoles(data.openRoles),
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
    if (data.openRoles !== undefined) team.openRoles = cleanRoles(data.openRoles);

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
    if (team.openRoles.length > team.slotsOpen) return tooManyRoles(res, team);

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
    // the lead made the team smaller: no spots left closes the requests still waiting
    await teamRequestService.closeIfFull(team);

    const updated = await populateTeam(Team.findById(team._id));
    res.json(formatTeam(updated, userId));
  } catch (err) {
    handleError(res, err, 'Failed to update team');
  }
}

// PATCH /teams/:id/members/:userId  body: { role } - the leader gives a member (or themself) a role
async function assignRole(req, res) {
  const { id: teamId, userId: memberId } = req.params;
  const userId = req.session.user._id;
  const role = String(req.body?.role ?? '').trim();
  if (role.length > MAX_ROLE_LENGTH) {
    return res.status(400).json({ error: `Keep the role under ${MAX_ROLE_LENGTH} characters.` });
  }

  try {
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ error: 'Team not found' });
    if (!isLeader(team, userId)) return res.status(403).json({ error: 'Only the team lead can give out roles' });

    const member = team.members.find((candidate) => String(candidate.userId) === String(memberId));
    if (!member) return res.status(404).json({ error: 'That person is not in this team' });

    const isLead = String(memberId) === String(team.leaderId);
    const oldRole = member.role;
    member.role = role || (isLead ? 'Team lead' : undefined);
    // giving someone a role that was still open means that spot no longer needs filling,
    // and the role they had before is needed instead (they swapped)
    const filled = team.fillRole(role);
    const swappedOut = oldRole && !isLead && oldRole.toLowerCase() !== role.toLowerCase();
    if (filled && swappedOut) team.openRoles.push(oldRole);
    await team.save();

    if (role) {
      await notificationService.notify({ userId: memberId, type: 'role-assigned', actorId: userId, team, role });
    }

    const updated = await populateTeam(Team.findById(team._id));
    res.json(formatTeam(updated, userId));
  } catch (err) {
    handleError(res, err, 'Failed to update the role');
  }
}

async function deleteTeam(req, res) {
  const { id: teamId } = req.params;
  const userId = req.session.user._id;

  try {
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ error: 'Team not found' });
    if (!isLeader(team, userId)) return res.status(403).json({ error: 'Only leader can delete' });

    await Promise.all([TeamRequest.deleteMany({ teamId }), Team.findByIdAndDelete(teamId)]);
    // everyone else in the team finds out it is gone (all at once, not one after another)
    await Promise.all(
      team.members.map((member) =>
        notificationService.notify({ userId: member.userId, type: 'team-deleted', actorId: userId, team }),
      ),
    );
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
    const [team, user] = await Promise.all([Team.findById(teamId), User.findById(userId)]);
    if (!team || !user) return res.status(404).json({ error: 'Team or User not found' });
    if (isMember(team, userId)) {
      return res.status(409).json({ error: 'You are already in this team' });
    }
    if (!isTakingRequests(team)) {
      return res.status(409).json({ error: 'This team is not taking requests' });
    }

    // a team with open roles takes requests for one of those roles only
    let askedRole = role;
    if (team.openRoles.length > 0) {
      askedRole = matchOpenRole(team, role);
      if (!askedRole) {
        return res.status(400).json({ error: 'Pick one of the open roles: ' + team.openRoles.join(', ') });
      }
    }

    // a request TechTrek closed earlier (team was full) doesn't stop me asking again now there's room
    await TeamRequest.deleteOne({ teamId: team._id, userId, closedReason: { $exists: true } });

    const request = await TeamRequest.create({
      teamId: team._id,
      userId,
      role: askedRole,
      message,
      shareProfile: shareProfile !== false,
    });

    if (team.autoAccept && matchedTeamSkills(user.skills, team.skills).length > 0) {
      team.members.push({ userId, role: askedRole });
      team.fillRole(askedRole);
      team.syncStatus();
      request.status = 'accepted';
      await Promise.all([team.save(), request.save()]);
      await Promise.all([
        applicationService.markTeamFormed(userId, team.event?.opportunityId),
        teamRequestService.closeIfFull(team),
        notificationService.notify({ userId: team.leaderId, type: 'member-joined', actor: user, team, role: askedRole }),
        notificationService.notify({ userId, type: 'request-accepted', actorId: team.leaderId, team, role: askedRole }),
      ]);
    } else {
      await notificationService.notify({ userId: team.leaderId, type: 'request-received', actor: user, team, role: askedRole });
    }

    res.status(201).json({ _id: request._id, status: request.status });
  } catch (err) {
    handleError(res, err, 'Failed to send request');
  }
}

async function respondToRequest(req, res) {
  const { id: requestId } = req.params;
  const userId = req.session.user._id;
  // role: the open role the lead accepts them into (defaults to the role they asked for)
  const { status, role } = req.body ?? {};
  if (!ANSWER_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Status must be accepted or declined' });
  }

  try {
    const request = await TeamRequest.findById(requestId);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    // only the team itself is needed here, not everyone's profile
    const team = await Team.findById(request.teamId);
    if (!team) return res.status(404).json({ error: 'Team not found' });
    if (!isLeader(team, userId)) return res.status(403).json({ error: 'Only leader can respond' });
    if (status === 'accepted' && team.slotsOpen === 0) {
      return res.status(409).json({ error: 'This team is already full' });
    }

    let joinedAs = String(role ?? '').trim() || request.role;
    if (status === 'accepted' && team.openRoles.length > 0) {
      joinedAs = matchOpenRole(team, joinedAs);
      if (!joinedAs) {
        return res.status(400).json({ error: 'Pick one of the open roles: ' + team.openRoles.join(', ') });
      }
    }

    const answered = await TeamRequest.findOneAndUpdate(
      { _id: requestId, status: 'pending' },
      status === 'accepted' ? { status, role: joinedAs } : { status },
      { returnDocument: 'after' },
    );
    if (!answered) return res.status(409).json({ error: 'This request has already been answered' });

    if (status === 'accepted') {
      team.members.push({ userId: answered.userId, role: answered.role });
      team.fillRole(answered.role);
      team.syncStatus();
      await team.save();
    }
    // the follow-ups don't depend on each other, so they run together
    await Promise.all([
      status === 'accepted' ? applicationService.markTeamFormed(answered.userId, team.event?.opportunityId) : null,
      // that was the last spot: everyone else still waiting is told the team is full
      status === 'accepted' ? teamRequestService.closeIfFull(team) : null,
      notificationService.notify({
        userId: answered.userId,
        type: status === 'accepted' ? 'request-accepted' : 'request-declined',
        actorId: userId,
        team,
        role: status === 'accepted' ? answered.role : undefined,
      }),
    ]);

    res.json({ _id: answered._id, status: answered.status, role: answered.role });
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
    await notificationService.remove({ type: 'request-received', teamId: request.teamId, actorId: userId });
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
    await teamRequestService.closeExpired();
    const teamIds = await Team.find({ leaderId: userId }).distinct('_id');
    const requests = await TeamRequest.find({ teamId: { $in: teamIds }, kind: { $ne: 'invite' } })
      .populate({ path: 'userId', select: PROFILE_FIELDS })
      .populate({ path: 'teamId', select: 'name event openRoles', options: { lean: true } })
      .sort('-createdAt');

    res.json(requests.filter((r) => r.userId && r.teamId).map(formatRequest));
  } catch (err) {
    handleError(res, err, 'Failed to fetch requests');
  }
}

async function getSentRequests(req, res) {
  const userId = req.session.user._id;
  try {
    await teamRequestService.closeExpired();
    const requests = await TeamRequest.find({ userId, kind: { $ne: 'invite' } })
      .populate({ path: 'userId', select: PROFILE_FIELDS })
      .populate({ path: 'teamId', select: 'name event openRoles', options: { lean: true } })
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

    // a team with open roles invites people for one of those roles, the same as requests
    let invitedAs = String(role ?? '').trim() || undefined;
    if (team.openRoles.length > 0) {
      invitedAs = matchOpenRole(team, invitedAs);
      if (!invitedAs) {
        return res.status(400).json({ error: 'Pick which open role you are inviting them for: ' + team.openRoles.join(', ') });
      }
    }

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
      role: invitedAs,
      message,
    });

    await notificationService.notify({ userId: friend._id, type: 'invite-received', actorId: userId, team, role: invitedAs });

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
      .populate({ path: 'userId', select: 'displayName avatar.updatedAt' })
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
    await teamRequestService.closeExpired();
    const invites = await TeamRequest.find({ userId, kind: 'invite', status: 'pending' })
      .populate({
        path: 'teamId',
        select: 'name event pitch skills leaderId',
        populate: { path: 'leaderId', select: 'displayName avatar.updatedAt' },
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
      team.fillRole(answered.role);
      team.syncStatus();
      await team.save();
      await applicationService.markTeamFormed(userId, team.event?.opportunityId);
      await teamRequestService.closeIfFull(team);
    }

    await notificationService.notify({
      userId: team.leaderId,
      type: status === 'accepted' ? 'invite-accepted' : 'invite-declined',
      actorId: userId,
      team,
      role: status === 'accepted' ? answered.role : undefined,
    });

    res.json({ _id: answered._id, status: answered.status, team: { _id: team._id, name: team.name } });
  } catch (err) {
    handleError(res, err, 'Failed to answer invite');
  }
}

// POST /teams/:id/leave - a member (not the leader) leaves the team and their slot opens up again
async function leaveTeam(req, res) {
  const { id: teamId } = req.params;
  const userId = req.session.user._id;
  try {
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ error: 'Team not found' });
    if (isLeader(team, userId)) {
      return res.status(409).json({ error: 'Team leads cannot leave their own team. Delete the team post instead.' });
    }
    if (!isMember(team, userId)) return res.status(409).json({ error: 'You are not in this team' });

    const leaving = team.members.find((member) => String(member.userId) === String(userId));
    team.members = team.members.filter((member) => String(member.userId) !== String(userId));
    // their role is needed again
    if (leaving.role && team.openRoles.length < team.slotsOpen) team.openRoles.push(leaving.role);
    team.syncStatus();
    await team.save();
    // the old accepted request would stop them asking to join again later
    await TeamRequest.deleteMany({ teamId, userId });
    await notificationService.notify({ userId: team.leaderId, type: 'member-left', actorId: userId, team });

    res.status(204).end();
  } catch (err) {
    handleError(res, err, 'Failed to leave team');
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
    await notificationService.remove({ type: 'invite-received', teamId: team._id, userId: invite.userId });
    res.status(204).end();
  } catch (err) {
    handleError(res, err, 'Failed to cancel invite');
  }
}

module.exports = {
  assignRole,
  leaveTeam,
  getTeams,
  getMyTeams,
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