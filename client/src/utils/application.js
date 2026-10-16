// tracker: the deadline set on the application, else the listing's own deadline (null if neither)
export function getApplicationDeadline(application) {
  return application.deadline ?? application.opportunityId.deadline ?? null
}
