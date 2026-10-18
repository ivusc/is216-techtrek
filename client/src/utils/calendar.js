import { getApplicationDeadline } from './application'
import { toDateTimeInputValue } from './date'

// "YYYY-MM-DD" in local time, used to match events to calendar days
export function toDayKey(date) {
  return toDateTimeInputValue(date).slice(0, 10)
}

// turns one application into its calendar events: its deadline and/or its interview
// kind matches the event-* colour classes in tracker.css
export function getEventsFor(application) {
  const opportunity = application.opportunityId
  const events = []

  const deadline = getApplicationDeadline(application)
  if (deadline) {
    // internships use the same colour as jobs (the legend only has "Job deadline")
    let kind = opportunity.type
    if (kind === 'internship') {
      kind = 'job'
    }
    events.push({
      application,
      date: deadline,
      kind,
      shortLabel: opportunity.title,
      detail: 'Deadline'
    })
  }

  if (application.interviewAt) {
    events.push({
      application,
      date: application.interviewAt,
      kind: 'interview',
      shortLabel: opportunity.organisation + ' interview',
      detail: 'Interview'
    })
  }

  return events
}

// every event grouped by day: { 'YYYY-MM-DD': [event, ...] }, earliest first within a day
export function groupEventsByDay(applications) {
  const groups = {}

  for (const application of applications) {
    for (const event of getEventsFor(application)) {
      const dayKey = toDayKey(event.date)
      if (!groups[dayKey]) {
        groups[dayKey] = []
      }
      groups[dayKey].push(event)
    }
  }

  for (const dayKey in groups) {
    groups[dayKey].sort((a, b) => new Date(a.date) - new Date(b.date))
  }
  return groups
}

// getDay() is 0 for Sunday, so convert to "days since Monday" (Mon = 0 ... Sun = 6)
function getDaysSinceMonday(date) {
  return (date.getDay() + 6) % 7
}

export function getMonthGridDates(year, month) {
  const firstDay = new Date(year, month, 1)
  const gridStart = new Date(year, month, 1 - getDaysSinceMonday(firstDay))

  const lastDay = new Date(year, month + 1, 0)
  const gridEnd = new Date(year, month + 1, 6 - getDaysSinceMonday(lastDay))

  const dates = []
  const current = new Date(gridStart)
  while (current <= gridEnd) {
    dates.push(new Date(current))
    current.setDate(current.getDate() + 1)
  }
  return dates
}
