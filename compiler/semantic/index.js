/**
 * Codexa AI — semantic public API.
 * analyze(ast) -> { symbols, diagnostics }
 */
const { Analyzer } = require('./analyzer');
const symbols = require('./symbols');

function analyze(ast) {
  const analyzer = new Analyzer();
  return analyzer.analyze(ast);
}

module.exports = { analyze, Analyzer, ...symbols };
