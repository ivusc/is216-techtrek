import { getDaysLeft } from "./opportunity";

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