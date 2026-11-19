import axios from 'axios';
import { encryptPayload, decryptPayload } from './crypto';

// Dynamically determine the backend API URL for ANY host, domain, or subfolder
const getBaseApiUrl = () => {
  if (window.__API_URL__) {
    return window.__API_URL__;
  }
  if (import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Auto-detect from current window location
  const pathname = window.location.pathname || '';
  
  // Strip off /frontend/dist, /myadmin, /index.html, trailing slash
  const cleanBase = pathname
    .replace(/\/frontend\/dist.*$/i, '')
    .replace(/\/myadmin.*$/i, '')
    .replace(/\/index\.(html|php).*$/i, '')
    .replace(/\/+$/, '');

  // Backend is always located at <cleanBase>/backend/public/api
  return `${cleanBase}/backend/public/api`;
};

const api = axios.create({
  baseURL: getBaseApiUrl(),
  headers: {
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'X-Accept-Encrypted': 'true',
  },
});

// Request Interceptor: Attach Auth Token and optional encryption
api.interceptors.request.use(
  (config) => {
    const adminToken = localStorage.getItem('token');
    const studentToken = localStorage.getItem('student_token');

    let token = null;
    if (config.url && config.url.includes('/student/')) {
      token = studentToken;
    } else {
      token = adminToken;
    }

    if (token) {
      // Send standard header AND fallback headers for Apache / PHP-FPM / cPanel / aaPanel
      config.headers.Authorization = `Bearer ${token}`;
      config.headers['X-Authorization'] = `Bearer ${token}`;
      config.headers['X-Auth-Token'] = token;
    }

    // Encrypt sensitive JSON post/put bodies (skip multipart FormData for file uploads)
    if (
      config.encrypt === true &&
      config.data &&
      !(config.data instanceof FormData) &&
      (config.method === 'post' || config.method === 'put')
    ) {
      config.headers['X-Payload-Encrypted'] = 'true';
      config.data = { _payload: encryptPayload(config.data) };
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Decrypt encrypted payloads and handle global errors
api.interceptors.response.use(
  (response) => {
    if (response.data && response.data._encrypted === true && response.data.payload) {
      try {
        response.data = decryptPayload(response.data.payload);
      } catch (err) {
        console.error('Failed to decrypt response from server:', err);
      }
    }
    return response;
  },
  (error) => {
    // Decrypt error payload if server encrypted the error response
    if (error.response?.data && error.response.data._encrypted === true && error.response.data.payload) {
      try {
        error.response.data = decryptPayload(error.response.data.payload);
      } catch (e) {
        console.error('Failed to decrypt error response:', e);
      }
    }

    if (error.response && error.response.status === 401) {
      const isLoginRequest = error.config?.url && error.config.url.includes('/auth/login');
      
      // Do not clear tokens or reload if it was just an invalid password attempt during login
      if (!isLoginRequest) {
        if (error.config?.url && error.config.url.includes('/student/')) {
          localStorage.removeItem('student_token');
          localStorage.removeItem('student_user');
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          if (window.location.hash.includes('myadmin') || window.location.pathname.includes('myadmin')) {
            window.location.reload();
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

export const getStorageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:') || path.startsWith('data:')) {
    return path;
  }
  const clean = path.replace(/^\/+/, '').replace(/^storage\//, '');
  const baseApi = getBaseApiUrl().replace(/\/+$/, '');
  return `${baseApi}/media/${clean}`;
};

export default api;
