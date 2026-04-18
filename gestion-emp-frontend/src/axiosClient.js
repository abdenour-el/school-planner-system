import axios from 'axios';

// Create a custom Axios instance with the base URL of your Laravel API
const axiosClient = axios.create({
    baseURL: 'http://127.0.0.1:8000/api',
});

// Add a request interceptor to attach the Token to every request automatically
axiosClient.interceptors.request.use((config) => {
    // 1. Get the token from Local Storage
    const token = localStorage.getItem('auth_token');
    
    // 2. If token exists, attach it to the Authorization header
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
});

export default axiosClient;