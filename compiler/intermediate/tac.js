/**
 * Codexa AI — three-address code instruction representation (Phase 5).
 *
 * Instruction shape:
 *   { op, arg1, arg2, result, label, loc }
 *
 * op:      'assign' | 'binop' | 'unary' | 'label' | 'goto' | 'if_goto'
 *          | 'param' | 'call' | 'return' | 'load' | 'store' | 'nop'
 * arg1/2:  string operand (name, temp, or literal) — may be null
 * result:  string destination — may be null for goto/label
 * label:   string label name — only for label/goto/if_goto
 * loc:     { line, column, endLine, endColumn } from source AST node
 */

function instr(op, result, arg1, arg2, label, loc) {
  return { op, arg1: arg1 ?? null, arg2: arg2 ?? null, result: result ?? null, label: label ?? null, loc: loc ?? null };
}

module.exports = { instr };
