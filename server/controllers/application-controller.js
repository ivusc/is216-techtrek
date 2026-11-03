const mongoose = require('mongoose');
const applicationService = require('../service/application-service');

function handleError(res, err, fallback) {
  if (err.name === 'ValidationError' || err.name === 'CastError') {
    return res.status(400).json({ error: err.message });
  }
  if (err.code === 11000) return res.status(409).json({ error: 'Application already exists' });
  console.error(fallback, err.message);
  res.status(500).json({ error: fallback });
}

// POST /application  body: { opportunity, status?, notes?, deadline?, interviewAt?, contactName? }
// `opportunity` = the full listing object from /jobs or /hackathons. The user comes from the session.
async function createApplication(req, res) {
  const { opportunity, status, notes, deadline, interviewAt, contactName } = req.body ?? {};
  const userId = req.session.user._id;

  if (!opportunity) {
    return res.status(400).json({ error: 'Opportunity is required' });
  }

  try {
    const applicationDetails = { status, notes, deadline, interviewAt, contactName };
    const application = await applicationService.createApplication(userId, opportunity, applicationDetails);

    res.status(201).json(application);
  } catch (err) {
    handleError(res, err, 'Failed to create application');
  }
}

// GET /application?status=applied  (only the logged-in user's applications)
async function getApplications(req, res) {
  const { status } = req.query;
  const userId = req.session.user._id;

  try {
    const userApplications = await applicationService.getApplications(userId, status);

    res.json(userApplications);
  } catch (err) {
    handleError(res, err, 'Failed to fetch applications');
  }
}

// GET /application/:id
async function getApplication(req, res) {
  const { id: applicationId } = req.params;
  if (!mongoose.isValidObjectId(applicationId))
    return res.status(400).json({ error: 'Invalid ID' });

  try {
    const application = await applicationService.getApplicationById(applicationId, req.session.user._id);
    if (!application) return res.status(404).json({ error: 'Application not found' });
    res.json(application);
  } catch (err) {
    handleError(res, err, 'Failed to fetch application');
  }
}

// PATCH /application/:id  body: any of status, notes, deadline, interviewAt, contactName, checklist ([{ label, done }])
async function updateApplication(req, res) {
  const { id: applicationId } = req.params;
  const { status, notes, deadline, interviewAt, contactName, checklist } = req.body ?? {};

  if (!mongoose.isValidObjectId(applicationId)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }

  if (checklist !== undefined && !Array.isArray(checklist)) {
    return res.status(400).json({ error: 'checklist must be an array' });
  }

  try {
    const changes = { status, notes, deadline, interviewAt, contactName, checklist };
    const application = await applicationService.updateApplication(applicationId, req.session.user._id, changes);

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json(application);
  } catch (err) {
    handleError(res, err, 'Failed to update application');
  }
}

// DELETE /application/:id
async function deleteApplication(req, res) {
  const { id: applicationId } = req.params;
  if (!mongoose.isValidObjectId(applicationId)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }

  try {
    const deletedApplication = await applicationService.deleteApplication(applicationId, req.session.user._id);

    if (!deletedApplication) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.status(204).end();
  } catch (err) {
    handleError(res, err, 'Failed to delete application');
  }
}

module.exports = {
  createApplication,
  getApplications,
  getApplication,
  updateApplication,
  deleteApplication,
};
