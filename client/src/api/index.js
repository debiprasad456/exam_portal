import axios from 'axios';

const RENDER_BACKEND_URL = 'https://exam-portal-server-tliz.onrender.com';

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    ? RENDER_BACKEND_URL
    : 'http://localhost:5000');

const api = axios.create({
  baseURL: `${SERVER_URL}/api`,
  timeout: 60000,
});

// Attach JWT for admin routes
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Auth ───
export const checkAdminExists = () => api.get('/auth/admin-exists');
export const adminSetup = (email, password) => api.post('/auth/setup', { email, password });
export const adminLogin = (email, password) => api.post('/auth/login', { email, password });
export const verifyToken = () => api.get('/auth/verify');

// ─── Admin: Questions ───
export const getAdminQuestions = (subject = '') =>
  api.get('/admin/questions', { params: subject ? { subject } : {} });
export const createQuestion = (data) => api.post('/admin/questions', data);
export const updateQuestion = (id, data) => api.put(`/admin/questions/${id}`, data);
export const deleteQuestion = (id) => api.delete(`/admin/questions/${id}`);

// ─── Admin: Exam ───
export const getAdminExamStatus = () => api.get('/admin/exam/status');
export const startExam = (subjects, duration) =>
  api.post('/admin/exam/start', { subjects, duration });
export const stopExam = (subject) => api.post('/admin/exam/stop', { subject });

// ─── Admin: Results & Stats ───
export const getResults = (subject = '') =>
  api.get('/admin/results', { params: subject ? { subject } : {} });
export const deleteResult = (id) => api.delete(`/admin/results/${id}`);
export const getStats = () => api.get('/admin/stats');

// ─── Candidate ───
export const registerCandidate = (data) => api.post('/candidate/register', data);
export const getCandidateQuestions = (subject) => api.get(`/candidate/questions/${subject}`);
export const getExamStatus = () => api.get('/candidate/exam-status');
export const getCandidateSession = (candidateId) => api.get(`/candidate/candidate-session/${candidateId}`);
export const cleanupCandidate = (candidateId) => api.delete(`/candidate/cleanup/${candidateId}`);
export const submitExam = (data) => api.post('/candidate/submit', data);

export default api;
