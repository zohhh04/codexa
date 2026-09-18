/**
 * Codexa AI — parser public API.
 * parse(tokens) -> { ast, diagnostics }
 */
const { Parser } = require('./parser');
const ast = require('./ast');

function parse(tokens) {
  const parser = new Parser(tokens);
  return parser.parse();
}

module.exports = { parse, Parser, ...ast };
