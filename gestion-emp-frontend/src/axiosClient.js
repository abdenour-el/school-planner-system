import axios from 'axios';

// ==========================================
// AXIOS CLIENT CONFIGURATION
// ==========================================
// Base configuration for all HTTP requests to the Laravel API
const axiosClient = axios.create({
  baseURL: 'http://127.0.0.1:8000/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

export default axiosClient;