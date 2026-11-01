const Team = require('../models/Team');
const TeamRequest = require('../models/TeamRequest');
const User = require('../models/User');
const Opportunity = require('../models/Opportunity');

const PROFILE_FIELDS = 'userName displayName year course skills githubUrl linkedinUrl';

const MAX_SKILLS = 12;

class TeamServiceError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'TeamServiceError';
    this.status = status;
  }
}

function cleanSkills(skills) {
  if (!Array.isArray(skills)) {
    return [];
  }
  const cleaned = [];
  for (const skill of skills) {
    const text = String(skill).trim().slice(0, 40);
    const alreadyThere = cleaned.some((item) => item.toLowerCase() === text.toLowerCase());
    if (text !== '' && !alreadyThere) {
      cleaned.push(text);
    }
  }
  return cleaned.slice(0, MAX_SKILLS);
}

function hasSkillMatch(userSkills, teamSkills) {
  const wanted = teamSkills.map((skill) => skill.toLowerCase());
  return userSkills.some((skill) => wanted.includes(skill.toLowerCase()));
}

function syncStatus(team) {
  if (team.status === 'open' && team.slotsOpen === 0) {
    team.status = 'closed';
  } else if (team.status === 'closed' && team.slotsOpen > 0) {
    team.status = 'open';
  }
}

function isLeader(team, userId) {
  return String(team.leaderId._id ?? team.leaderId) === String(userId);
}

function populateTeam(query) {
  return query
    .populate({ path: 'leaderId', select: PROFILE_FIELDS })
    .populate({ path: 'members.userId', select: PROFILE_FIELDS });
}

async function findTeamOrFail(teamId) {
  const team = await populateTeam(Team.findById(teamId));
  if (!team) {
    throw new TeamServiceError(404, 'Team not found');
  }
  return team;
}

async function findUserOrFail(userId) {
  const user = await User.findById(userId).select(PROFILE_FIELDS);
  if (!user) {
    throw new TeamServiceError(404, 'User not found');
  }
  return user;
}

function formatTeam(team, userId, requestStatus) {
  const leader = team.leaderId;
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
    leader: leader,
    members: team.members
      .filter((member) => member.userId)
      .map((member) => ({ user: member.userId, role: member.role })),
    isLeader: userId ? isLeader(team, userId) : false,
    requestStatus: requestStatus ?? null,
  };
}

function formatRequest(request) {
  const user = request.userId;
  const shown = request.shareProfile
    ? user
    : {
        _id: user._id,
        userName: user.userName,
        displayName: user.displayName,
        year: user.year,
        course: user.course,
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

async function resolveEvent({ opportunityId, eventName, eventLocation, closesAt }) {
  if (opportunityId) {
    const opportunity = await Opportunity.findById(opportunityId);
    if (!opportunity) {
      throw new TeamServiceError(404, 'Event not found');
    }
    return {
      event: { opportunityId: opportunity._id, name: opportunity.title, location: opportunity.location },
      closesAt: closesAt || opportunity.deadline,
    };
  }

  if (!eventName || String(eventName).trim() === '') {
    throw new TeamServiceError(400, 'Choose a hackathon or competition');
  }
  return {
    event: { name: eventName, location: eventLocation },
    closesAt: closesAt || undefined,
  };
}

async function getBrowseTeams(userId) {
  const teams = await populateTeam(
    Team.find({
      status: { $in: ['open', 'closed'] },
      leaderId: { $ne: userId },
      'members.userId': { $ne: userId },
      $or: [{ closesAt: { $gte: new Date() } }, { closesAt: null }],
    }).sort('closesAt'),
  );

  const requests = await TeamRequest.find({ userId: userId, teamId: { $in: teams.map((team) => team._id) } });
  const statusByTeam = {};
  for (const request of requests) {
    statusByTeam[String(request.teamId)] = request.status;
  }

  return teams
    .filter((team) => team.leaderId)
    .map((team) => formatTeam(team, userId, statusByTeam[String(team._id)]));
}

async function getMyTeams(userId) {
  const teams = await populateTeam(
    Team.find({ $or: [{ leaderId: userId }, { 'members.userId': userId }] }).sort('-updatedAt'),
  );
  return teams.filter((team) => team.leaderId).map((team) => formatTeam(team, userId));
}

async function getEvents() {
  return Opportunity.find({
    type: { $in: ['hackathon', 'competition'] },
    $or: [{ deadline: { $gte: new Date() } }, { deadline: null }],
  })
    .select('title organisation location deadline')
    .sort('deadline')
    .lean();
}

async function createTeam(userId, data) {
  await findUserOrFail(userId);

  const { event, closesAt } = await resolveEvent(data);
  const teamSize = Number(data.teamSize);
  const openSlots = Number(data.openSlots);

  if (!Number.isInteger(teamSize) || !Number.isInteger(openSlots) || openSlots < 1 || openSlots > teamSize - 1) {
    throw new TeamServiceError(400, 'Open slots must be between 1 and the team size minus the leader');
  }

  const team = await Team.create({
    name: data.name,
    leaderId: userId,
    event: event,
    closesAt: closesAt,
    teamSize: teamSize,

    externalMembers: teamSize - openSlots - 1,
    members: [{ userId: userId, role: 'Team lead' }],
    pitch: data.pitch,
    skills: cleanSkills(data.skills),
    autoAccept: Boolean(data.autoAccept),
    status: data.status === 'draft' ? 'draft' : 'open',
  });

  return formatTeam(await findTeamOrFail(team._id), userId);
}

async function updateTeam(teamId, userId, data) {
  const team = await findTeamOrFail(teamId);
  if (!isLeader(team, userId)) {
    throw new TeamServiceError(403, 'Only the team leader can edit this post');
  }

  if (data.name !== undefined) team.name = data.name;
  if (data.pitch !== undefined) team.pitch = data.pitch;
  if (data.skills !== undefined) team.skills = cleanSkills(data.skills);
  if (data.autoAccept !== undefined) team.autoAccept = Boolean(data.autoAccept);

  if (data.opportunityId !== undefined || data.eventName !== undefined) {
    const { event, closesAt } = await resolveEvent(data);
    team.event = event;
    team.closesAt = closesAt;
  }

  if (data.teamSize !== undefined || data.openSlots !== undefined) {
    const teamSize = Number(data.teamSize ?? team.teamSize);
    const openSlots = Number(data.openSlots ?? team.slotsOpen);
    const external = teamSize - openSlots - team.members.length;
    if (!Number.isInteger(teamSize) || !Number.isInteger(openSlots) || external < 0) {
      throw new TeamServiceError(400, 'Open slots is too high for this team size');
    }
    team.teamSize = teamSize;
    team.externalMembers = external;
  }

  if (data.status === 'draft' || data.status === 'open') {
    team.status = data.status;
  }
  syncStatus(team);

  await team.save();
  return formatTeam(await findTeamOrFail(team._id), userId);
}

async function deleteTeam(teamId, userId) {
  const team = await findTeamOrFail(teamId);
  if (!isLeader(team, userId)) {
    throw new TeamServiceError(403, 'Only the team leader can delete this post');
  }
  await TeamRequest.deleteMany({ teamId: team._id });
  await Team.findByIdAndDelete(team._id);
}

async function addMember(team, request) {
  if (team.slotsOpen === 0) {
    throw new TeamServiceError(409, 'This team is already full');
  }
  team.members.push({ userId: request.userId, role: request.role });
  syncStatus(team);
  await team.save();
}

async function createRequest(teamId, userId, { role, message, shareProfile }) {
  const team = await findTeamOrFail(teamId);
  const user = await findUserOrFail(userId);

  if (team.status !== 'open') {
    throw new TeamServiceError(409, 'This team is not taking requests');
  }
  if (team.closesAt && team.closesAt < new Date()) {
    throw new TeamServiceError(409, 'Requests for this team have closed');
  }
  if (isLeader(team, userId) || team.members.some((member) => String(member.userId._id) === String(userId))) {
    throw new TeamServiceError(400, 'You are already in this team');
  }
  if (team.slotsOpen === 0) {
    throw new TeamServiceError(409, 'This team is already full');
  }
  if (team.skills.length > 0 && !team.skills.some((skill) => skill.toLowerCase() === String(role ?? '').toLowerCase())) {
    throw new TeamServiceError(400, 'Choose one of the roles the team is looking for');
  }
  if (await TeamRequest.exists({ teamId: team._id, userId: userId })) {
    throw new TeamServiceError(409, 'You already sent a request to this team');
  }

  const request = await TeamRequest.create({
    teamId: team._id,
    userId: userId,
    role: role,
    message: message,
    shareProfile: shareProfile !== false,
  });

  if (team.autoAccept && hasSkillMatch(user.skills, team.skills)) {
    await addMember(team, request);
    request.status = 'accepted';
    await request.save();
  }

  return { _id: request._id, status: request.status };
}

async function respondToRequest(requestId, userId, status) {
  if (status !== 'accepted' && status !== 'declined') {
    throw new TeamServiceError(400, 'status must be accepted or declined');
  }

  const request = await TeamRequest.findById(requestId);
  if (!request) {
    throw new TeamServiceError(404, 'Request not found');
  }

  const team = await findTeamOrFail(request.teamId);
  if (!isLeader(team, userId)) {
    throw new TeamServiceError(403, 'Only the team leader can answer requests');
  }
  if (request.status !== 'pending') {
    throw new TeamServiceError(409, 'This request was already answered');
  }

  if (status === 'accepted') {
    await addMember(team, request);
  }
  request.status = status;
  await request.save();

  return { _id: request._id, status: request.status };
}

async function withdrawRequest(requestId, userId) {
  const request = await TeamRequest.findById(requestId);
  if (!request) {
    throw new TeamServiceError(404, 'Request not found');
  }
  if (String(request.userId) !== String(userId)) {
    throw new TeamServiceError(403, 'You can only withdraw your own requests');
  }
  if (request.status !== 'pending') {
    throw new TeamServiceError(409, 'Only pending requests can be withdrawn');
  }
  await TeamRequest.findByIdAndDelete(requestId);
}

async function getIncomingRequests(userId) {
  const teamIds = await Team.find({ leaderId: userId }).distinct('_id');
  const requests = await TeamRequest.find({ teamId: { $in: teamIds } })
    .populate({ path: 'userId', select: PROFILE_FIELDS })
    .populate({ path: 'teamId', select: 'name event' })
    .sort('-createdAt');
  return requests.filter((request) => request.userId && request.teamId).map(formatRequest);
}

async function getSentRequests(userId) {
  const requests = await TeamRequest.find({ userId: userId })
    .populate({ path: 'userId', select: PROFILE_FIELDS })
    .populate({ path: 'teamId', select: 'name event' })
    .sort('-createdAt');
  return requests.filter((request) => request.userId && request.teamId).map(formatRequest);
}

async function getProfile(userId) {
  return findUserOrFail(userId);
}

async function updateSkills(userId, skills) {
  const user = await User.findByIdAndUpdate(
    userId,
    { skills: cleanSkills(skills) },
    { returnDocument: 'after', runValidators: true },
  ).select(PROFILE_FIELDS);

  if (!user) {
    throw new TeamServiceError(404, 'User not found');
  }
  return user;
}

module.exports = {
  TeamServiceError,
  getBrowseTeams,
  getMyTeams,
  getEvents,
  createTeam,
  updateTeam,
  deleteTeam,
  createRequest,
  respondToRequest,
  withdrawRequest,
  getIncomingRequests,
  getSentRequests,
  getProfile,
  updateSkills,
};
