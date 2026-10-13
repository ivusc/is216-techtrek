// (an Adzuna id and a Devpost id could be the same number, so item.externalId alone is not enough for :key)
export function getKey(item) {
  return item.source + '-' + item.externalId
}

// days until the deadline, or null if there is no deadline (Adzuna jobs have none)
export function getDaysLeft(item) {
  if (!item.deadline) {
    return null
  }
  return Math.ceil((new Date(item.deadline) - new Date()) / 86400000)
}

export function getLocationGroup(item) {
  if (!item.location) {
    return 'Other'
  }
  const location = item.location.toLowerCase()
  if (location.includes('singapore')) {
    return 'Singapore'
  }
  if (location.includes('online') || location.includes('remote')) {
    return 'Online'
  }
  return 'Other'
}

export function getMonthlySalary(item) {
  if (!item.minSalary) {
    return 0
  }
  return Math.round(item.minSalary / 12)
}

//convert to price number only
export function getPrizeAmount(item) {
  if (!item.prize) {
    return 0
  }
  return Number(item.prize.replace(/[^0-9.]/g, ''))
}

//  "Paid only" filter (only hackathon with prize money, or job with a salary)
export function isPaid(item) {
  if (item.type === 'hackathon') {
    return getPrizeAmount(item) > 0
  }
  return getMonthlySalary(item) > 0
}

export function getUrgentText(item) {
  const days = getDaysLeft(item)
  if (days === null || days < 0 || days > 7) {
    return ''
  }
  if (days === 0) {
    return 'Closes today'
  }
  if (days === 1) {
    return '1 day left'
  }
  return days + ' days left'
}

// jobs have no deadline, so show when they were posted instead
export function getPostedText(item) {
  if (!item.postedAt) {
    return ''
  }
  const days = Math.floor((new Date() - new Date(item.postedAt)) / 86400000)
  if (days <= 0) {
    return 'Posted today'
  }
  if (days === 1) {
    return 'Posted 1 day ago'
  }
  return 'Posted ' + days + ' days ago'
}

export function getPlatform(item) {
  return item.source[0].toUpperCase() + item.source.slice(1)
}

export function getJobType(item) {
  const parts = []
  if (item.contractTime) {
    const time = item.contractTime.replace('_', ' ')
    parts.push(time[0].toUpperCase() + time.slice(1))
  }
  if (item.contractType) {
    parts.push(item.contractType[0].toUpperCase() + item.contractType.slice(1))
  }
  return parts.join(' · ')
}