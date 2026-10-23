const axios = require('axios');
const Opportunity = require('../models/Opportunity');

const RESULTS_PER_PAGE = 20;
const CATEGORY = 'it-jobs';
const JOB_TYPES = {
  fulltime: { full_time: 1, what_exclude: 'intern internship' },
  intern: { title_only: 'intern' },
};

// `what_or` = job matches if any of these keywords appear in the listing
const JOB_FIELDS = {
  frontend: { what_or: 'frontend react vue angular' },
  backend: { what_or: 'backend django springboot golang nodejs' },
  data: { what_or: 'analytics sql tableau etl pyspark' },
  ai: { what_or: 'ai llm pytorch tensorflow nlp' },
  devops: { what_or: 'devops kubernetes terraform sre' },
  cybersecurity: { what_or: 'cybersecurity siem soc pentest' },
  mobile: { what_or: 'android ios flutter kotlin swift' },
};

async function getJobs({ type, field, page }) {
  const response = await axios.get(`${process.env.JOB_API_URL}/jobs/sg/search/${page ?? 1}`, {
    params: {
      app_id: process.env.JOB_API_APP_ID,
      app_key: process.env.JOB_API_KEY,
      results_per_page: RESULTS_PER_PAGE,
      category: CATEGORY,
      ...JOB_TYPES[type],
      ...JOB_FIELDS[field],
    },
  });
  return {
    count: response.data.count,
    jobs: response.data.results.map(normaliseJob),
  };
}

async function getHackathons() {
  const response = await axios.get(process.env.HACKATHONS_API_URL);
  return {
    count: response.data.hackathons.length,
    hackathons: response.data.hackathons.map(normaliseHackathon),
  };
}

function normaliseJob(job) {
  return {
    source: 'adzuna',
    externalId: job.id,
    type: /intern/i.test(job.title) ? 'internship' : 'job', //check if substring intern is inside job title
    title: job.title,
    organisation: job.company?.display_name ?? null,
    location: job.location?.display_name ?? null,
    description: job.description,
    url: job.redirect_url,
    minSalary: job.salary_min ?? null,
    maxSalary: job.salary_max ?? null,
    contractTime: job.contract_time ?? null,
    contractType: job.contract_type ?? null,
    postedAt: job.created,
  };
}

function parseDeadline(dates) {
  const [start, end] = dates.split(' - ');
  if (!end) return null;
  const endDay = /^\d/.test(end) ? `${start.match(/^\w+/)[0]} ${end}` : end;
  const d = new Date(`${endDay} 23:59:59 UTC`); //set to end of day
  return isNaN(d) ? null : d;
}

function normaliseHackathon(h) {
  return {
    source: 'devpost',
    externalId: String(h.id),
    type: 'hackathon',
    title: h.title,
    organisation: h.organization_name,
    location: h.displayed_location,
    dates: h.submission_period_dates,
    deadline: parseDeadline(h.submission_period_dates),
    prize: h.prizeText.replace(/<[^>]*>/g, '').trim(), //extract only the price
    themes: h.themes.map((t) => t.name),
    url: h.url,
    thumbnail: h.thumbnail_url.startsWith('//') ? `https:${h.thumbnail_url}` : h.thumbnail_url,
    registrations: h.registrations_count,
    featured: h.featured,
  };
}

// Save a listing, or return the existing one (unique source + externalId)
async function findOrCreateOpportunity(payload) {
  const {
    source,
    externalId,
    type,
    title,
    organisation,
    location,
    description,
    url,
    minSalary,
    maxSalary,
    deadline,
    maxTeamSize,
  } = payload;

  try {
    return await Opportunity.create({
      source,
      externalId,
      type,
      title,
      organisation,
      location,
      description,
      url,
      minSalary,
      maxSalary,
      deadline,
      maxTeamSize,
    });
  } catch (err) {
    if (err.code !== 11000) throw err;
    return Opportunity.findOne({ source, externalId });
  }
}

module.exports = { 
  RESULTS_PER_PAGE,
  CATEGORY,
  JOB_TYPES,
  JOB_FIELDS,
  getJobs,
  getHackathons,
  normaliseJob,
  normaliseHackathon,
  findOrCreateOpportunity
};
