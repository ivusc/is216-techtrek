import axios from "axios";

const serverAPI = axios.create({
  baseURL : import.meta.env.VITE_SERVER_URL ?? 'http://localhost:8000',
  withCredentials: true
});

export default serverAPI;
