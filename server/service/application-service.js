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
  const updatedApplication = await Application.findOneAndUpdate(
    { _id: id, userId: userId },
    {
      status: changes.status,
      notes: changes.notes,
      deadline: changes.deadline,
      interviewAt: changes.interviewAt,
      contactName: changes.contactName,
    },
    { returnDocument: 'after', runValidators: true },
  ).populate('opportunityId');
  return updatedApplication;
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
};
