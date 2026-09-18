/**
 * Codexa AI — semantic analyzer unit tests (Phase 4).
 * Run: node --test compiler/tests/   (from repo root)
 */
const assert = require('node:assert');
const { describe, it } = require('node:test');
const { tokenize } = require('../lexer');
const { parse } = require('../parser');
const { analyze } = require('../semantic');

function check(src) {
  const { tokens, diagnostics: lex } = tokenize(src);
  const { ast, diagnostics: syn } = parse(tokens);
  const { symbols, diagnostics: sem } = analyze(ast);
  return { ast, symbols, diagnostics: [...lex, ...syn, ...sem] };
}

const codes = (r) => r.diagnostics.map((d) => d.code);

describe('semantic — clean programs', () => {
  it('accepts hello world with zero diagnostics', () => {
    const r = check('#include <iostream>\nint main() { std::cout << "hi" << std::endl; return 0; }');
    assert.deepStrictEqual(r.diagnostics, []);
  });

  it('accepts arithmetic, loops, functions and mixed int/float', () => {
    const r = check(
      'int g;\nfloat f;\nint add(int a, int b) { return a + b; }\n' +
      'int main() {\n int i; float x;\n x = g + f * 2.5;\n' +
      ' for (i = 0; i < 10; i = i + 1) { g = add(g, i); }\n' +
      ' while (g > 100) { g = g - 1; }\n return g;\n}',
    );
    assert.deepStrictEqual(r.diagnostics, []);
  });

  it('builds scoped symbol tables with usage info', () => {
    const r = check('int g;\nint main() { int x; x = 1; return x; }');
    const global = r.symbols.find((s) => s.kind === 'global');
    assert.ok(global.symbols.some((s) => s.name === 'g' && s.kind === 'var' && s.type === 'int'));
    const mainFn = global.symbols.find((s) => s.name === 'main');
    assert.strictEqual(mainFn.kind, 'function');
    assert.strictEqual(mainFn.signature, '() -> int');
    const all = r.symbols.flatMap((s) => s.symbols);
    const x = all.find((s) => s.name === 'x');
    assert.strictEqual(x.used, true);
    assert.ok(x.line >= 2);
  });
});

describe('semantic — scope errors', () => {
  it('reports redeclaration and undeclared identifiers', () => {
    const r = check('int main() { int x; int x; y = 1; return 0; }');
    assert.ok(codes(r).includes('E201'));
    assert.ok(codes(r).includes('E202'));
    const undef = r.diagnostics.find((d) => d.code === 'E202');
    assert.match(undef.message, /y/);
    assert.strictEqual(undef.phase, 'semantic');
  });

  it('enforces block scoping', () => {
    const r = check('int main() { { int q; q = 1; } q = 2; return 0; }');
    assert.ok(codes(r).includes('E202'));
  });

  it('rejects calls to undeclared functions and use of functions as values', () => {
    const r = check('int main() { nope(1); int x; x = main; return 0; }');
    assert.ok(codes(r).filter((c) => c === 'E202').length >= 1);
    assert.ok(codes(r).includes('E309'));
  });
});

describe('semantic — type errors', () => {
  it('rejects bad assignments, bad operands and non-lvalues', () => {
    const r = check('int main() { int x; x = "s"; 5 = x; return x + "s"; }');
    assert.ok(codes(r).includes('E304'));
    assert.ok(codes(r).includes('E301'));
    assert.ok(codes(r).includes('E305'));
  });

  it('warns on narrowing but allows widening', () => {
    const r = check('int main() { int i; float f; i = 3.7; f = i; return i; }');
    assert.ok(codes(r).includes('W10'));
    assert.ok(!codes(r).some((c) => c.startsWith('E')));
  });

  it('checks arity, argument types and void misuse', () => {
    const r = check(
      'void f(int a) { }\nint g() { return 1; }\n' +
      'int main() { f(1, 2); f("s"); int x; x = g() + f(1); return 0; }',
    );
    assert.ok(codes(r).includes('E307'));
    assert.ok(codes(r).includes('E308'));
    assert.ok(codes(r).includes('E309'));
  });

  it('rejects void variables, bad returns and non-scalar conditions', () => {
    const r = check('void v;\nint f() { return; }\nvoid h() { return 1; }\nint main() { if ("s") { } return 0; }');
    assert.ok(codes(r).includes('E313'));
    assert.ok(codes(r).includes('E316'));
    assert.ok(codes(r).includes('E315'));
    assert.ok(codes(r).includes('E317'));
  });

  it('validates cout/cin usage', () => {
    const r = check('int main() { int x; std::cout << x; std::cin >> x; return 0; }');
    assert.deepStrictEqual(r.diagnostics, []);
    const badCin = check('int main() { std::cin >> missing; return 0; }');
    assert.ok(codes(badCin).includes('E312'));
    const bad = check('void f() { }\nint main() { std::cout << f(); return 0; }');
    assert.ok(codes(bad).includes('E311'));
  });
});

describe('semantic — teaching warnings', () => {
  it('warns on unused vars, division by zero, missing return/main', () => {
    const unused = check('int main() { int u; return 0; }');
    assert.ok(codes(unused).includes('W14'));
    const divz = check('int main() { int x; x = 5 / 0; return x; }');
    assert.ok(codes(divz).includes('W13'));
    const noreturn = check('int f() { int x; x = 1; }');
    assert.ok(codes(noreturn).includes('W12'));
    const nomain = check('int f() { return 1; }');
    assert.ok(codes(nomain).includes('W15'));
  });
});
