import axios from 'axios'

const BASE_URL = (import.meta.env.VITE_SERVER_URL ?? 'http://localhost:8000') + '/application'

//TODO: CHANGE THIS TO DYNAMIC USERID
const USERID = '665f1c2e8b3a4d0012a1b2c4';

export async function fetchAllApplications(){
  const response = await axios.get(BASE_URL, {
    params: {
      userId: USERID
    }
  });
  console.log(response.data)
  return response.data;
}

export async function createApplicationService(payload){
  const response = await axios.post(BASE_URL,{
    userId: USERID,
    opportunity: payload,
    status: 'saved',
    notes: 'Saved via techtrek.'
  });

  return response.data;
}

// tracker's "Add application" form: details = { status, deadline, notes }
export async function addApplicationService(opportunity, details){
  const response = await axios.post(BASE_URL, {
    userId: USERID,
    opportunity,
    ...details
  });
  return response.data;
}

// one application with its opportunity filled in (POST only sends back the opportunity's id)
export async function fetchApplicationService(id){
  const response = await axios.get(`${BASE_URL}/${id}`);
  return response.data;
}

export async function updateApplicationService(id, payload){
  const response = await axios.patch(`${BASE_URL}/${id}`,payload);
  return response.data;
}

export async function deleteApplicationService(id){
  const response = await axios.delete(`${BASE_URL}/${id}`);
  return response.data;
}