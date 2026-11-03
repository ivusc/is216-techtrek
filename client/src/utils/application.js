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
  return application.deadline ?? application.opportunityId.deadline ?? null
}

export function isDueThisWeek(application) {
  const daysLeft = getDaysLeft({ deadline: getApplicationDeadline(application) });
  return daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
}

export function isOverdue(application) {
  const daysLeft = getDaysLeft({ deadline: getApplicationDeadline(application) });
  return daysLeft !== null && daysLeft < 0;
}