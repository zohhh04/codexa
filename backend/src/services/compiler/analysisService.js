/**
 * Codexa AI — full educational analysis pipeline (Phase 4).
 * source → tokens → AST → symbols, with combined position-sorted diagnostics.
 * Independent of AI and of Clang: works fully offline.
 *
 * C and C++ share the educational C++-subset pipeline (C is largely a
 * subset of what the grammar accepts). Java and Python get honest fallback
 * output: real generic tokens + an INFO diagnostic explaining that the
 * AST / symbol-table stages are C/C++-only. Nothing is faked.
 */
const { tokenize } = require('../../../../compiler/lexer');
const { parse } = require('../../../../compiler/parser');
const { analyze } = require('../../../../compiler/semantic');
const { tokenizeGeneric } = require('./genericLexer');
const { checkGenericSyntax, dedupDiagnostics, applyStdlibKnowledge } = require('./syntaxCheck');

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

function fallbackAnalysis(sourceCode, language) {
  const started = Date.now();
  const { tokens, diagnostics: lex } = tokenizeGeneric(sourceCode, language);
  const syn = checkGenericSyntax(sourceCode, language);
  const info = {
    phase: 'semantic',
    source: 'codexa',
    severity: 'info',
    code: 'LANG_LIMIT',
    message:
      language === 'python'
        ? 'AST / symbol-table detail is C/C++-only in v1 — but Tokens, Syntax and Run above are real checks on your Python code.'
        : 'AST / symbol-table detail is C/C++-only in v1 — but Tokens, Syntax and Run above are real checks on your code.',
    line: 1,
    column: 1,
    endLine: 1,
    endColumn: 2,
  };
  const diagnostics = dedupDiagnostics([...lex, ...syn, info].sort(byPosition));
  const errors = diagnostics.filter((d) => d.severity === 'error').length;
  const warnings = diagnostics.filter((d) => d.severity === 'warning').length;
  return {
    ast: { kind: 'Program', body: [], language, note: 'AST not available for this language in v1' },
    symbols: [],
    diagnostics,
    stats: {
      tokens: tokens.length,
      nodes: 0,
      errors,
      warnings,
      semanticSkipped: true,
      elapsedMs: Date.now() - started,
    },
  };
}

function analyzeSource(sourceCode, language = 'cpp') {
  if (language === 'java' || language === 'python' || language === 'javascript' || language === 'js') {
    return fallbackAnalysis(sourceCode, language);
  }
  const started = Date.now();
  const { tokens, diagnostics: lex } = tokenize(sourceCode);
  const { ast, diagnostics: syn } = parse(tokens);

  // Semantic analysis only runs on a parse with no syntax errors:
  // a broken tree would produce misleading type cascades.
  const syntaxOk = syn.every((d) => d.severity !== 'error');
  const { symbols, diagnostics: sem } = syntaxOk
    ? analyze(ast)
    : { symbols: [], diagnostics: [] };

  const diagnostics = dedupDiagnostics(
    applyStdlibKnowledge(sourceCode, [...lex, ...syn, ...sem]).sort(byPosition),
  );
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
