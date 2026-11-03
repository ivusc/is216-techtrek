import serverAPI from './serverAPI'

// the server works out the user from the login session, so no userId is sent
const BASE_URL = '/application'

export async function fetchAllApplications(){
  const response = await serverAPI.get(BASE_URL);
  return response.data;
}

export async function createApplicationService(payload){
  const response = await serverAPI.post(BASE_URL,{
    opportunity: payload,
    status: 'saved',
    notes: 'Saved via techtrek.'
  });

  return response.data;
}

// tracker's "Add application" form: details = { status, deadline, notes }
export async function addApplicationService(opportunity, details){
  const response = await serverAPI.post(BASE_URL, {
    opportunity,
    ...details
  });
  return response.data;
}

// one application with its opportunity filled in (POST only sends back the opportunity's id)
export async function fetchApplicationService(id){
  const response = await serverAPI.get(`${BASE_URL}/${id}`);
  return response.data;
}

export async function updateApplicationService(id, payload){
  const response = await serverAPI.patch(`${BASE_URL}/${id}`,payload);
  return response.data;
}

export async function deleteApplicationService(id){
  const response = await serverAPI.delete(`${BASE_URL}/${id}`);
  return response.data;
}
