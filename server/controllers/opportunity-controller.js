const axios = require("axios");
const mongoose = require("mongoose");
const Opportunity = require("../models/Opportunity");

const RESULTS_PER_PAGE = 20;
const CATEGORY = "it-jobs";

// Adzuna has no "intern" contract type, so internships are matched by keyword
const TYPE_PARAMS = {
  fulltime: { full_time: 1, what_exclude: "intern internship" },
  intern: { what_or: "intern internship" },
};

function normaliseJob(job) {
  return {
    source: "adzuna",
    externalId: job.id,
    // ponytail: guessed from the title, Adzuna has no internship flag
    type: /intern/i.test(job.title) ? "internship" : "job",
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

// "May 18 - 19, 2026" | "May 15 - Jun 30, 2026" | "Mar 24, 2026 - Mar 24, 2030"
// -> end of the last day, UTC (ponytail: Devpost's real cutoff time/timezone isn't in the data)
function parseDeadline(dates) {
  const [start, end] = dates.split(" - ");
  if (!end) return null;
  const endDay = /^\d/.test(end) ? `${start.match(/^\w+/)[0]} ${end}` : end;
  const d = new Date(`${endDay} 23:59:59 UTC`);
  return isNaN(d) ? null : d;
}

function normaliseHackathon(h) {
  return {
    source: "devpost",
    externalId: String(h.id),
    type: "hackathon",
    title: h.title,
    organisation: h.organization_name,
    location: h.displayed_location,
    dates: h.submission_period_dates,
    deadline: parseDeadline(h.submission_period_dates),
    // prizeText looks like '$<span data-currency-value>500</span>'
    prize: h.prizeText.replace(/<[^>]*>/g, "").trim(),
    themes: h.themes.map((t) => t.name),
    url: h.url,
    // some thumbnails are protocol-relative ('//cdn...')
    thumbnail: h.thumbnail_url.startsWith("//")
      ? `https:${h.thumbnail_url}`
      : h.thumbnail_url,
    registrations: h.registrations_count,
    featured: h.featured,
  };
}

async function getJobs({ type, page }) {
  const response = await axios.get(
    `${process.env.JOB_API_URL}/jobs/sg/search/${page ?? 1}`,
    {
      params: {
        app_id: process.env.JOB_API_APP_ID,
        app_key: process.env.JOB_API_KEY,
        results_per_page: RESULTS_PER_PAGE,
        category: CATEGORY,
        ...TYPE_PARAMS[type],
      },
    },
  );
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

const isBadType = (type) => type && !TYPE_PARAMS[type];
const badTypeError = {
  error: `type must be one of: ${Object.keys(TYPE_PARAMS).join(", ")}`,
};

// GET /jobs?type=fulltime|intern&page=2
//type - omit type for all IT jobs; page - omit for first page
async function fetchJobs(req, res) {
  if (isBadType(req.query.type)) return res.status(400).json(badTypeError);

  try {
    res.json(await getJobs(req.query));
  } catch (err) {
    console.error("Job API error:", err.message);
    res.status(502).json({ error: "Failed to fetch jobs" });
  }
}

// GET /hackathons
async function fetchHackathons(req, res) {
  try {
    res.json(await getHackathons());
  } catch (err) {
    console.error("Hackathons API error:", err.message);
    res.status(502).json({ error: "Failed to fetch hackathons" });
  }
}

// GET /all?type=fulltime|intern&page=2 (type and page only apply to jobs)
async function fetchAll(req, res) {
  if (isBadType(req.query.type)) return res.status(400).json(badTypeError);

  // allSettled so one API being down doesn't blank the other; a failed source comes back as null
  const [jobs, hackathons] = await Promise.allSettled([
    getJobs(req.query),
    getHackathons(),
  ]);
  for (const r of [jobs, hackathons]) {
    if (r.status === "rejected")
      console.error("Opportunities API error:", r.reason.message);
  }
  if (jobs.status === "rejected" && hackathons.status === "rejected") {
    return res.status(502).json({ error: "Failed to fetch opportunities" });
  }

  res.json({ jobs: jobs.value ?? null, hackathons: hackathons.value ?? null });
}

// POST /opportunity  body: Opportunity fields (source, type, organisation, url, ...)
async function saveOpportunity(req, res) {
  const { _id, createdAt, updatedAt, ...data } = req.body ?? {};

  try {
    const opportunity = await Opportunity.create(data);

    res.status(201).json(opportunity);
  } catch (err) {
    // listing already saved (unique source + externalId), so return the existing one
    if (err.code === 11000) {
      return res.json(
        await Opportunity.findOne({
          source: data.source,
          externalId: data.externalId,
        }),
      );
    }

    if (err.name === "ValidationError")
      return res.status(400).json({ error: err.message });
    res.status(500).json({ error: "Failed to save opportunities" });
  }
}

// DELETE /opportunity/:id
async function deleteOpportunity(req, res) {
  if (!mongoose.isValidObjectId(req.params.id))
    return res.status(400).json({ error: "Invalid ID" });

  const deleted = await Opportunity.findByIdAndDelete(req.params.id);
  if (!deleted) return res.status(404).json({ error: "Opportunity not found" });
  res.status(204).end();
}

module.exports = {
  fetchJobs,
  fetchHackathons,
  fetchAll,
  saveOpportunity,
  deleteOpportunity,
};
