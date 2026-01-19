import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for auth tokens
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Token ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const electionsAPI = {
  getAll: () => api.get('/elections/'),
  getById: (id) => api.get(`/elections/${id}/`),
  getStatistics: (id) => api.get(`/elections/${id}/statistics/`),
  getTimeline: (id) => api.get(`/elections/${id}/timeline/`),
};

export const candidatesAPI = {
  getAll: (params) => api.get('/candidates/', { params }),
  getById: (id) => api.get(`/candidates/${id}/`),
  getResults: (id) => api.get(`/candidates/${id}/results/`),
};

export const resultsAPI = {
  getAll: (params) => api.get('/results/', { params }),
  getAggregate: (params) => api.get('/results/aggregate/', { params }),
};

export const constituenciesAPI = {
  getAll: (params) => api.get('/constituencies/', { params }),
  getById: (id) => api.get(`/constituencies/${id}/`),
  getResults: (id) => api.get(`/constituencies/${id}/results/`),
};

export const positionsAPI = {
  getAll: (params) => api.get('/positions/', { params }),
};

export const voterEducationAPI = {
  getAll: (params) => api.get('/voter-education/', { params }),
};

export const pollingStationsAPI = {
  getAll: (params) => api.get('/polling-stations/', { params }),
  getById: (id) => api.get(`/polling-stations/${id}/`),
};

// Citizen Reporting APIs
export const stationUpdatesAPI = {
  getAll: (params) => api.get('/station-updates/', { params }),
  getById: (id) => api.get(`/station-updates/${id}/`),
  create: (data) => api.post('/station-updates/', data),
  getLive: () => api.get('/station-updates/live/'),
  getStatistics: () => api.get('/station-updates/statistics/'),
  verify: (id, data) => api.post(`/station-updates/${id}/verify/`, data),
};

export const incidentsAPI = {
  getAll: (params) => api.get('/incidents/', { params }),
  getById: (id) => api.get(`/incidents/${id}/`),
  create: (data) => api.post('/incidents/', data),
  getCritical: () => api.get('/incidents/critical/'),
  getStatistics: () => api.get('/incidents/statistics/'),
  verify: (id, data) => api.post(`/incidents/${id}/verify/`, data),
  respond: (id, data) => api.post(`/incidents/${id}/respond/`, data),
};

export const verificationsAPI = {
  getAll: (params) => api.get('/verifications/', { params }),
};

export const profileAPI = {
  get: () => api.get('/profile/'),
  update: (data) => api.put('/profile/', data),
  requestOTP: (phoneNumber) => api.post('/profile/request_otp/', { phone_number: phoneNumber }),
  verifyOTP: (otpCode) => api.post('/profile/verify_otp/', { otp_code: otpCode }),
};

export const authAPI = {
  register: (data) => api.post('/auth/register/', data),
  login: (username, password) => api.post('/auth/login/', { username, password }),
  logout: () => api.post('/auth/logout/'),
  me: () => api.get('/auth/me/'),
  updateProfile: (data) => api.put('/auth/update-profile/', data),
  changePassword: (data) => api.post('/auth/change-password/', data),
};

// Media Upload APIs
export const mediaAPI = {
  getAll: (params) => api.get('/media/', { params }),
  getById: (id) => api.get(`/media/${id}/`),
  upload: (formData, onUploadProgress) => api.post('/media/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  }),
  getRecent: () => api.get('/media/recent/'),
  getVideos: () => api.get('/media/videos/'),
  getAudio: () => api.get('/media/audio/'),
  moderate: (id, data) => api.post(`/media/${id}/moderate/`, data),
};

// Live Streaming APIs
export const livestreamAPI = {
  getAll: (params) => api.get('/livestreams/', { params }),
  getById: (id) => api.get(`/livestreams/${id}/`),
  create: (data) => api.post('/livestreams/', data),
  getActive: () => api.get('/livestreams/active/'),
  start: (id) => api.post(`/livestreams/${id}/start/`),
  end: (id) => api.post(`/livestreams/${id}/end/`),
  heartbeat: (id, data) => api.post(`/livestreams/${id}/heartbeat/`, data),
  getStatistics: () => api.get('/livestreams/statistics/'),
};

// WebSocket URL helper
export const getWebSocketURL = (path) => {
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsHost = import.meta.env.VITE_WS_URL || 'localhost:8000';
  return `${wsProtocol}//${wsHost}/ws/${path}`;
};

export default api;
