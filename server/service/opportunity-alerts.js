const User = require('../models/User');
const Notification = require('../models/Notification');
const opportunityService = require('./opportunity-service');
const { listingSkillsMatched } = require('./skills');

// how often one person's matches are checked (each check reads the latest jobs and hackathons)
const CHECK_EVERY_MS = 6 * 60 * 60 * 1000;
// the latest jobs are shared by everyone and kept for 30 minutes, so Adzuna is not asked on every check
const JOBS_CACHE_MS = 30 * 60 * 1000;
// how many already-announced listings are remembered per person
const MAX_SEEN = 500;
const MAX_SKILLS_NAMED = 3;

let jobsCache = null; // { savedAt, jobs }

async function latestJobs() {
  if (jobsCache && Date.now() - jobsCache.savedAt < JOBS_CACHE_MS) return jobsCache.jobs;
  const { jobs } = await opportunityService.getJobs({ page: 1, sortBy: 'date' });
  jobsCache = { savedAt: Date.now(), jobs };
  return jobs;
}

// for tests: forget the cached jobs
function clearCache() {
  jobsCache = null;
}

const keyOf = (listing) => `${listing.source}:${listing.externalId}`;

// Adds one "N new hackathons and M new jobs match your skills" notification when open listings mention
// the user's skills and they haven't been told about them before. Like deadline reminders, it runs when
// notifications are loaded (there is no background job), at most every 6 hours per person.
// One source failing (Adzuna or Devpost) still checks the other. Errors never break the bell.
async function sendMatchAlerts(userId, now = new Date()) {
  try {
    const user = await User.findById(userId).select('skills matchAlertsCheckedAt +matchAlertsSeen');
    if (!user || user.skills.length === 0) return;
    if (user.matchAlertsCheckedAt && now - user.matchAlertsCheckedAt < CHECK_EVERY_MS) return;

    // claim this check first, so two bells loading at once don't both announce the same listings
    const claimed = await User.updateOne(
      { _id: userId, matchAlertsCheckedAt: user.matchAlertsCheckedAt ?? { $exists: false } },
      { matchAlertsCheckedAt: now },
    );
    if (claimed.modifiedCount === 0) return;

    const [jobs, hackathons] = await Promise.allSettled([
      latestJobs(),
      opportunityService.getHackathons().then((result) => result.hackathons),
    ]);
    const listings = [
      ...(jobs.status === 'fulfilled' ? jobs.value : []),
      ...(hackathons.status === 'fulfilled' ? hackathons.value : []),
    ];

    const seen = new Set(user.matchAlertsSeen ?? []);
    const fresh = [];
    const skillsHit = [];
    for (const listing of listings) {
      if (seen.has(keyOf(listing))) continue;
      const matched = listingSkillsMatched(listing, user.skills);
      if (matched.length === 0) continue;
      fresh.push(listing);
      for (const skill of matched) if (!skillsHit.includes(skill)) skillsHit.push(skill);
    }
    if (fresh.length === 0) return;

    const hackathonCount = fresh.filter((listing) => listing.type === 'hackathon').length;
    await Notification.create({
      userId,
      type: 'new-matches',
      jobCount: fresh.length - hackathonCount,
      hackathonCount,
      skills: skillsHit.slice(0, MAX_SKILLS_NAMED),
    });

    const remembered = [...(user.matchAlertsSeen ?? []), ...fresh.map(keyOf)].slice(-MAX_SEEN);
    await User.updateOne({ _id: userId }, { matchAlertsSeen: remembered });
  } catch (err) {
    console.error('Could not check for new matching opportunities', err);
  }
}

module.exports = { sendMatchAlerts, clearCache, CHECK_EVERY_MS };
