const axios = require('axios');
const Opportunity = require('../models/Opportunity');

const RESULTS_PER_PAGE = 20;
const JOB_TYPES = {
  fulltime: { full_time: 1, what_exclude: 'intern internship' },
  intern: { title_only: 'intern' },
};

// TechTrek only lists IT jobs, so every search uses Adzuna's IT category.
const IT_CATEGORY = 'it-jobs';
// a role's `what_or` = the job matches if any of these keywords appear in the listing (sent to Adzuna).
// `match` = the words that tag a listing with this role on its card (checked in the title, then the
// description), so the tags use the same names as the Role filter.
const JOB_FIELDS = {
  frontend: { label: 'Frontend', what_or: 'frontend react vue angular', match: /\b(front[- ]?end|react|vue|angular)\b/i },
  backend: { label: 'Backend', what_or: 'backend django springboot golang nodejs .net', match: /\b(back[- ]?end|django|spring ?boot|golang|node\.?js)\b|\.net\b/i },
  fullstack: { label: 'Full-stack', what_or: 'fullstack full-stack frontend react vue angular backend django springboot golang nodejs .net', match: /\bfull[- ]?stack\b/i },
  data: { label: 'Data', what_or: 'analytics sql tableau etl pyspark', match: /\b(data|analytics?|sql|tableau|etl|pyspark|power ?bi)\b/i },
  ai: { label: 'AI / ML', what_or: 'ai llm pytorch tensorflow nlp', match: /\b(ai|llm|pytorch|tensorflow|nlp|machine learning|ml|artificial intelligence)\b/i },
  devops: { label: 'DevOps', what_or: 'devops kubernetes terraform sre', match: /\b(devops|kubernetes|terraform|sre|site reliability|cloud)\b/i },
  cybersecurity: { label: 'Cybersecurity', what_or: 'cybersecurity siem soc pentest', match: /\b(cyber ?security|security|siem|soc|pentest|penetration)\b/i },
  mobile: { label: 'Mobile', what_or: 'android ios flutter kotlin swift', match: /\b(android|ios|flutter|kotlin|swift|mobile)\b/i },
};
const MAX_ROLE_TAGS = 2;

// the roles a listing is for, as [{ key, label }]:
// 1. the role picked in the Role filter (Adzuna matched the listing on it)
// 2. the roles named in the title
// 3. only if the title names none: the one role the description mentions most (descriptions are noisy)
function jobRoles(job, field) {
  const found = [];
  const add = (key) => {
    if (key && !found.includes(key)) found.push(key);
  };
  if (JOB_FIELDS[field]) add(field);

  // listings use all sorts of dashes ("Full‑Stack"), so treat them all as a plain hyphen
  const clean = (text) => String(text ?? '').replace(/[\u2010-\u2015]/g, '-');
  const title = clean(job.title);
  const inTitle = Object.keys(JOB_FIELDS).filter((key) => JOB_FIELDS[key].match.test(title));

  if (inTitle.length > 0) {
    inTitle.forEach(add);
  } else {
    const description = clean(job.description);
    let best = null;
    let bestCount = 0;
    for (const key of Object.keys(JOB_FIELDS)) {
      const count = (description.match(new RegExp(JOB_FIELDS[key].match.source, 'gi')) ?? []).length;
      if (count > bestCount) {
        best = key;
        bestCount = count;
      }
    }
    add(best);
  }
  return found.slice(0, MAX_ROLE_TAGS).map((key) => ({ key, label: JOB_FIELDS[key].label }));
}

// what the Opportunities page needs to build its Role dropdown
function getJobFilterOptions() {
  return {
    roles: Object.entries(JOB_FIELDS).map(([key, role]) => ({ key, label: role.label })),
  };
}

// sortBy: 'date' for the newest first (Adzuna's default is relevance)
async function getJobs({ type, field, page, sortBy }) {
  const role = JOB_FIELDS[field];
  const response = await axios.get(`${process.env.JOB_API_URL}/jobs/sg/search/${page ?? 1}`, {
    params: {
      app_id: process.env.JOB_API_APP_ID,
      app_key: process.env.JOB_API_KEY,
      results_per_page: RESULTS_PER_PAGE,
      category: IT_CATEGORY,
      ...JOB_TYPES[type],
      ...(role ? { what_or: role.what_or } : {}),
      ...(sortBy ? { sort_by: sortBy } : {}),
    },
  });
  return {
    count: response.data.count,
    jobs: response.data.results.map((job) => normaliseJob(job, field)),
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

// field: the role picked in the Role filter (if any), so the listing is tagged with it
function normaliseJob(job, field) {
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
    roles: jobRoles(job, field),
  };
}

function parseDeadline(dates) {
  const [start, end] = dates?.split(' - ') ?? [];
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
    thumbnail: h.thumbnail_url?.replace(/^\/\//, 'https://') ?? null,
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
  JOB_TYPES,
  JOB_FIELDS,
  getJobFilterOptions,
  getJobs,
  getHackathons,
  normaliseJob,
  normaliseHackathon,
  findOrCreateOpportunity
};
