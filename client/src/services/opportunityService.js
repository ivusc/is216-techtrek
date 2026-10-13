import axios from 'axios'

const BASE_URL = (import.meta.env.VITE_SERVER_URL ?? 'http://localhost:8000') + '/opportunity'

// all jobs + hackathons
export async function fetchAllOpportunities() {
  const response = await axios.get(BASE_URL + '/all')
  return response.data
}

// next page of Adzuna jobs
export async function fetchJobsPage(page) {
  const response = await axios.get(BASE_URL + '/jobs?page=' + page)
  return response.data
}

// saves one opportunity to the database, returns it
export async function saveOpportunity(item) {
  const response = await axios.post(BASE_URL, item)
  return response.data
}

export async function deleteOpportunity(id) {
  await axios.delete(BASE_URL + '/' + id)
}
