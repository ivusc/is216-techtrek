import { getApplicationDeadline } from './application'
import { toDateTimeInputValue } from './date'

// "YYYY-MM-DD" in local time, used to match events to calendar days
export function toDayKey(date) {
  return toDateTimeInputValue(date).slice(0, 10)
}

// turns one application into its calendar events: its deadline and/or its interview
export function getEventsFor(application) {
  const opportunity = application.opportunityId
  if (!opportunity) {
    return []
  }
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


function toIcsDate(date) {
  // "2026-10-24T15:59:00.000Z" -> "20261024T155900Z"
  return new Date(date).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function escapeIcsText(text) {
  //escape backslash, semicolons and commas
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

export function buildIcsFile(applications) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TechTrek//Tracker//EN']
  const now = toIcsDate(new Date())

  //go thru applications, add in each event
  for (const application of applications) {
    for (const event of getEventsFor(application)) {
      const start = new Date(event.date)
      const end = new Date(start.getTime() + 30 * 60 * 1000)
      const opportunity = application.opportunityId

      //one item per event
      lines.push(
        'BEGIN:VEVENT',
        'UID:' + application._id + '-' + event.detail.toLowerCase() + '@techtrek',
        'DTSTAMP:' + now,
        'DTSTART:' + toIcsDate(start),
        'DTEND:' + toIcsDate(end),
        'SUMMARY:' + escapeIcsText(event.detail + ': ' + opportunity.title),
        'DESCRIPTION:' + escapeIcsText(opportunity.organisation ?? ''),
        'END:VEVENT'
      )
    }
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}
