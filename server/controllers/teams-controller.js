const mongoose = require('mongoose');
const teamService = require('../service/team-service');

function handleError(res, err, fallback) {
  if (err instanceof teamService.TeamServiceError) return res.status(err.status).json({ error: err.message });
  if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
  if (err.code === 11000) return res.status(409).json({ error: 'You already sent a request to this team' });
  console.error(fallback, err.message);
  res.status(500).json({ error: fallback });
}

async function getTeams(req, res) {
  const { userId } = req.query;
  if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ error: 'Valid userId required' });

  try {
    const teams = await teamService.getBrowseTeams(userId);
    res.json(teams);
  } catch (err) {
    handleError(res, err, 'Failed to fetch teams');
  }
}

async function getMyTeams(req, res) {
  const { userId } = req.query;
  if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ error: 'Valid userId required' });

  try {
    const teams = await teamService.getMyTeams(userId);
    res.json(teams);
  } catch (err) {
    handleError(res, err, 'Failed to fetch your teams');
  }
}

async function getEvents(req, res) {
  try {
    const events = await teamService.getEvents();
    res.json(events);
  } catch (err) {
    handleError(res, err, 'Failed to fetch events');
  }
}

async function getProfile(req, res) {
  const { userId } = req.query;
  if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ error: 'Valid userId required' });

  try {
    const user = await teamService.getProfile(userId);
    res.json(user);
  } catch (err) {
    handleError(res, err, 'Failed to fetch user');
  }
}

async function updateSkills(req, res) {
  const { userId, skills } = req.body ?? {};
  if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ error: 'Valid userId required' });
  if (!Array.isArray(skills)) return res.status(400).json({ error: 'skills must be an array' });

  try {
    const user = await teamService.updateSkills(userId, skills);
    res.json(user);
  } catch (err) {
    handleError(res, err, 'Failed to update skills');
  }
}

async function createTeam(req, res) {
  const { userId, ...data } = req.body ?? {};
  if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ error: 'Valid userId required' });
  if (data.opportunityId && !mongoose.isValidObjectId(data.opportunityId)) {
    return res.status(400).json({ error: 'Invalid opportunityId' });
  }

  try {
    const team = await teamService.createTeam(userId, data);
    res.status(201).json(team);
  } catch (err) {
    handleError(res, err, 'Failed to create team');
  }
}

async function updateTeam(req, res) {
  const { id: teamId } = req.params;
  const { userId, ...data } = req.body ?? {};
  if (!mongoose.isValidObjectId(teamId)) return res.status(400).json({ error: 'Invalid ID' });
  if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ error: 'Valid userId required' });
  if (data.opportunityId && !mongoose.isValidObjectId(data.opportunityId)) {
    return res.status(400).json({ error: 'Invalid opportunityId' });
  }

  try {
    const team = await teamService.updateTeam(teamId, userId, data);
    res.json(team);
  } catch (err) {
    handleError(res, err, 'Failed to update team');
  }
}

async function deleteTeam(req, res) {
  const { id: teamId } = req.params;
  const { userId } = req.query;
  if (!mongoose.isValidObjectId(teamId)) return res.status(400).json({ error: 'Invalid ID' });
  if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ error: 'Valid userId required' });

  try {
    await teamService.deleteTeam(teamId, userId);
    res.status(204).end();
  } catch (err) {
    handleError(res, err, 'Failed to delete team');
  }
}

async function createRequest(req, res) {
  const { id: teamId } = req.params;
  const { userId, role, message, shareProfile } = req.body ?? {};
  if (!mongoose.isValidObjectId(teamId)) return res.status(400).json({ error: 'Invalid ID' });
  if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ error: 'Valid userId required' });

  try {
    const request = await teamService.createRequest(teamId, userId, { role, message, shareProfile });
    res.status(201).json(request);
  } catch (err) {
    handleError(res, err, 'Failed to send request');
  }
}

async function getIncomingRequests(req, res) {
  const { userId } = req.query;
  if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ error: 'Valid userId required' });

  try {
    const requests = await teamService.getIncomingRequests(userId);
    res.json(requests);
  } catch (err) {
    handleError(res, err, 'Failed to fetch incoming requests');
  }
}

async function getSentRequests(req, res) {
  const { userId } = req.query;
  if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ error: 'Valid userId required' });

  try {
    const requests = await teamService.getSentRequests(userId);
    res.json(requests);
  } catch (err) {
    handleError(res, err, 'Failed to fetch sent requests');
  }
}

async function respondToRequest(req, res) {
  const { id: requestId } = req.params;
  const { userId, status } = req.body ?? {};
  if (!mongoose.isValidObjectId(requestId)) return res.status(400).json({ error: 'Invalid ID' });
  if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ error: 'Valid userId required' });

  try {
    const request = await teamService.respondToRequest(requestId, userId, status);
    res.json(request);
  } catch (err) {
    handleError(res, err, 'Failed to answer request');
  }
}

async function withdrawRequest(req, res) {
  const { id: requestId } = req.params;
  const { userId } = req.query;
  if (!mongoose.isValidObjectId(requestId)) return res.status(400).json({ error: 'Invalid ID' });
  if (!mongoose.isValidObjectId(userId)) return res.status(400).json({ error: 'Valid userId required' });

  try {
    await teamService.withdrawRequest(requestId, userId);
    res.status(204).end();
  } catch (err) {
    handleError(res, err, 'Failed to withdraw request');
  }
}

module.exports = {
  getTeams,
  getMyTeams,
  getEvents,
  getProfile,
  updateSkills,
  createTeam,
  updateTeam,
  deleteTeam,
  createRequest,
  getIncomingRequests,
  getSentRequests,
  respondToRequest,
  withdrawRequest,
};
