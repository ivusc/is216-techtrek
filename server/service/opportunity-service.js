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
  fullstack: { what_or: 'fullstack full-stack frontend react vue angular backend django springboot golang nodejs .net' },
  backend: { what_or: 'backend django springboot golang nodejs .net' },
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

// Devpost's own API (HACKATHONS_API_URL=https://devpost.com/api/hackathons) gives 9 open hackathons per page,
// so read the first page, then the rest at the same time. Kept for 10 minutes so every page view
// does not make 6 calls to Devpost.
const MAX_HACKATHON_PAGES = 8;
const HACKATHON_CACHE_MS = 10 * 60 * 1000;
let hackathonCache = null; // { savedAt, result }

async function fetchHackathonPage(page) {
  const response = await axios.get(process.env.HACKATHONS_API_URL, {
    params: { 'status[]': 'open', page },
    headers: { 'User-Agent': 'TechTrek (SMU IS216 student project)' },
  });
  return response.data;
}

async function getHackathons() {
  if (hackathonCache && Date.now() - hackathonCache.savedAt < HACKATHON_CACHE_MS) {
    return hackathonCache.result;
  }

  const firstPage = await fetchHackathonPage(1);
  const perPage = firstPage.meta?.per_page || firstPage.hackathons.length || 1;
  const pageCount = Math.min(Math.ceil((firstPage.meta?.total_count ?? 0) / perPage), MAX_HACKATHON_PAGES);

  const otherPages = [];
  for (let page = 2; page <= pageCount; page++) {
    otherPages.push(fetchHackathonPage(page));
  }
  // one page failing should not lose the others
  const results = await Promise.allSettled(otherPages);

  const all = [...firstPage.hackathons];
  for (const result of results) {
    if (result.status === 'fulfilled') all.push(...result.value.hackathons);
  }

  // the same hackathon can move between pages while we read them, so keep each id once
  const seen = new Set();
  const hackathons = [];
  for (const h of all) {
    if (!seen.has(h.id)) {
      seen.add(h.id);
      hackathons.push(normaliseHackathon(h));
    }
  }

  const result = { count: hackathons.length, hackathons };
  hackathonCache = { savedAt: Date.now(), result };
  return result;
}

function removeOrganisationFromTitle(title, organisation) {
  const dashIndex = Math.max(title.lastIndexOf(' - '), title.lastIndexOf(' - '));
  if (!organisation || dashIndex === -1) return title;

  const ending = title.slice(dashIndex + 3).trim().toLowerCase();
  return ending.startsWith(organisation.trim().toLowerCase()) ? title.slice(0, dashIndex).trim() : title;
}

function normaliseJob(job) {
  const organisation = job.company?.display_name?.trim() ?? null;
  return {
    source: 'adzuna',
    externalId: job.id,
    type: /intern/i.test(job.title) ? 'internship' : 'job', //check if substring intern is inside job title
    title: removeOrganisationFromTitle(job.title, organisation),
    organisation,
    location: job.location?.display_name ?? null,
    description: job.description,
    url: job.redirect_url,
    minSalary: job.salary_min ?? null,
    maxSalary: job.salary_max ?? null,
    salaryIsPredicted: String(job.salary_is_predicted) === '1', // Adzuna estimated the salary, the listing did not give one
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
    // Devpost sends { icon, location }; older copies of the list sent plain text
    location: typeof h.displayed_location === 'object' ? h.displayed_location?.location : h.displayed_location,
    dates: h.submission_period_dates,
    deadline: parseDeadline(h.submission_period_dates),
    prize: (h.prize_amount ?? h.prizeText ?? '').replace(/<[^>]*>/g, '').trim(), //extract only the price
    themes: (h.themes ?? []).map((t) => t.name),
    url: h.url,
    thumbnail: h.thumbnail_url?.startsWith('//') ? `https:${h.thumbnail_url}` : h.thumbnail_url,
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
