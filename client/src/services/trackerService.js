import axios from 'axios'

const BASE_URL = (import.meta.env.VITE_SERVER_URL ?? 'http://localhost:8000') + '/application'

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

export async function updateApplicationStatus(id, payload){
  const response = await axios.patch(`${BASE_URL}/${id}`,payload);
  return response.data;
}