/**
 * Codexa AI — lexer public API.
 *
 * tokenize(source) -> { tokens, diagnostics }
 * Pure function: no I/O, no dependencies. Used by the backend token service.
 */
const { Lexer } = require('./lexer');
const tokens = require('./tokens');

function tokenize(source) {
  const lexer = new Lexer(source);
  return lexer.run();
}

module.exports = { tokenize, Lexer, ...tokens };
