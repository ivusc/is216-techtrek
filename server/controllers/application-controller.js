const mongoose = require('mongoose');
const applicationService = require('../service/application-service');
const notificationService = require('../service/notification-service');

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
  const { opportunity, status, result, notes, deadline, interviewAt, contactName } = req.body ?? {};
  const userId = req.session.user._id;

  if (!opportunity) {
    return res.status(400).json({ error: 'Opportunity is required' });
  }

  try {
    const applicationDetails = { status, result, notes, deadline, interviewAt, contactName };
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
  const { status, result, notes, deadline, interviewAt, contactName, checklist } = req.body ?? {};

  if (!mongoose.isValidObjectId(applicationId)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }

  if (checklist !== undefined && !Array.isArray(checklist)) {
    return res.status(400).json({ error: 'checklist must be an array' });
  }

  try {
    const changes = { status, result, notes, deadline, interviewAt, contactName, checklist };
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

    // its deadline reminders no longer make sense
    await notificationService.remove({ userId: req.session.user._id, applicationId: deletedApplication._id });

    res.status(204).end();
  } catch (err) {
    handleError(res, err, 'Failed to delete application');
  }
}

async function createReview(req, res) {
  const { id: applicationId } = req.params;
  const { difficulty, rounds, tips } = req.body ?? {};

  if (!mongoose.isValidObjectId(applicationId)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }

  try {
    const application = await applicationService.getApplicationById(applicationId, req.session.user._id);

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }
    if (application.status !== 'offer') {
      return res.status(409).json({ error: 'Move the application to Offer first.' });
    }
    if (application.review) {
      return res.status(409).json({ error: 'You already shared tips for this application.' });
    }

    res.status(201).json(await applicationService.addReview(application, { difficulty, rounds, tips }));
  } catch (err) {
    handleError(res, err, 'Failed to share the tips');
  }
}

// my application with tips already on it, or the error response to send (null when it was sent)
async function findReviewed(req, res) {
  const { id: applicationId } = req.params;
  if (!mongoose.isValidObjectId(applicationId)) {
    res.status(400).json({ error: 'Invalid ID' });
    return null;
  }
  const application = await applicationService.getApplicationById(applicationId, req.session.user._id);
  if (!application) {
    res.status(404).json({ error: 'Application not found' });
    return null;
  }
  if (!application.review) {
    res.status(404).json({ error: 'You have not shared tips for this application yet.' });
    return null;
  }
  return application;
}

// PUT /application/:id/review  body: { difficulty, rounds, tips } - edit my own tips
async function updateReview(req, res) {
  const { difficulty, rounds, tips } = req.body ?? {};
  try {
    const application = await findReviewed(req, res);
    if (!application) return;
    res.json(await applicationService.updateReview(application, { difficulty, rounds, tips }));
  } catch (err) {
    handleError(res, err, 'Failed to update the tips');
  }
}

// DELETE /application/:id/review - take my tips down
async function deleteReview(req, res) {
  try {
    const application = await findReviewed(req, res);
    if (!application) return;
    res.json(await applicationService.removeReview(application));
  } catch (err) {
    handleError(res, err, 'Failed to remove the tips');
  }
}

module.exports = {
  createApplication,
  getApplications,
  getApplication,
  updateApplication,
  deleteApplication,
  createReview,
  updateReview,
  deleteReview,
};
