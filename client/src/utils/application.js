import { getDaysLeft } from "./opportunity";
import { trackerStages, hackathonStages, hackathonResults } from "@/constants";
import { formatDate } from "./date";

// hackathons and competitions have their own tracker steps
export function isEventType(type) {
  return type === 'hackathon' || type === 'competition'
}

// the tracker columns for an opportunity type
export function stagesFor(type) {
  return isEventType(type) ? hackathonStages : trackerStages
}

// "team" -> "Team formed"; looks in both lists so any status gets its label
export function getStageLabel(status) {
  return [...trackerStages, ...hackathonStages].find((stage) => stage.status === status)?.label ?? status
}

// tracker: the deadline set on the application, else the listing's own deadline (null if neither)
export function getApplicationDeadline(application) {
  return application.deadline ?? application.opportunityId?.deadline ?? null
}

export function isDueThisWeek(application) {
  const daysLeft = getDaysLeft({ deadline: getApplicationDeadline(application) });
  return daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
}

export function isOverdue(application) {
  const daysLeft = getDaysLeft({ deadline: getApplicationDeadline(application) });
  return daysLeft !== null && daysLeft < 0;
}
// how long an Applied card can sit with no news before TechTrek suggests following up
export const FOLLOW_UP_AFTER_DAYS = 14

// follow-up nudge: { days, followedUp } when an Applied application has had no update for 14+ days
// (counted from when it moved to Applied, or from the last "Followed up"), else null
export function getFollowUpNudge(application, now = new Date()) {
  if (application.status !== 'applied') return null
  const appliedAt = application.appliedAt ?? application.updatedAt ?? application.createdAt
  const followedUp = Boolean(application.followedUpAt)
  const since = followedUp && new Date(application.followedUpAt) > new Date(appliedAt) ? application.followedUpAt : appliedAt
  if (!since) return null
  const days = Math.floor((now - new Date(since)) / 86400000)
  return days >= FOLLOW_UP_AFTER_DAYS ? { days, followedUp } : null
}

// a link that opens the Tracker with this application's details already open, e.g. /tracker?open=a1
export function trackerLink(applicationId) {
  return applicationId ? { path: '/tracker', query: { open: String(applicationId) } } : { path: '/tracker' }
}

// --- History: cards that have left the board ---

export function isArchived(application) {
  return Boolean(application.archivedAt)
}

// when the card last moved to a new step (older cards without a history use their last update)
export function lastStepAt(application) {
  const steps = application.statusHistory ?? []
  return steps.length > 0 ? steps[steps.length - 1].at : application.updatedAt
}

// how it ended, as a badge: Offer, Rejected, Won / Finalist / Took part, or the step it stopped at
export function historyOutcome(application) {
  if (application.status === 'offer') return { label: 'Offer', css: 'bg-success-subtle text-success-emphasis' }
  if (application.status === 'rejected') return { label: 'Rejected', css: 'bg-body-secondary text-body-secondary' }
  if (application.status === 'results') {
    const result = hackathonResults.find((option) => option.value === application.result)
    return result ? { label: result.label, css: result.css } : { label: 'Finished', css: 'bg-info-subtle text-primary-emphasis' }
  }
  return { label: 'Stopped at ' + getStageLabel(application.status), css: 'bg-body-secondary text-body-secondary' }
}

// "Applied 3 Oct → Interview 20 Oct → Offer 12 Nov" (Saved is left out unless it is the only step)
export function historyTimeline(application) {
  const steps = application.statusHistory ?? []
  const shown = steps.length > 1 ? steps.filter((step) => step.status !== 'saved') : steps
  if (shown.length === 0) return getStageLabel(application.status) + ' ' + formatDate(application.updatedAt)
  return shown.map((step) => getStageLabel(step.status) + ' ' + formatDate(step.at)).join(' → ')
}

// newest month first: [{ key: '2026-11', label: 'November 2026', items }], each month newest first
export function groupByMonth(applications) {
  const sorted = [...applications].sort((a, b) => new Date(lastStepAt(b)) - new Date(lastStepAt(a)))
  const groups = []
  for (const application of sorted) {
    const date = new Date(lastStepAt(application))
    const key = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0')
    let group = groups.find((item) => item.key === key)
    if (!group) {
      group = { key, label: date.toLocaleDateString('en-SG', { month: 'long', year: 'numeric' }), items: [] }
      groups.push(group)
    }
    group.items.push(application)
  }
  return groups
}

// the numbers at the top of History
export function historySummary(applications) {
  const reached = (application, status) =>
    application.status === status || (application.statusHistory ?? []).some((step) => step.status === status)
  const events = applications.filter((application) => isEventType(application.opportunityId?.type))
  return {
    total: applications.length,
    interviews: applications.filter((application) => reached(application, 'interview')).length,
    offers: applications.filter((application) => application.status === 'offer').length,
    events: events.length,
  }
}
