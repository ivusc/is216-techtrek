import serverAPI from './serverAPI'

const BASE_URL = '/opportunity'

// filters: { sector, type, field } for jobs, empty values are left out
export async function fetchAllOpportunities(filters) {
  const response = await serverAPI.get(BASE_URL + '/all', { params: cleanFilters(filters) })
  return response.data
}

export async function fetchJobs(page, filters) {
  const response = await serverAPI.get(BASE_URL + '/jobs', { params: { page, ...cleanFilters(filters) } })
  return response.data
}

// the server rejects unknown values, so drop the empty "any" ones
function cleanFilters(filters = {}) {
  const params = {}
  if (filters.sector) params.sector = filters.sector
  if (filters.type) params.type = filters.type
  if (filters.field) params.field = filters.field
  return params
}

// the sectors and the roles in each one, for the Sector / Role dropdowns
export async function fetchJobFilterOptions() {
  const response = await serverAPI.get(BASE_URL + '/job-filters')
  return response.data
}

export async function saveOpportunitService(item) {
  const response = await serverAPI.post(BASE_URL, item)
  return response.data
}

export async function deleteOpportunityService(id) {
  await serverAPI.delete(BASE_URL + '/' + id)
}
