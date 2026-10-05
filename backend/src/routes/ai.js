/**
 * Codexa AI — /api/ai routes. Rate-limited, schema-validated AI endpoints.
 * All endpoints are offline-first: they work without AI_API_KEY via
 * deterministic templates/heuristics and report engine:'ai'|'offline'.
 */
const { Router } = require('express');
const { z } = require('zod');
const { ok, fail } = require('../utils/response');
const { explainDiagnostic } = require('../services/ai/explainService');
const { proposeFix } = require('../services/ai/fixService');
const { getTutorHint } = require('../services/ai/tutorService');
const { generateCode } = require('../services/ai/codegenService');
const { askConcept, getHint } = require('../services/ai/learnService');
const { isAvailable, getProvider } = require('../services/ai/client');

const router = Router();

// Simple in-memory rate limiter (per IP, 30 req/min for AI studio usage)
const rateBuckets = new Map();
function rateLimit(req, res, next) {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 60_000;
  const maxReqs = 30;

  if (!rateBuckets.has(ip)) rateBuckets.set(ip, []);
  const hits = rateBuckets.get(ip);
  // Prune old entries
  while (hits.length > 0 && hits[0] < now - windowMs) hits.shift();

  if (hits.length >= maxReqs) {
    return fail(res, 'Rate limit exceeded — max 30 AI requests per minute', 429);
  }
  hits.push(now);
  next();
}

// Cleanup every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - 60_000;
  for (const [ip, hits] of rateBuckets) {
    while (hits.length > 0 && hits[0] < cutoff) hits.shift();
    if (hits.length === 0) rateBuckets.delete(ip);
  }
}, 300_000).unref();

const diagnosticBody = z.object({
  diagnostic: z.object({
    phase: z.string(),
    source: z.string(),
    severity: z.enum(['error', 'warning', 'note']),
    code: z.string(),
    message: z.string(),
    line: z.number(),
    column: z.number(),
    endLine: z.number(),
    endColumn: z.number(),
  }),
  sourceCode: z
    .string({ error: 'sourceCode must be a string' })
    .min(1, 'sourceCode must not be empty')
    .max(200000, 'sourceCode too large'),
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional().default('beginner'),
});

const fixBody = z.object({
  diagnostic: z.object({
    phase: z.string(),
    source: z.string(),
    severity: z.enum(['error', 'warning', 'note']),
    code: z.string(),
    message: z.string(),
    line: z.number(),
    column: z.number(),
    endLine: z.number(),
    endColumn: z.number(),
  }),
  sourceCode: z
    .string({ error: 'sourceCode must be a string' })
    .min(1, 'sourceCode must not be empty')
    .max(200000, 'sourceCode too large'),
});

const tutorDiag = z.object({
  phase: z.string().optional().default('general'),
  severity: z.string().optional().default('info'),
  code: z.string().optional().default(''),
  message: z.string().optional().default(''),
  line: z.number().optional().default(0),
  column: z.number().optional().default(0),
}).passthrough();

const tutorBody = z.object({
  question: z
    .string({ error: 'question must be a string' })
    .min(1, 'question must not be empty')
    .max(5000, 'question too large'),
  sourceCode: z
    .string({ error: 'sourceCode must be a string' })
    .max(200000, 'sourceCode too large')
    .optional()
    .default(''),
  language: z.string().max(20).optional().default('cpp'),
  diagnostics: z.array(tutorDiag).max(50).optional().default([]),
  context: z.string().max(2000).optional().default('general'),
});

const LANG = z.enum(['cpp', 'c', 'java', 'python', 'javascript', 'js']);
const codeField = z.string().min(1, 'sourceCode must not be empty').max(200000, 'sourceCode too large');

// POST /api/ai/explain — explain a diagnostic
router.post('/explain', rateLimit, async (req, res) => {
  const parsed = diagnosticBody.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 'Invalid request body', 400, z.treeifyError(parsed.error));
  }
  try {
    const result = await explainDiagnostic(parsed.data);
    return ok(res, result);
  } catch (err) {
    return fail(res, `AI explain failed: ${err.message}`, 500);
  }
});

// POST /api/ai/fix — propose a fix for a diagnostic
router.post('/fix', rateLimit, async (req, res) => {
  const parsed = fixBody.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 'Invalid request body', 400, z.treeifyError(parsed.error));
  }
  try {
    const result = await proposeFix(parsed.data);
    return ok(res, result);
  } catch (err) {
    return fail(res, `AI fix failed: ${err.message}`, 500);
  }
});

// POST /api/ai/tutor — get a tutor hint
router.post('/tutor', rateLimit, async (req, res) => {
  const parsed = tutorBody.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 'Invalid request body', 400, z.treeifyError(parsed.error));
  }
  try {
    const result = await getTutorHint(parsed.data);
    return ok(res, result);
  } catch (err) {
    return fail(res, `AI tutor failed: ${err.message}`, 500);
  }
});

// POST /api/ai/generate — prompt -> code
router.post('/generate', rateLimit, async (req, res) => {
  const parsed = z.object({
    prompt: z.string().min(4, 'Describe the problem in a few words').max(5000),
    language: LANG.optional().default('cpp'),
  }).safeParse(req.body);
  if (!parsed.success) return fail(res, 'Invalid request body', 400, z.treeifyError(parsed.error));
  try {
    return ok(res, await generateCode(parsed.data));
  } catch (err) {
    return fail(res, `AI generate failed: ${err.message}`, 500);
  }
});

// POST /api/ai/learn — concept question -> explanation + example + practice
router.post('/learn', rateLimit, async (req, res) => {
  const parsed = z.object({
    question: z.string().min(3).max(5000),
  }).safeParse(req.body);
  if (!parsed.success) return fail(res, 'Invalid request body', 400, z.treeifyError(parsed.error));
  try {
    return ok(res, await askConcept(parsed.data));
  } catch (err) {
    return fail(res, `AI learn failed: ${err.message}`, 500);
  }
});

// POST /api/ai/hints — progressive Hint 1..4 for a problem
router.post('/hints', rateLimit, async (req, res) => {
  const parsed = z.object({
    problem: z.string().min(3).max(5000),
    stage: z.number().int().min(1).max(4).optional().default(1),
  }).safeParse(req.body);
  if (!parsed.success) return fail(res, 'Invalid request body', 400, z.treeifyError(parsed.error));
  try {
    return ok(res, await getHint(parsed.data));
  } catch (err) {
    return fail(res, `AI hints failed: ${err.message}`, 500);
  }
});

// GET /api/ai/status — check if AI is configured (and which provider)
router.get('/status', (req, res) => {
  const { provider, model } = getProvider();
  return ok(res, { available: isAvailable(), provider, model: isAvailable() ? model : null });
});

module.exports = router;
