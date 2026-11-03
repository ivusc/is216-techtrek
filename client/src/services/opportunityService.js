import serverAPI from './serverAPI'

const BASE_URL = '/opportunity'

// filters: { type, field } for jobs, empty values are left out
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
  if (filters.type) params.type = filters.type
  if (filters.field) params.field = filters.field
  return params
}

export async function saveOpportunitService(item) {
  const response = await serverAPI.post(BASE_URL, item)
  return response.data
}

export async function deleteOpportunityService(id) {
  await serverAPI.delete(BASE_URL + '/' + id)
}
