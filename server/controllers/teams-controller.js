const Team = require('../models/Team');
const TeamRequest = require('../models/TeamRequest');
const User = require('../models/User');
const Opportunity = require('../models/Opportunity');
const { cleanSkills } = require('../service/skills');

const PROFILE_FIELDS = 'userName displayName year course skills githubUrl linkedinUrl';
const ANSWER_STATUSES = ['accepted', 'declined'];

// --- Helper Functions ---
function hasSkillMatch(userSkills = [], teamSkills = []) {
  const wanted = teamSkills.map((skill) => skill.toLowerCase());
  return userSkills.some((skill) => wanted.includes(skill.toLowerCase()));
}

function isLeader(team, userId) {
  return String(team.leaderId?._id ?? team.leaderId) === String(userId);
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
        userName: user?.userName,
        displayName: user?.displayName,
        year: user?.year,
        course: user?.course,
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

    const requests = await TeamRequest.find({ userId, teamId: { $in: teams.map((t) => t._id) } });
    const statusByTeam = {};
    for (const r of requests) statusByTeam[String(r.teamId)] = r.status;

    const result = teams
      .filter((t) => t.leaderId)
      .map((t) => formatTeam(t, userId, statusByTeam[String(t._id)]));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
}

async function createTeam(req, res) {
  const userId = req.session.user._id;
  const data = req.body ?? {};

  try {
    let eventData = { name: data.eventName, location: data.eventLocation };
    let closesAt = data.closesAt;

    if (data.opportunityId) {
      const opportunity = await Opportunity.findById(data.opportunityId);
      if (!opportunity) return res.status(404).json({ error: 'Event not found' });
      eventData = { opportunityId: opportunity._id, name: opportunity.title, location: opportunity.location };
      closesAt = closesAt || opportunity.deadline;
    }

    const teamSize = Number(data.teamSize);
    const openSlots = Number(data.openSlots);
    if (!Number.isInteger(teamSize) || !Number.isInteger(openSlots) || openSlots < 1 || openSlots > teamSize - 1) {
      return res.status(400).json({ error: 'Invalid slots configuration' });
    }

    const team = await Team.create({
      name: data.name,
      leaderId: userId,
      event: eventData,
      closesAt,
      teamSize,
      externalMembers: teamSize - openSlots - 1,
      members: [{ userId, role: 'Team lead' }],
      pitch: data.pitch,
      skills: cleanSkills(data.skills),
      autoAccept: Boolean(data.autoAccept),
      status: data.status === 'draft' ? 'draft' : 'open',
    });

    const populated = await populateTeam(Team.findById(team._id));
    res.status(201).json(formatTeam(populated, userId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function updateTeam(req, res) {
  const { id: teamId } = req.params;
  const userId = req.session.user._id;
  const data = req.body ?? {};

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
      const external = teamSize - openSlots - team.members.length;
      team.teamSize = teamSize;
      team.externalMembers = external;
    }

    team.syncStatus();
    await team.save();

    const updated = await populateTeam(Team.findById(team._id));
    res.json(formatTeam(updated, userId));
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
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

    const request = await TeamRequest.create({
      teamId: team._id,
      userId,
      role,
      message,
      shareProfile: shareProfile !== false,
    });

    if (team.autoAccept && hasSkillMatch(user.skills, team.skills)) {
      team.members.push({ userId, role });
      team.syncStatus();
      await team.save();
      request.status = 'accepted';
      await request.save();
    }

    res.status(201).json({ _id: request._id, status: request.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
    }

    res.json({ _id: answered._id, status: answered.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function withdrawRequest(req, res) {
  const { id: requestId } = req.params;
  const userId = req.session.user._id;

  try {
    const request = await TeamRequest.findById(requestId);
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (String(request.userId) !== String(userId)) return res.status(403).json({ error: 'Forbidden' });

    await TeamRequest.findByIdAndDelete(requestId);
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getIncomingRequests(req, res) {
  const userId = req.session.user._id;
  try {
    const teamIds = await Team.find({ leaderId: userId }).distinct('_id');
    const requests = await TeamRequest.find({ teamId: { $in: teamIds } })
      .populate({ path: 'userId', select: PROFILE_FIELDS })
      .populate({ path: 'teamId', select: 'name event', options: { lean: true } })
      .sort('-createdAt');

    res.json(requests.filter((r) => r.userId && r.teamId).map(formatRequest));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

async function getSentRequests(req, res) {
  const userId = req.session.user._id;
  try {
    const requests = await TeamRequest.find({ userId })
      .populate({ path: 'userId', select: PROFILE_FIELDS })
      .populate({ path: 'teamId', select: 'name event', options: { lean: true } })
      .sort('-createdAt');

    res.json(requests.filter((r) => r.userId && r.teamId).map(formatRequest));
  } catch (err) {
    res.status(500).json({ error: err.message });
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
  getIncomingRequests,
  getSentRequests,
  respondToRequest,
  withdrawRequest,
};