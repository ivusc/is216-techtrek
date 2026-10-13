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