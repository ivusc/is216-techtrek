// formatDate: "2026-10-24T23:59:59Z" -> "24 Oct"
export function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })
}

// formatDateTime: "2026-10-18T15:59:00Z" -> "18 Oct 2026, 11:59 pm"
export function formatDateTime(dateString) {
  return new Date(dateString).toLocaleString('en-SG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}
// formatTime: "2026-10-14T06:00:00Z" -> "2:00 pm"
export function formatTime(dateString) {
  return new Date(dateString).toLocaleTimeString('en-SG', { hour: 'numeric', minute: '2-digit' })
}

// toDateTimeInputValue: "2026-10-14T06:00:00Z" -> "2026-10-14T14:00"
export function toDateTimeInputValue(dateString) {
  if (!dateString) {
    return ''
  }
  const date = new Date(dateString)
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}
