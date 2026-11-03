
export function getDisplayName(user) {
  return user?.displayName || user?.userName || 'Unknown'
}

export function getInitials(name) {
  const parts = String(name).split(/[\s._-]+/).filter((part) => part !== '')
  if (parts.length === 0) {
    return '?'
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

const avatarColours = [
  { background: 'var(--bs-primary)', color: '#fff' },
  { background: 'var(--bs-info-bg-subtle)', color: 'var(--bs-primary-text-emphasis)' },
  { background: 'var(--bs-danger-bg-subtle)', color: 'var(--bs-danger-text-emphasis)' },
  { background: 'var(--tt-peach)', color: 'var(--bs-body-color)' }
]

export function getAvatarStyle(name) {
  let total = 0
  for (const letter of String(name)) {
    total += letter.charCodeAt(0)
  }
  return avatarColours[total % avatarColours.length]
}

export function getSchoolLine(user) {
  const parts = []
  if (user?.year) {
    parts.push('Y' + user.year)
  }
  if (user?.course) {
    parts.push(user.course)
  }
  if (user?.faculty) {
    parts.push(user.faculty)
  }
  return parts.join(' ')
}

export function getSlotsText(team) {
  if (team.slotsOpen === 0) {
    return 'Full'
  }
  return team.slotsOpen + (team.slotsOpen === 1 ? ' slot open' : ' slots open')
}

export function timeAgo(dateString) {
  const minutes = Math.floor((new Date() - new Date(dateString)) / 60000)
  if (minutes < 1) {
    return 'just now'
  }
  if (minutes < 60) {
    return minutes + 'm ago'
  }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) {
    return hours + 'h ago'
  }
  const days = Math.floor(hours / 24)
  if (days === 1) {
    return 'Yesterday'
  }
  return days + ' days ago'
}

export function sameSkill(a, b) {
  return a.toLowerCase() === b.toLowerCase()
}

export function getMatchingSkills(mySkills, teamSkills) {
  return mySkills.filter((mine) => teamSkills.some((wanted) => sameSkill(mine, wanted)))
}

export function getEventBadgeClass(eventName) {
  let total = 0
  for (const letter of String(eventName)) {
    total += letter.charCodeAt(0)
  }
  return total % 2 === 0 ? 'bg-tt-peach text-body' : 'bg-info-subtle text-primary-emphasis'
}

export function joinWithAnd(items) {
  if (items.length <= 1) {
    return items.join('')
  }
  return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1]
}

export function getClosesInDays(team) {
  if (!team.closesAt) {
    return null
  }
  return Math.ceil((new Date(team.closesAt) - new Date()) / 86400000)
}
