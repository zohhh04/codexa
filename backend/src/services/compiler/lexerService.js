/**
 * Codexa AI — lexer service (Phase 3).
 * Thin adapter over the pure compiler/lexer engine. Keeps Express concerns
 * (validation, HTTP) out of the engine so it stays independently testable.
 */
const { tokenize } = require('../../../../compiler/lexer');

function analyzeTokens(sourceCode) {
  const started = Date.now();
  const { tokens, diagnostics } = tokenize(sourceCode);

  const byType = {};
  for (const t of tokens) byType[t.type] = (byType[t.type] || 0) + 1;

  const errors = diagnostics.filter((d) => d.severity === 'error').length;
  const warnings = diagnostics.filter((d) => d.severity === 'warning').length;

  return {
    tokens,
    diagnostics,
    stats: {
      total: tokens.length,
      byType,
      errors,
      warnings,
      elapsedMs: Date.now() - started,
    },
  };
}

module.exports = { analyzeTokens };
