/**
 * Codexa AI — TAC generator unit tests (Phase 5).
 * Run: node --test compiler/tests/   (from repo root)
 */
const assert = require('node:assert');
const { describe, it } = require('node:test');
const { tokenize } = require('../lexer');
const { parse } = require('../parser');
const { generateTAC } = require('../intermediate');

function tac(src) {
  const { tokens } = tokenize(src);
  const { ast } = parse(tokens);
  return generateTAC(ast);
}

function ops(instructions) {
  return instructions.map((i) => i.op);
}

function findLabel(instructions, name) {
  return instructions.find((i) => i.op === 'label' && i.label === name);
}

function findByOp(instructions, op) {
  return instructions.filter((i) => i.op === op);
}

describe('TAC — simple programs', () => {
  it('generates a function label and implicit return for void main', () => {
    const r = tac('int main() { return 0; }');
    assert.deepStrictEqual(r.diagnostics, []);
    assert.ok(r.instructions.length > 0);
    assert.strictEqual(r.instructions[0].op, 'label');
    assert.strictEqual(r.instructions[0].label, 'fn_main');
    assert.ok(ops(r.instructions).includes('return'));
  });

  it('generates TAC for hello world with cout', () => {
    const r = tac('#include <iostream>\nint main() { std::cout << "hi" << std::endl; return 0; }');
    assert.deepStrictEqual(r.diagnostics, []);
    const calls = findByOp(r.instructions, 'call');
    assert.ok(calls.some((c) => c.arg1 === 'print'));
    assert.ok(calls.some((c) => c.arg1 === 'print_endl'));
  });
});

describe('TAC — arithmetic precedence', () => {
  it('lowers a = b + c * d with correct precedence into temporaries', () => {
    const r = tac(
      'int main() { int a, b, c, d; a = b + c * d; return 0; }',
    );
    assert.deepStrictEqual(r.diagnostics, []);
    // Should have: t1 = c * d; t2 = b + t1; a = t2
    const assigns = findByOp(r.instructions, 'assign');
    const binops = findByOp(r.instructions, 'binop');
    assert.ok(binops.length >= 2, 'need at least 2 binops for + and *');
    // The multiply binop should come before the add binop
    const mulIdx = binops.findIndex((b) => b.arg1.includes('*'));
    const addIdx = binops.findIndex((b) => b.arg1.includes('+'));
    assert.ok(mulIdx >= 0, 'should have a multiply');
    assert.ok(addIdx >= 0, 'should have an add');
    assert.ok(mulIdx < addIdx, 'multiply should come before add');
    // Final assignment to 'a'
    const lastAssign = assigns[assigns.length - 1];
    assert.strictEqual(lastAssign.result, 'a');
  });

  it('handles parenthesized subexpression', () => {
    const r = tac('int main() { int a, b, c; a = (b + c) * 2; return 0; }');
    assert.deepStrictEqual(r.diagnostics, []);
    const binops = findByOp(r.instructions, 'binop');
    const addIdx = binops.findIndex((b) => b.arg1.includes('+'));
    const mulIdx = binops.findIndex((b) => b.arg1.includes('*'));
    assert.ok(addIdx >= 0 && mulIdx >= 0);
    assert.ok(addIdx < mulIdx, 'add should come before multiply due to parens');
  });

  it('handles unary negation', () => {
    const r = tac('int main() { int x; x = -5; return 0; }');
    assert.deepStrictEqual(r.diagnostics, []);
    const unaries = findByOp(r.instructions, 'unary');
    assert.ok(unaries.length >= 1);
    assert.ok(unaries[0].arg1.includes('-'));
  });
});

describe('TAC — control flow', () => {
  it('generates if/else with labels and gotos', () => {
    const r = tac('int main() { int x; if (x > 0) { x = 1; } else { x = 2; } return 0; }');
    assert.deepStrictEqual(r.diagnostics, []);
    const labels = findByOp(r.instructions, 'label');
    const gotos = findByOp(r.instructions, 'goto');
    const ifGotos = findByOp(r.instructions, 'if_goto');
    assert.ok(labels.length >= 2, 'should have else and endif labels');
    assert.ok(gotos.length >= 1, 'should have a goto to skip else');
    assert.ok(ifGotos.length >= 1, 'should have an if_goto');
  });

  it('generates while loop with start and end labels', () => {
    const r = tac('int main() { int i; while (i < 5) { i = i + 1; } return 0; }');
    assert.deepStrictEqual(r.diagnostics, []);
    const labels = findByOp(r.instructions, 'label');
    const labelNames = labels.map((l) => l.label);
    assert.ok(labelNames.some((n) => n.startsWith('while')), 'should have while label');
    assert.ok(labelNames.some((n) => n.startsWith('endwhile')), 'should have endwhile label');
    const gotos = findByOp(r.instructions, 'goto');
    const backEdges = gotos.filter((g) => labelNames.some((n) => n.startsWith('while') && g.label === n));
    assert.ok(backEdges.length >= 1, 'should have a back-edge goto');
  });

  it('generates for loop with init, cond, update, and body', () => {
    const r = tac('int main() { int i; for (i = 0; i < 5; i = i + 1) { } return 0; }');
    assert.deepStrictEqual(r.diagnostics, []);
    const labels = findByOp(r.instructions, 'label');
    const labelNames = labels.map((l) => l.label);
    assert.ok(labelNames.some((n) => n.startsWith('for')), 'should have for label');
    assert.ok(labelNames.some((n) => n.startsWith('forcond')), 'should have forcond label');
    assert.ok(labelNames.some((n) => n.startsWith('forupd')), 'should have forupd label');
    assert.ok(labelNames.some((n) => n.startsWith('endfor')), 'should have endfor label');
  });

  it('generates break as goto to end label', () => {
    const r = tac('int main() { int i; for (i = 0; i < 10; i = i + 1) { break; } return 0; }');
    assert.deepStrictEqual(r.diagnostics, []);
    const gotos = findByOp(r.instructions, 'goto');
    const breakGotos = gotos.filter((g) => g.label && g.label.startsWith('endfor'));
    assert.ok(breakGotos.length >= 1, 'break should emit goto to endfor');
  });

  it('generates continue as goto to update label', () => {
    const r = tac('int main() { int i; for (i = 0; i < 10; i = i + 1) { continue; } return 0; }');
    assert.deepStrictEqual(r.diagnostics, []);
    const gotos = findByOp(r.instructions, 'goto');
    const contGotos = gotos.filter((g) => g.label && g.label.startsWith('forupd'));
    assert.ok(contGotos.length >= 1, 'continue should emit goto to forupd');
  });
});

describe('TAC — functions and calls', () => {
  it('generates param instructions for function parameters', () => {
    const r = tac('int add(int a, int b) { return a + b; }');
    assert.deepStrictEqual(r.diagnostics, []);
    const params = findByOp(r.instructions, 'param');
    assert.ok(params.length >= 2);
    assert.strictEqual(params[0].result, 'a');
    assert.strictEqual(params[1].result, 'b');
  });

  it('generates call instructions for function calls', () => {
    const r = tac(
      'int add(int a, int b) { return a + b; }\nint main() { int x; x = add(1, 2); return 0; }',
    );
    assert.deepStrictEqual(r.diagnostics, []);
    const calls = findByOp(r.instructions, 'call');
    const userCalls = calls.filter((c) => c.arg1 === 'add');
    assert.ok(userCalls.length >= 1, 'should have a call to add');
    assert.ok(userCalls[0].result, 'call should have a result temp');
  });

  it('generates param instructions for call arguments', () => {
    const r = tac(
      'int add(int a, int b) { return a + b; }\nint main() { add(1, 2); return 0; }',
    );
    assert.deepStrictEqual(r.diagnostics, []);
    const params = findByOp(r.instructions, 'param');
    // 2 params for function def + 2 params for call = 4
    assert.ok(params.length >= 4, 'should have params for both def and call');
  });
});

describe('TAC — assignments and updates', () => {
  it('generates simple assignment', () => {
    const r = tac('int main() { int x; x = 42; return 0; }');
    assert.deepStrictEqual(r.diagnostics, []);
    const assigns = findByOp(r.instructions, 'assign');
    const xAssign = assigns.find((a) => a.result === 'x');
    assert.ok(xAssign);
    assert.strictEqual(xAssign.arg1, '42');
  });

  it('generates compound assignment (+=)', () => {
    const r = tac('int main() { int x; x = 0; x += 5; return 0; }');
    assert.deepStrictEqual(r.diagnostics, []);
    const binops = findByOp(r.instructions, 'binop');
    const addBinop = binops.find((b) => b.arg1.includes('+'));
    assert.ok(addBinop, '+= should generate a binop with +');
  });

  it('generates prefix ++ as immediate update', () => {
    const r = tac('int main() { int x; x = 0; ++x; return 0; }');
    assert.deepStrictEqual(r.diagnostics, []);
    const binops = findByOp(r.instructions, 'binop');
    const incBinop = binops.find((b) => b.arg1.includes('+ 1'));
    assert.ok(incBinop, '++x should generate x + 1');
  });
});

describe('TAC — cout and cin', () => {
  it('generates print calls for cout', () => {
    const r = tac('int main() { int x; std::cout << x; return 0; }');
    assert.deepStrictEqual(r.diagnostics, []);
    const calls = findByOp(r.instructions, 'call');
    const printCalls = calls.filter((c) => c.arg1 === 'print');
    assert.ok(printCalls.length >= 1);
    assert.strictEqual(printCalls[0].arg2, 'x');
  });

  it('generates print_endl for std::endl', () => {
    const r = tac('int main() { std::cout << std::endl; return 0; }');
    assert.deepStrictEqual(r.diagnostics, []);
    const calls = findByOp(r.instructions, 'call');
    assert.ok(calls.some((c) => c.arg1 === 'print_endl'));
  });

  it('generates read calls for cin', () => {
    const r = tac('int main() { int x; std::cin >> x; return 0; }');
    assert.deepStrictEqual(r.diagnostics, []);
    const calls = findByOp(r.instructions, 'call');
    const readCalls = calls.filter((c) => c.arg1 === 'read');
    assert.ok(readCalls.length >= 1);
    assert.strictEqual(readCalls[0].result, 'x');
  });
});

describe('TAC — diagnostics', () => {
  it('produces no diagnostics for clean input', () => {
    const r = tac('int main() { int x; x = 1; return x; }');
    assert.deepStrictEqual(r.diagnostics, []);
  });

  it('tracks source locations in instructions', () => {
    const r = tac('int main() { int x; x = 1; return 0; }');
    assert.ok(r.instructions.some((i) => i.loc !== null));
    const labelInstr = r.instructions.find((i) => i.op === 'label');
    assert.ok(labelInstr.loc);
    assert.ok(labelInstr.loc.line >= 1);
  });
});
