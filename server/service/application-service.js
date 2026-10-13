const Application = require('../models/Application');
const opportunityService = require('./opportunity-service');

//Save the opportunity or get existing and link it to a new application
async function createApplication(userId, opportunity, details) {
  const savedOpportunity = await opportunityService.findOrCreateOpportunity(opportunity);

  const application = await Application.create({
    userId: userId,
    opportunityId: savedOpportunity._id,
    status: details.status,
    notes: details.notes,
    deadline: details.deadline,
    interviewAt: details.interviewAt,
    contactName: details.contactName,
  });

  return application;
}

async function getApplicationById(id) {
  const application = await Application.findById(id).populate('opportunityId');
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

async function updateApplication(id, changes) {
  const updatedApplication = await Application.findByIdAndUpdate(
    id,
    {
      status: changes.status,
      notes: changes.notes,
      deadline: changes.deadline,
      interviewAt: changes.interviewAt,
      contactName: changes.contactName,
    },
    { returnDocument: 'after', runValidators: true },
  );
  return updatedApplication;
}

async function deleteApplication(id) {
  const deletedApplication = await Application.findByIdAndDelete(id);
  return deletedApplication;
}

module.exports = {
  createApplication,
  getApplicationById,
  getApplications,
  updateApplication,
  deleteApplication,
};
