const { Router } = require('express');
const { z } = require('zod');
const { ok, fail } = require('../utils/response');
const { analyzeTokens } = require('../services/compiler/lexerService');
const { analyzeSource } = require('../services/compiler/analysisService');

const router = Router();

const sourceBody = z.object({
  sourceCode: z
    .string({ error: 'sourceCode must be a string' })
    .min(1, 'sourceCode must not be empty')
    .max(200000, 'sourceCode too large (max 200000 characters)'),
  language: z.enum(['cpp'], { error: 'only "cpp" is supported in v1' }).optional().default('cpp'),
});

// POST /api/compiler/tokens — real lexical analysis.
router.post('/tokens', (req, res) => {
  const parsed = sourceBody.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 'Invalid request body', 400, z.treeifyError(parsed.error));
  }
  return ok(res, analyzeTokens(parsed.data.sourceCode));
});

// POST /api/compiler/ast — parse + semantic analysis (AST, symbols, diagnostics).
router.post('/ast', (req, res) => {
  const parsed = sourceBody.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 'Invalid request body', 400, z.treeifyError(parsed.error));
  }
  return ok(res, analyzeSource(parsed.data.sourceCode));
});

module.exports = router;
