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
  });

  return application;
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

async function updateApplication(id, userId, changes) {
  // check the new step against the listing's type; the result only belongs to the Results step
  let result = changes.result;
  if (changes.status !== undefined) {
    const current = await Application.findOne({ _id: id, userId: userId }).populate('opportunityId', 'type');
    if (!current) return null;
    checkStatusFits(changes.status, current.opportunityId?.type);
    if (changes.status !== 'results') result = null;
  }

  const updatedApplication = await Application.findOneAndUpdate(
    { _id: id, userId: userId },
    {
      status: changes.status,
      result: result,
      notes: changes.notes,
      deadline: changes.deadline,
      interviewAt: changes.interviewAt,
      contactName: changes.contactName,
      checklist: changes.checklist,
    },
    { returnDocument: 'after', runValidators: true },
  ).populate('opportunityId');
  return updatedApplication;
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
};
