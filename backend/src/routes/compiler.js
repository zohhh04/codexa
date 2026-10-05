const { Router } = require('express');
const { z } = require('zod');
const { ok, fail } = require('../utils/response');
const { analyzeTokens } = require('../services/compiler/lexerService');
const { analyzeSource } = require('../services/compiler/analysisService');
const { analyzeTAC } = require('../services/compiler/tacService');
const { optimizeSource } = require('../services/compiler/optimizeService');

const router = Router();

const SUPPORTED_LANGUAGES = ['cpp', 'c', 'java', 'python', 'javascript', 'js'];

const sourceBody = z.object({
  sourceCode: z
    .string({ error: 'sourceCode must be a string' })
    .min(1, 'sourceCode must not be empty')
    .max(200000, 'sourceCode too large (max 200000 characters)'),
  language: z.enum(SUPPORTED_LANGUAGES, { error: 'unsupported language' }).optional().default('cpp'),
});

// The engines are total (never throw on weird input), but a defensive
// wrapper keeps every response JSON-shaped even for pathological code.
function safe(handler) {
  return (req, res) => {
    const parsed = sourceBody.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, 'Invalid request body', 400, z.treeifyError(parsed.error));
    }
    try {
      return ok(res, handler(parsed.data.sourceCode, parsed.data.language));
    } catch (err) {
      return fail(res, `Analysis failed: ${err.message}`, 500);
    }
  };
}

// POST /api/compiler/tokens — real lexical analysis.
router.post('/tokens', safe((sourceCode, language) => analyzeTokens(sourceCode, language)));

// POST /api/compiler/ast — parse + semantic analysis (AST, symbols, diagnostics).
router.post('/ast', safe((sourceCode, language) => analyzeSource(sourceCode, language)));

// POST /api/compiler/intermediate-code — full pipeline + TAC generation.
router.post('/intermediate-code', safe((sourceCode, language) => analyzeTAC(sourceCode, language)));

// POST /api/compiler/optimize — dynamic peephole-style optimizations on actual code.
router.post('/optimize', safe((sourceCode) => optimizeSource(sourceCode)));

module.exports = router;
