const express = require('express');
const { z } = require('zod');
const Analysis = require('../models/Analysis');
const { authenticate } = require('../middleware/auth');
const { buildHistoryEntry } = require('../services/history/entry');

const router = express.Router();

router.use(authenticate);

const analysisSchema = z.object({
  projectId: z.string().optional().nullable(),
  sourceCode: z.string().max(200000).default(''),
  language: z.string().max(20).default('cpp'),
  diagnostics: z.array(z.any()).max(100).default([]),
  stats: z.any().default({}),
});

router.get('/', async (req, res, next) => {
  try {
    const analyses = await Analysis.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('projectId sourceCode language diagnostics stats createdAt');
    res.json({ success: true, data: analyses });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const parsed = analysisSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: parsed.error.issues },
      });
    }
    const entry = buildHistoryEntry({
      kind: parsed.data.stats?.kind,
      language: parsed.data.language,
      sourceCode: parsed.data.sourceCode,
      diagnostics: parsed.data.diagnostics,
      stats: parsed.data.stats,
      projectId: parsed.data.projectId,
    });
    const analysis = await Analysis.create({ userId: req.user.id, ...entry });
    res.status(201).json({ success: true, data: analysis });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const analysis = await Analysis.findOne({ _id: req.params.id, userId: req.user.id });
    if (!analysis) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Analysis not found' } });
    }
    res.json({ success: true, data: analysis });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const analysis = await Analysis.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!analysis) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Analysis not found' } });
    }
    res.json({ success: true, data: { deleted: true } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
