// how each kind of notification reads, which icon it gets and where clicking it goes
export function describeNotification(notification) {
  const who = notification.actorName || 'Someone'
  const team = notification.teamName || 'your team'
  const asRole = notification.role ? ` as ${notification.role}` : ''

  switch (notification.type) {
    case 'request-received':
      return { text: `${who} asked to join ${team}${asRole}`, icon: 'bi-person-raised-hand', tone: 'primary', to: { path: '/teams', query: { tab: 'requests' } } }
    case 'request-accepted':
      return { text: `You're in! ${who} accepted you into ${team}${asRole}`, icon: 'bi-check-circle-fill', tone: 'success', to: { path: '/teams', query: { tab: 'mine' } } }
    case 'request-declined':
      return { text: `${team} can't take you this time`, icon: 'bi-x-circle', tone: 'muted', to: { path: '/teams', query: { tab: 'browse' } } }
    case 'invite-received':
      return { text: `${who} invited you to join ${team}${asRole}`, icon: 'bi-envelope-heart', tone: 'primary', to: { path: '/teams', query: { tab: 'browse' } } }
    case 'invite-accepted':
      return { text: `${who} accepted your invite to ${team}${asRole}`, icon: 'bi-person-check-fill', tone: 'success', to: { path: '/teams', query: { tab: 'mine' } } }
    case 'invite-declined':
      return { text: `${who} declined your invite to ${team}`, icon: 'bi-person-dash', tone: 'muted', to: { path: '/teams', query: { tab: 'mine' } } }
    case 'member-joined':
      return { text: `${who} joined ${team}${asRole}`, icon: 'bi-people-fill', tone: 'success', to: { path: '/teams', query: { tab: 'mine' } } }
    case 'member-left':
      return { text: `${who} left ${team}`, icon: 'bi-box-arrow-left', tone: 'warning', to: { path: '/teams', query: { tab: 'mine' } } }
    case 'team-deleted':
      return { text: `${team} was deleted by its team lead`, icon: 'bi-trash3', tone: 'muted', to: { path: '/teams', query: { tab: 'browse' } } }
    case 'role-offered':
      return { text: `${who} would take you into ${team} as ${notification.role || 'another role'}. Join in that role?`, icon: 'bi-arrow-left-right', tone: 'primary', to: { path: '/teams', query: { tab: 'browse' } } }
    case 'role-assigned':
      return { text: `${who} made you ${notification.role || 'a new role'} in ${team}`, icon: 'bi-person-badge', tone: 'primary', to: { path: '/teams', query: { tab: 'mine' } } }
    case 'team-full':
      return {
        text: notification.about === 'invite'
          ? `${team} filled up before you answered the invite`
          : `${team} filled up, so your request was closed`,
        icon: 'bi-people', tone: 'muted', to: { path: '/teams', query: { tab: 'browse' } }
      }
    case 'team-closed':
      return {
        text: notification.about === 'invite'
          ? `${team} stopped taking new members, so your invite was closed`
          : `${team} stopped taking new members, so your request was closed`,
        icon: 'bi-calendar-x', tone: 'muted', to: { path: '/teams', query: { tab: 'browse' } }
      }
    case 'deadline-reminder': {
      // e.g. "Frontend Intern at Acme is due in 3 days"; 1 day left means within the next 24 hours
      const what = notification.title || 'A tracked application'
      const at = withOrganisation(notification.title, notification.organisation)
      const soon = notification.daysLeft > 1
      const when = soon ? `in ${notification.daysLeft} days` : 'within 24 hours'
      return { text: `${what}${at} is due ${when}`, icon: 'bi-alarm', tone: soon ? 'primary' : 'warning', to: { path: '/tracker' } }
    }
    default:
      return { text: 'Something happened in one of your teams', icon: 'bi-bell', tone: 'muted', to: { path: '/teams' } }
  }
}

// " at Acme", left out when there is no organisation or the title already names it
// (e.g. "Girls Who Code HHS Hackathon 2026" from Girls Who Code HHS)
export function withOrganisation(title, organisation) {
  if (!organisation) return ''
  if (title && title.toLowerCase().includes(organisation.toLowerCase())) return ''
  return ` at ${organisation}`
}

// how long until a deadline, for the reminder card: "in 3 days", "in 5 hours", "in under an hour",
// or "Deadline passed"
export function timeLeftText(deadline, now = new Date()) {
  const ms = new Date(deadline) - now
  if (ms <= 0) return 'Deadline passed'
  const hours = Math.floor(ms / 3600000)
  if (hours < 1) return 'in under an hour'
  if (hours < 24) return hours === 1 ? 'in 1 hour' : `in ${hours} hours`
  const days = Math.floor(hours / 24)
  return days === 1 ? 'in 1 day' : `in ${days} days`
}
