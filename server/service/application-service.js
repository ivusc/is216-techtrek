const Application = require('../models/Application');
const opportunityService = require('./opportunity-service');

//Save the opportunity or get existing and link it to a new application
// a hackathon can't be "interview" and a job can't be "submitted": throws a 400-style error if the step doesn't fit
function checkStatusFits(status, opportunityType) {
  if (status === undefined) return;
  const allowed = Application.statusesFor(opportunityType);
  if (!allowed.includes(status)) {
    const error = new Error(`A ${opportunityType} can be: ${allowed.join(', ')}`);
    error.name = 'ValidationError';
    throw error;
  }
}

async function createApplication(userId, opportunity, details) {
  const savedOpportunity = await opportunityService.findOrCreateOpportunity(opportunity);
  checkStatusFits(details.status, savedOpportunity.type);

  const application = await Application.create({
    userId: userId,
    opportunityId: savedOpportunity._id,
    status: details.status,
    result: details.status === 'results' ? details.result : undefined,
    notes: details.notes,
    deadline: details.deadline,
    interviewAt: details.interviewAt,
    contactName: details.contactName,
    appliedAt: details.status === 'applied' ? new Date() : undefined,
  });

  return application.populate('opportunityId');
}

// userId makes sure people can only see, change or delete their own applications
async function getApplicationById(id, userId) {
  const application = await Application.findOne({ _id: id, userId: userId }).populate('opportunityId');
  return application;
}

// Newest first; only filter by status when one is given
async function getApplications(userId, status) {
  const filter = { userId: userId };
  if (status) {
    filter.status = status;
  }

  const applications = await Application.find(filter)
    .populate('opportunityId')
    .sort('-updatedAt');
  return applications;
}

const EDITABLE_FIELDS = ['status', 'result', 'notes', 'deadline', 'interviewAt', 'contactName', 'checklist', 'followedUpAt'];

// one read (with the listing) and one save. Each trip to the database costs about 0.2 s on Atlas,
// so this no longer reads the card twice.
async function updateApplication(id, userId, changes) {
  const application = await Application.findOne({ _id: id, userId: userId }).populate('opportunityId');
  if (!application) return null;

  const next = { ...changes };
  // check the new step against the listing's type; the result only belongs to the Results step
  if (changes.status !== undefined) {
    checkStatusFits(changes.status, application.opportunityId?.type);
    if (changes.status !== 'results') next.result = null;
    // moving to Applied starts the follow-up clock again
    if (changes.status === 'applied' && application.status !== 'applied') application.set('appliedAt', new Date());
  }
  for (const field of EDITABLE_FIELDS) {
    if (next[field] !== undefined) application.set(field, next[field]);
  }
  await application.save();
  return application;
}

// called when someone creates or joins a team for a hackathon: their tracker card moves to "Team formed"
// (only from Saved or Registered, so a later step like Submitted is never moved back)
async function markTeamFormed(userId, opportunityId) {
  if (!opportunityId) return;
  await Application.updateOne(
    { userId, opportunityId, status: { $in: ['saved', 'registered'] } },
    { status: 'team' },
  );
}

async function addReview(application, review) {
  application.review = review;
  return application.save();
}

// the author edits their tips: keep when they were first shared, note when they changed
async function updateReview(application, review) {
  application.review = { ...review, createdAt: application.review.createdAt, updatedAt: new Date() };
  return application.save();
}

async function removeReview(application) {
  application.review = undefined;
  return application.save();
}

async function deleteApplication(id, userId) {
  const deletedApplication = await Application.findOneAndDelete({ _id: id, userId: userId });
  return deletedApplication;
}

module.exports = {
  createApplication,
  getApplicationById,
  getApplications,
  updateApplication,
  deleteApplication,
  markTeamFormed,
  addReview,
  updateReview,
  removeReview,
};
