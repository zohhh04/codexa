/**
 * Problems + Judge API.
 * GET  /api/problems            — list (filters: category, difficulty, search)
 * GET  /api/problems/:id        — full problem (templates + testcases)
 * POST /api/problems/:id/submit — judge solution, save submission (auth)
 * GET  /api/problems/:id/submissions — my submissions for a problem (auth)
 * POST /api/judge               — one-off judge without saving (auth)
 */
const express = require('express');
const { z } = require('zod');
const { authenticate } = require('../middleware/auth');
const { listProblems, getProblem } = require('../services/practice/dsaBank');
const { judge } = require('../services/ai/judgeService');
const Submission = require('../models/Submission');

const router = express.Router();

router.get('/problems', (req, res) => {
  const { category, difficulty, search } = req.query;
  return res.json({ success: true, data: listProblems({ category, difficulty, search }) });
});

router.get('/problems/:id', (req, res) => {
  const p = getProblem(req.params.id);
  if (!p) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Problem not found' } });
  return res.json({ success: true, data: p });
});

const submitSchema = z.object({
  sourceCode: z.string().min(1).max(200000),
  language: z.enum(['cpp', 'c', 'java', 'python', 'javascript', 'js']).default('cpp'),
});

router.post('/problems/:id/submit', authenticate, async (req, res, next) => {
  try {
    const p = getProblem(req.params.id);
    if (!p) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Problem not found' } });
    const parsed = submitSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.issues } });
    }
    const lang = parsed.data.language === 'js' ? 'javascript' : parsed.data.language;
    const verdict = await judge({ sourceCode: parsed.data.sourceCode, language: lang, testcases: p.testcases });
    const timeMs = verdict.results.reduce((s, r) => s + (r.timeMs || 0), 0);
    const sub = await Submission.create({
      userId: req.user.id,
      problemId: p.id,
      language: lang,
      sourceCode: parsed.data.sourceCode,
      verdict: verdict.overall,
      passed: verdict.passed,
      total: verdict.total,
      timeMs,
    });
    res.status(201).json({ success: true, data: { submission: sub, verdict } });
  } catch (err) {
    next(err);
  }
});

router.get('/problems/:id/submissions', authenticate, async (req, res, next) => {
  try {
    const subs = await Submission.find({ userId: req.user.id, problemId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('language verdict passed total timeMs createdAt');
    res.json({ success: true, data: subs });
  } catch (err) {
    next(err);
  }
});

// One-off judge (custom stdin testcases or generated), result not saved.
router.post('/judge', authenticate, async (req, res, next) => {
  try {
    const parsed = z.object({
      sourceCode: z.string().min(1).max(200000),
      language: z.enum(['cpp', 'c', 'java', 'python', 'javascript', 'js']).default('cpp'),
      testcases: z.array(z.object({
        name: z.string().max(100).optional().default('Case'),
        kind: z.enum(['sample', 'edge', 'large']).optional().default('sample'),
        stdin: z.string().max(65536).optional().default(''),
        expected: z.string().max(65536).optional().default(''),
      })).min(1).max(12),
    }).safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.issues } });
    }
    const verdict = await judge({
      sourceCode: parsed.data.sourceCode,
      language: parsed.data.language === 'js' ? 'javascript' : parsed.data.language,
      testcases: parsed.data.testcases,
    });
    res.json({ success: true, data: verdict });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
