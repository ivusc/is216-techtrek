import axios from 'axios'

const BASE_URL = (import.meta.env.VITE_SERVER_URL ?? 'http://localhost:8000') + '/opportunity'

export async function fetchAllOpportunities() {
  const response = await axios.get(BASE_URL + '/all')
  return response.data
}

export async function fetchJobs(page) {
  const response = await axios.get(BASE_URL + '/jobs?page=' + page)
  return response.data
}

export async function saveOpportunitService(item) {
  const response = await axios.post(BASE_URL, item)
  return response.data
}

export async function deleteOpportunityService(id) {
  await axios.delete(BASE_URL + '/' + id)
}
