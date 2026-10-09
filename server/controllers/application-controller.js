const mongoose = require('mongoose');
const Application = require('../models/Application');

function handleError(res, err, fallback) {
  if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
  if (err.code === 11000) return res.status(409).json({ error: 'Application already exists' });
  console.error(fallback, err.message);
  res.status(500).json({ error: fallback });
}

// POST /application  body: { userId, opportunityId, status?, notes?, deadline?, interviewAt?, contactName? }
async function createApplication(req, res) {
  const { userId, opportunityId, status, notes, deadline, interviewAt, contactName } =
    req.body ?? {};
  if (!mongoose.isValidObjectId(userId) || !mongoose.isValidObjectId(opportunityId))
    return res.status(400).json({ error: 'Valid userId and opportunityId required' });

  try {
    const application = await Application.create({
      userId,
      opportunityId,
      status,
      notes,
      deadline,
      interviewAt,
      contactName,
    });
    res.status(201).json(application);
  } catch (err) {
    handleError(res, err, 'Failed to create application');
  }
}

// GET /application?userId=...&status=applied
// ponytail: userId comes from the query until auth exists
async function getApplications(req, res) {
  const { userId, status } = req.query;
  if (!mongoose.isValidObjectId(userId))
    return res.status(400).json({ error: 'Valid userId required' });

  try {
    const filter = { userId, ...(status && { status }) };
    res.json(await Application.find(filter).populate('opportunityId').sort('-updatedAt'));
  } catch (err) {
    handleError(res, err, 'Failed to fetch applications');
  }
}

// GET /application/:id
async function getApplication(req, res) {
  if (!mongoose.isValidObjectId(req.params.id))
    return res.status(400).json({ error: 'Invalid ID' });

  try {
    const application = await Application.findById(req.params.id).populate('opportunityId');
    if (!application) return res.status(404).json({ error: 'Application not found' });
    res.json(application);
  } catch (err) {
    handleError(res, err, 'Failed to fetch application');
  }
}

// PATCH /application/:id  body: any of status, notes, deadline, interviewAt, contactName
async function updateApplication(req, res) {
  if (!mongoose.isValidObjectId(req.params.id))
    return res.status(400).json({ error: 'Invalid ID' });

  // userId / opportunityId are fixed once created
  const { status, notes, deadline, interviewAt, contactName } = req.body ?? {};

  try {
    const application = await Application.findByIdAndUpdate(
      req.params.id,
      { status, notes, deadline, interviewAt, contactName },
      { returnDocument: 'after', runValidators: true },
    );
    if (!application) return res.status(404).json({ error: 'Application not found' });
    res.json(application);
  } catch (err) {
    handleError(res, err, 'Failed to update application');
  }
}

// DELETE /application/:id
async function deleteApplication(req, res) {
  if (!mongoose.isValidObjectId(req.params.id))
    return res.status(400).json({ error: 'Invalid ID' });

  try {
    const deleted = await Application.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Application not found' });
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
