import { getDaysLeft } from "./opportunity";
import { trackerStages, hackathonStages } from "@/constants";

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
