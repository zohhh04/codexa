import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('codexa_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem('codexa_token');
      localStorage.removeItem('codexa_user');
    }
    return Promise.reject(err);
  },
);

export async function getHealth() {
  const { data } = await api.get('/health');
  return data;
}

export async function getTokens(sourceCode, language = 'cpp') {
  const { data } = await api.post('/compiler/tokens', { sourceCode, language });
  return data; // { success, data: { tokens, diagnostics, stats } }
}

export async function analyzeSource(sourceCode, language = 'cpp') {
  const { data } = await api.post('/compiler/ast', { sourceCode, language });
  return data; // { success, data: { ast, symbols, diagnostics, stats } }
}

export default api;
