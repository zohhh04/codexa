import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((cfg) => {
  try {
    const token = localStorage.getItem('codexa_token');
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
  } catch {
    /* storage unavailable */
  }
  return cfg;
});

export async function getTokens(sourceCode, language = 'cpp') {
  const { data } = await api.post('/compiler/tokens', { sourceCode, language });
  return data;
}

export async function analyzeFull(sourceCode, language = 'cpp') {
  const { data } = await api.post('/compiler/intermediate-code', { sourceCode, language });
  return data;
}

export async function optimizeCode(sourceCode, language = 'cpp') {
  const { data } = await api.post('/compiler/optimize', { sourceCode, language });
  return data;
}

export async function runCode(sourceCode, language = 'cpp', stdin = '') {
  const { data } = await api.post('/run', { sourceCode, language, stdin });
  return data;
}

export async function getTutorHint({ question, sourceCode, language = 'cpp', diagnostics = [], context = 'general' }) {
  const { data } = await api.post('/ai/tutor', { question, sourceCode, language, diagnostics, context });
  return data;
}

export async function aiGenerate({ prompt, language }) {
  const { data } = await api.post('/ai/generate', { prompt, language });
  return data;
}

export async function getAiStatus() {
  const { data } = await api.get('/ai/status');
  return data;
}

export async function getToolchainStatus() {
  const { data } = await api.get('/toolchain/status');
  return data;
}

export default api;
