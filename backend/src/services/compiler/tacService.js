/**
 * Codexa AI — full analysis + TAC pipeline (Phase 5).
 * source → tokens → AST → semantic check → TAC, with combined diagnostics.
 * Only runs TAC generation when syntax + semantics are clean.
 *
 * C shares the C++ pipeline. Java / Python return honest fallback output
 * (generic tokens + INFO diagnostic, empty TAC) instead of faked trees.
 */
const { tokenize } = require('../../../../compiler/lexer');
const { parse } = require('../../../../compiler/parser');
const { analyze } = require('../../../../compiler/semantic');
const { generateTAC } = require('../../../../compiler/intermediate');
const { tokenizeGeneric } = require('./genericLexer');

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

function fallbackTAC(sourceCode, language) {
  const started = Date.now();
  const { tokens, diagnostics: lex } = tokenizeGeneric(sourceCode, language);
  const info = {
    phase: 'intermediate',
    source: 'codexa',
    severity: 'info',
    code: 'LANG_LIMIT',
    message:
      'Three-address code generation is C/C++-only in v1 — Tokens and Run work for this language. TAC arrives later.',
    line: 1,
    column: 1,
    endLine: 1,
    endColumn: 2,
  };
  const diagnostics = [...lex, info].sort(byPosition);
  const errors = diagnostics.filter((d) => d.severity === 'error').length;
  const warnings = diagnostics.filter((d) => d.severity === 'warning').length;
  return {
    ast: { kind: 'Program', body: [], language, note: 'AST not available for this language in v1' },
    symbols: [],
    instructions: [],
    diagnostics,
    stats: {
      tokens: tokens.length,
      nodes: 0,
      instructions: 0,
      errors,
      warnings,
      semanticSkipped: true,
      tacSkipped: true,
      elapsedMs: Date.now() - started,
    },
  };
}

function analyzeTAC(sourceCode, language = 'cpp') {
  if (language === 'java' || language === 'python' || language === 'javascript' || language === 'js') {
    return fallbackTAC(sourceCode, language);
  }
  const started = Date.now();
  const { tokens, diagnostics: lex } = tokenize(sourceCode);
  const { ast, diagnostics: syn } = parse(tokens);

  const syntaxOk = syn.every((d) => d.severity !== 'error');
  const { symbols, diagnostics: sem } = syntaxOk
    ? analyze(ast)
    : { symbols: [], diagnostics: [] };

  // TAC generation only runs when syntax + semantics are clean.
  const semanticsOk = sem.every((d) => d.severity !== 'error');
  const { instructions, diagnostics: tacDiags } = (syntaxOk && semanticsOk)
    ? generateTAC(ast)
    : { instructions: [], diagnostics: [] };

  const diagnostics = [...lex, ...syn, ...sem, ...tacDiags].sort(byPosition);
  const errors = diagnostics.filter((d) => d.severity === 'error').length;
  const warnings = diagnostics.filter((d) => d.severity === 'warning').length;

  return {
    ast,
    symbols,
    instructions,
    diagnostics,
    stats: {
      tokens: tokens.length,
      nodes: countNodes(ast),
      instructions: instructions.length,
      errors,
      warnings,
      semanticSkipped: !syntaxOk,
      tacSkipped: !(syntaxOk && semanticsOk),
      elapsedMs: Date.now() - started,
    },
  };
}

module.exports = { analyzeTAC, countNodes };
