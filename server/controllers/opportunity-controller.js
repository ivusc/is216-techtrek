const mongoose = require('mongoose');
const Opportunity = require('../models/Opportunity');
const opportunityService = require('../service/opportunity-service');

function handleError(res, err, fallback) {
  if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
  console.error(fallback, err.message);
  res.status(500).json({ error: fallback });
}

// Returns an error message if type or field is not a known preset, otherwise null
function validateJobFilters({ type, field, sector }) {
  const { JOB_TYPES, SECTORS, DEFAULT_SECTOR } = opportunityService;

  if (type && !Object.hasOwn(JOB_TYPES, type)) {
    return `type must be one of: ${Object.keys(JOB_TYPES).join(', ')}`;
  }

  if (sector && !Object.hasOwn(SECTORS, sector)) {
    return `sector must be one of: ${Object.keys(SECTORS).join(', ')}`;
  }

  // a role only makes sense inside its own sector
  const roles = SECTORS[sector || DEFAULT_SECTOR].roles;
  if (field && !Object.hasOwn(roles, field)) {
    return `field must be one of: ${Object.keys(roles).join(', ') || '(none for this sector)'}`;
  }

  return null;
}

// GET /opportunity/job-filters - the sectors and their roles, for the Opportunities page dropdowns
function fetchJobFilterOptions(req, res) {
  res.json(opportunityService.getJobFilterOptions());
}

// GET /jobs?sector=tech|finance|...|all&type=fulltime|intern&field=<a role of that sector>&page=2 (sector defaults to tech)
// type - omit for all IT jobs; field - omit for every tech field; page - omit for first page
async function fetchJobs(req, res) {
  const { type, field, page, sector } = req.query;

  const filterError = validateJobFilters({ type, field, sector });

  if (filterError) {
    return res.status(400).json({ error: filterError });
  }

  try {
    const jobs = await opportunityService.getJobs({ type, field, page, sector });
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

// GET /all?sector=finance&type=fulltime|intern&field=audit&page=2 (sector, type, field and page only apply to jobs)
async function fetchAll(req, res) {
  const { type, field, page, sector } = req.query;

  const filterError = validateJobFilters({ type, field, sector });
  if (filterError) {
    return res.status(400).json({ error: filterError });
  }

  // Fetch both at the same time; one failing should not block the other
  const [jobsResult, hackathonsResult] = await Promise.allSettled([
    opportunityService.getJobs({ type, field, page, sector }),
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

// POST /opportunity  body: Opportunity fields (source, type, organisation, url, ...)
async function saveOpportunity(req, res) {
  const opportunity = req.body;

  if (!opportunity) {
    return res.status(400).json({ error: 'Opportunity is required' });
  }

  try {
    const savedOpportunity = await opportunityService.findOrCreateOpportunity(opportunity);

    res.status(201).json(savedOpportunity);
  } catch (err) {
    handleError(res, err, 'Failed to save opportunity.');
  }
}

// DELETE /opportunity/:id
async function deleteOpportunity(req, res) {
  if (!mongoose.isValidObjectId(req.params.id))
    return res.status(400).json({ error: 'Invalid ID' });

  const deleted = await Opportunity.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Opportunity not found' });

  res.status(204).end();
}

module.exports = {
  fetchJobs,
  fetchJobFilterOptions,
  fetchHackathons,
  fetchAll,
  saveOpportunity,
  deleteOpportunity,
};
