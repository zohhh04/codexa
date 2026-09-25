/**
 * Codexa AI — /api/run route. Sandboxed compile + run with stdin.
 */
const { Router } = require('express');
const { z } = require('zod');
const { ok, fail } = require('../utils/response');
const { compileAndRun } = require('../services/compiler/clangService');

const router = Router();

const SUPPORTED = ['cpp', 'c', 'java', 'python', 'javascript', 'js'];

const sourceBody = z.object({
  sourceCode: z
    .string({ error: 'sourceCode must be a string' })
    .min(1, 'sourceCode must not be empty')
    .max(200000, 'sourceCode too large (max 200000 characters)'),
  language: z.enum(SUPPORTED, { error: 'unsupported language' }).optional().default('cpp'),
  stdin: z.string().max(65536, 'stdin too large (max 64KB)').optional().default(''),
});

// POST /api/run — sandboxed compile + run.
router.post('/run', async (req, res) => {
  const parsed = sourceBody.safeParse(req.body);
  if (!parsed.success) {
    return fail(res, 'Invalid request body', 400, z.treeifyError(parsed.error));
  }
  try {
    const lang = parsed.data.language === 'js' ? 'javascript' : parsed.data.language;
    const result = await compileAndRun(parsed.data.sourceCode, lang, parsed.data.stdin);
    return ok(res, result);
  } catch (err) {
    return fail(res, `Run failed: ${err.message}`, 500);
  }
});

module.exports = router;
