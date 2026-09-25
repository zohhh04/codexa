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

export async function generateTAC(sourceCode, language = 'cpp') {
  const { data } = await api.post('/compiler/intermediate-code', { sourceCode, language });
  return data; // { success, data: { ast, symbols, instructions, diagnostics, stats } }
}

export async function analyzeFull(sourceCode, language = 'cpp') {
  const { data } = await api.post('/compiler/intermediate-code', { sourceCode, language });
  return data; // { success, data: { ast, symbols, instructions, diagnostics, stats } }
}

export async function runCode(sourceCode, language = 'cpp', stdin = '') {
  const { data } = await api.post('/run', { sourceCode, language, stdin });
  return data; // { success, data: { compile: {...}, run: {...} } }
}

export async function explainDiagnostic({ diagnostic, sourceCode, level = 'beginner' }) {
  const { data } = await api.post('/ai/explain', { diagnostic, sourceCode, level });
  return data; // { success, data: { explanation, fix, relatedConcepts, model, aiAvailable } }
}

export async function proposeFix({ diagnostic, sourceCode }) {
  const { data } = await api.post('/ai/fix', { diagnostic, sourceCode });
  return data; // { success, data: { description, diff, confidence, explanation, model, aiAvailable } }
}

export async function getTutorHint({ question, sourceCode, context = 'general' }) {
  const { data } = await api.post('/ai/tutor', { question, sourceCode, context });
  return data; // { success, data: { hint, concept, nextSteps, model, aiAvailable } }
}

export async function getAiStatus() {
  const { data } = await api.get('/ai/status');
  return data; // { success, data: { available } }
}

// --- Auth ---

export async function registerUser({ name, email, password }) {
  const { data } = await api.post('/auth/register', { name, email, password });
  return data;
}

export async function loginUser({ email, password }) {
  const { data } = await api.post('/auth/login', { email, password });
  return data;
}

export async function getMe() {
  const { data } = await api.get('/auth/me');
  return data;
}

export async function updateProfile({ name }) {
  const { data } = await api.patch('/auth/profile', { name });
  return data;
}

export async function changePassword({ currentPassword, newPassword }) {
  const { data } = await api.put('/auth/password', { currentPassword, newPassword });
  return data;
}

export async function deleteAccount() {
  const { data } = await api.delete('/auth/account');
  return data;
}

// --- Projects ---

export async function getProjects() {
  const { data } = await api.get('/projects');
  return data;
}

export async function createProject({ title, language, sourceCode }) {
  const { data } = await api.post('/projects', { title, language, sourceCode });
  return data;
}

export async function updateProject(id, fields) {
  const { data } = await api.put(`/projects/${id}`, fields);
  return data;
}

export async function deleteProject(id) {
  const { data } = await api.delete(`/projects/${id}`);
  return data;
}

// --- History ---

export async function getHistory() {
  const { data } = await api.get('/history');
  return data;
}

export async function saveHistory(entry) {
  const { data } = await api.post('/history', entry);
  return data;
}

export async function deleteHistory(id) {
  const { data } = await api.delete(`/history/${id}`);
  return data;
}

// --- AI Studio ---

export async function aiGenerate({ prompt, language }) {
  const { data } = await api.post('/ai/generate', { prompt, language });
  return data;
}

export async function aiExplainCode({ sourceCode, language, level }) {
  const { data } = await api.post('/ai/explain-code', { sourceCode, language, level });
  return data;
}

export async function aiDebug({ sourceCode, language, stdin }) {
  const { data } = await api.post('/ai/debug', { sourceCode, language, stdin });
  return data;
}

export async function aiOptimize({ sourceCode, language }) {
  const { data } = await api.post('/ai/optimize', { sourceCode, language });
  return data;
}

export async function aiTestcases({ prompt, count }) {
  const { data } = await api.post('/ai/testcases', { prompt, count });
  return data;
}

export async function aiLearn({ question }) {
  const { data } = await api.post('/ai/learn', { question });
  return data;
}

export async function aiHint({ problem, stage }) {
  const { data } = await api.post('/ai/hints', { problem, stage });
  return data;
}

// --- Problems / Judge ---

export async function getProblems(params = {}) {
  const { data } = await api.get('/problems', { params });
  return data;
}

export async function getProblem(id) {
  const { data } = await api.get(`/problems/${id}`);
  return data;
}

export async function submitProblem(id, { sourceCode, language }) {
  const { data } = await api.post(`/problems/${id}/submit`, { sourceCode, language });
  return data;
}

export async function judgeCode({ sourceCode, language, testcases }) {
  const { data } = await api.post('/judge', { sourceCode, language, testcases });
  return data;
}

// --- Dashboard / toolchain ---

export async function getDashboardStats() {
  const { data } = await api.get('/dashboard/stats');
  return data;
}

export async function getToolchainStatus() {
  const { data } = await api.get('/toolchain/status');
  return data;
}

// --- Practice ---

export async function getPracticeConcepts() {
  const { data } = await api.get('/practice/concepts');
  return data;
}

export async function generatePracticeQuestion(concept) {
  const { data } = await api.post('/practice/generate', { concept });
  return data;
}

export async function submitPracticeAnswer({ question, submittedAnswer }) {
  const { data } = await api.post('/practice/submit', {
    questionId: question.id,
    question,
    submittedAnswer,
  });
  return data;
}

export async function getPracticeAttempts() {
  const { data } = await api.get('/practice');
  return data;
}

export default api;
