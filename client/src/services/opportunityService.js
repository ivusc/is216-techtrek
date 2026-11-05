import serverAPI from './serverAPI'

const BASE_URL = '/opportunity'

// filters: { type, field } for jobs, empty values are left out
export async function fetchAllOpportunities(filters) {
  const response = await serverAPI.get(BASE_URL + '/all', { params: cleanFilters(filters) })
  return response.data
}

export async function fetchHackathons() {
  const response = await serverAPI.get(BASE_URL + '/hackathons')
  return response.data.hackathons
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

// the IT roles, for the Role dropdown
export async function fetchJobFilterOptions() {
  const response = await serverAPI.get(BASE_URL + '/job-filters')
  return response.data
}

// anonymous interview tips from seniors who got an offer at this company (same role first)
export async function fetchTipsForOpportunity(organisation, title) {
  const response = await serverAPI.get('/interview/tips', { params: { organisation, title } })
  return response.data.tips
}

// saves a copy of a listing so it has a link that keeps working: returns its id for /opportunities/<id>
export async function shareOpportunity(opportunity) {
  const response = await serverAPI.post(BASE_URL + '/share', { opportunity })
  return response.data._id
}

// one shared listing, by the id from its link
export async function fetchOpportunity(id) {
  const response = await serverAPI.get(BASE_URL + '/item/' + id)
  return response.data
}
