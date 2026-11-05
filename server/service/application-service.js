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
    statusHistory: [{ status: details.status ?? 'saved', at: new Date() }],
  });

  return application.populate('opportunityId');
}

// userId makes sure people can only see, change or delete their own applications
async function getApplicationById(id, userId) {
  const application = await Application.findOne({ _id: id, userId: userId }).populate('opportunityId');
  return application;
}

// finished cards move to History 14 days after their last step
const ARCHIVE_AFTER_MS = 14 * 24 * 60 * 60 * 1000;

// when the card last moved to a new step (older cards have no history, so their last update is used)
function lastStepAt(application) {
  const steps = application.statusHistory ?? [];
  return steps.length > 0 ? steps[steps.length - 1].at : application.updatedAt;
}

// Newest first; only filter by status when one is given.
// Finished cards that have sat for 14 days are moved to History on the way (there is no background job).
async function getApplications(userId, status, now = new Date()) {
  const filter = { userId: userId };
  if (status) {
    filter.status = status;
  }

  const applications = await Application.find(filter)
    .populate('opportunityId')
    .sort('-updatedAt');

  const due = applications.filter(
    (application) =>
      !application.archivedAt &&
      Application.FINISHED_STATUSES.includes(application.status) &&
      now - new Date(lastStepAt(application)) >= ARCHIVE_AFTER_MS,
  );
  if (due.length > 0) {
    // timestamps: false, so archiving doesn't count as an update to the card
    await Application.updateMany(
      { _id: { $in: due.map((application) => application._id) } },
      { archivedAt: now },
      { timestamps: false },
    );
    for (const application of due) application.archivedAt = now;
  }
  return applications;
}

const EDITABLE_FIELDS = ['status', 'result', 'notes', 'deadline', 'interviewAt', 'contactName', 'checklist', 'followedUpAt', 'archivedAt'];

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
    // a new step: remember it and when it happened (older cards start their history here)
    if (changes.status !== application.status) {
      const steps = application.statusHistory ?? [];
      application.set('statusHistory', [...steps, { status: changes.status, at: new Date() }]);
      // moving a card to an unfinished step brings it back to the board
      if (!Application.FINISHED_STATUSES.includes(changes.status)) next.archivedAt = null;
    }
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
    { status: 'team', $push: { statusHistory: { status: 'team', at: new Date() } } },
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
