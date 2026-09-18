/**
 * Codexa AI — AST node constructors (Phase 4).
 * Every node: { kind, loc: { line, column, endLine, endColumn }, ...fields }
 */

function N(kind, start, end, props = {}) {
  return {
    kind,
    loc: {
      line: start.line,
      column: start.column,
      endLine: end.endLine,
      endColumn: end.endColumn,
    },
    ...props,
  };
}

// A zero-width loc for synthesized nodes (e.g. missing else-branch).
function emptyLoc() {
  return { line: 0, column: 0, endLine: 0, endColumn: 0 };
}

module.exports = { N, emptyLoc };
