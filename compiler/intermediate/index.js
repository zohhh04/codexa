/**
 * Codexa AI — intermediate code public API (Phase 5).
 * generateTAC(ast) -> { instructions, diagnostics }
 */
const { TacGenerator } = require('./generator');
const tac = require('./tac');

function generateTAC(ast) {
  const gen = new TacGenerator();
  return gen.generate(ast);
}

module.exports = { generateTAC, TacGenerator, ...tac };
