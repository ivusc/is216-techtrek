const mongoose = require('mongoose');
const Opportunity = require('../models/Opportunity');
const opportunityService = require('../service/opportunity-service');

function handleError(res, err, fallback) {
  console.error(fallback, err.message);
  res.status(500).json({ error: fallback });
}

// Returns an error message if type or field is not a known preset, otherwise null
function validateJobFilters({ type, field }) {
  const { JOB_TYPES, JOB_FIELDS } = opportunityService;

  if (type && !Object.hasOwn(JOB_TYPES, type)) {
    return `type must be one of: ${Object.keys(JOB_TYPES).join(', ')}`;
  }

  if (field && !Object.hasOwn(JOB_FIELDS, field)) {
    return `field must be one of: ${Object.keys(JOB_FIELDS).join(', ')}`;
  }

  return null;
}

// GET /opportunity/job-filters - the IT roles, for the Opportunities page Role dropdown
function fetchJobFilterOptions(req, res) {
  res.json(opportunityService.getJobFilterOptions());
}

// GET /jobs?type=fulltime|intern&field=frontend|backend|...&page=2 (always IT jobs)
// type - omit for all IT jobs; field - omit for every tech field; page - omit for first page
async function fetchJobs(req, res) {
  const { type, field, page } = req.query;

  const filterError = validateJobFilters({ type, field });

  if (filterError) {
    return res.status(400).json({ error: filterError });
  }

  try {
    const jobs = await opportunityService.getJobs({ type, field, page });
    res.json(jobs);
  } catch (err) {
    handleError(res, err, 'Failed to fetch jobs.');
  }
}

// GET /hackathons
async function fetchHackathons(req, res) {
  try {
    const hackathons = await opportunityService.getHackathons();
    res.json(hackathons);
  } catch (err) {
    handleError(res, err, 'Failed to fetch hackathons.');
  }
}

// GET /all?type=fulltime|intern&field=frontend&page=2 (type, field and page only apply to jobs)
async function fetchAll(req, res) {
  const { type, field, page } = req.query;

  const filterError = validateJobFilters({ type, field });
  if (filterError) {
    return res.status(400).json({ error: filterError });
  }

  // Fetch both at the same time; one failing should not block the other
  const [jobsResult, hackathonsResult] = await Promise.allSettled([
    opportunityService.getJobs({ type, field, page }),
    opportunityService.getHackathons(),
  ]);

  let jobs = null;
  if (jobsResult.status === 'fulfilled') {
    jobs = jobsResult.value;
  } else {
    console.error('Failed to fetch jobs:', jobsResult.reason.message);
  }

  let hackathons = null;
  if (hackathonsResult.status === 'fulfilled') {
    hackathons = hackathonsResult.value;
  } else {
    console.error('Failed to fetch hackathons:', hackathonsResult.reason.message);
  }

  if (jobs === null && hackathons === null) {
    return res.status(502).json({ error: 'Failed to fetch opportunities' });
  }

  res.json({ jobs, hackathons });
}

// POST /opportunity/share  body: { opportunity } - the listing being shared, as the Opportunities page has it.
// Jobs and hackathons come live from Adzuna and Devpost and can't be looked up by id later, so a copy is
// saved (the same copy tracking uses) and its id makes the link: /opportunities/<id>
async function shareOpportunity(req, res) {
  const { opportunity } = req.body ?? {};
  if (!opportunity || typeof opportunity !== 'object') {
    return res.status(400).json({ error: 'opportunity is required' });
  }
  try {
    const saved = await opportunityService.findOrCreateOpportunity(opportunity);
    res.status(201).json({ _id: saved._id });
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
    handleError(res, err, 'Failed to share opportunity.');
  }
}

// GET /opportunity/item/:id - one saved listing, for a shared link
async function fetchOpportunity(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Opportunity not found' });
  try {
    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) return res.status(404).json({ error: 'Opportunity not found' });
    res.json(opportunity);
  } catch (err) {
    handleError(res, err, 'Failed to fetch opportunity.');
  }
}

module.exports = {
  fetchJobs,
  fetchJobFilterOptions,
  fetchHackathons,
  fetchAll,
  shareOpportunity,
  fetchOpportunity,
};
