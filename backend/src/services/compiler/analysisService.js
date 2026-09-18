/**
 * Codexa AI — full educational analysis pipeline (Phase 4).
 * source → tokens → AST → symbols, with combined position-sorted diagnostics.
 * Independent of AI and of Clang: works fully offline.
 */
const { tokenize } = require('../../../../compiler/lexer');
const { parse } = require('../../../../compiler/parser');
const { analyze } = require('../../../../compiler/semantic');

function countNodes(node) {
  if (!node || typeof node !== 'object') return 0;
  let n = 0;
  if (node.kind) n = 1;
  for (const v of Object.values(node)) {
    if (Array.isArray(v)) {
      for (const item of v) n += countNodes(item);
    } else if (v && typeof v === 'object' && v.kind) {
      n += countNodes(v);
    }
  }
  return n;
}

function byPosition(a, b) {
  return a.line - b.line || a.column - b.column;
}

function analyzeSource(sourceCode) {
  const started = Date.now();
  const { tokens, diagnostics: lex } = tokenize(sourceCode);
  const { ast, diagnostics: syn } = parse(tokens);

  // Semantic analysis only runs on a parse with no syntax errors:
  // a broken tree would produce misleading type cascades.
  const syntaxOk = syn.every((d) => d.severity !== 'error');
  const { symbols, diagnostics: sem } = syntaxOk
    ? analyze(ast)
    : { symbols: [], diagnostics: [] };

  const diagnostics = [...lex, ...syn, ...sem].sort(byPosition);
  const errors = diagnostics.filter((d) => d.severity === 'error').length;
  const warnings = diagnostics.filter((d) => d.severity === 'warning').length;

  return {
    ast,
    symbols,
    diagnostics,
    stats: {
      tokens: tokens.length,
      nodes: countNodes(ast),
      errors,
      warnings,
      semanticSkipped: !syntaxOk,
      elapsedMs: Date.now() - started,
    },
  };
}

module.exports = { analyzeSource, countNodes };
