/**
 * Codexa AI — parser unit tests (Phase 4).
 * Run: node --test compiler/tests/   (from repo root)
 */
const assert = require('node:assert');
const { describe, it } = require('node:test');
const { tokenize } = require('../lexer');
const { parse } = require('../parser');

function parseSrc(src) {
  const { tokens } = tokenize(src);
  return parse(tokens);
}

describe('parser — valid programs', () => {
  it('parses hello world (preprocessor skipped, cout chain)', () => {
    const { ast, diagnostics } = parseSrc(
      '#include <iostream>\nint main() {\n std::cout << "hi" << std::endl;\n return 0;\n}',
    );
    assert.deepStrictEqual(diagnostics, []);
    assert.strictEqual(ast.kind, 'Program');
    const fn = ast.body[0];
    assert.strictEqual(fn.kind, 'FunctionDef');
    assert.strictEqual(fn.name, 'main');
    assert.strictEqual(fn.loc.line, 2);
    const [cout, ret] = fn.body.statements;
    assert.strictEqual(cout.kind, 'Cout');
    assert.strictEqual(cout.items.length, 2);
    assert.strictEqual(cout.items[0].kind, 'StringLit');
    assert.strictEqual(cout.items[1].kind, 'Qualified');
    assert.strictEqual(ret.kind, 'Return');
  });

  it('parses declarations, assignment precedence and calls', () => {
    const { ast, diagnostics } = parseSrc(
      'int g, h = 2;\nint add(int a, int b) { return a + b * 2; }\nint main() { int x; x = add(g, h); }',
    );
    assert.deepStrictEqual(diagnostics, []);
    const [gdecl, add, main] = ast.body;
    assert.strictEqual(gdecl.declarators.length, 2);
    assert.strictEqual(gdecl.declarators[1].init.kind, 'IntLit');
    // a + (b * 2)
    const ret = add.body.statements[0];
    assert.strictEqual(ret.value.kind, 'Binary');
    assert.strictEqual(ret.value.op, '+');
    assert.strictEqual(ret.value.right.kind, 'Binary');
    assert.strictEqual(ret.value.right.op, '*');
    // x = add(g, h)
    const stmt = main.body.statements[1];
    assert.strictEqual(stmt.kind, 'ExprStmt');
    assert.strictEqual(stmt.expr.kind, 'Assignment');
    assert.strictEqual(stmt.expr.right.kind, 'Call');
    assert.strictEqual(stmt.expr.right.args.length, 2);
  });

  it('parses assignment as right-associative', () => {
    const { ast, diagnostics } = parseSrc('int main() { a = b = 1; }');
    assert.deepStrictEqual(diagnostics, []);
    const expr = ast.body[0].body.statements[0].expr;
    assert.strictEqual(expr.kind, 'Assignment');
    assert.strictEqual(expr.right.kind, 'Assignment');
  });

  it('parses if/else, while, for, break, continue', () => {
    const { ast, diagnostics } = parseSrc(
      'int main() {\n' +
      ' if (a == 1) { b = 2; } else b = 3;\n' +
      ' while (a < 5) { a = a + 1; if (a == 3) continue; }\n' +
      ' for (int i = 0; i < 5; i = i + 1) { if (i == 4) break; }\n' +
      ' for (;;) break;\n' +
      '}',
    );
    assert.deepStrictEqual(diagnostics, []);
    const [iff, whl, fr, finf] = ast.body[0].body.statements;
    assert.strictEqual(iff.kind, 'If');
    assert.ok(iff.else);
    assert.strictEqual(whl.kind, 'While');
    assert.strictEqual(fr.kind, 'For');
    assert.strictEqual(fr.init.kind, 'VarDecl');
    assert.ok(fr.cond && fr.update);
    assert.strictEqual(finf.cond, null);
  });

  it('parses using-directives and cin', () => {
    const { ast, diagnostics } = parseSrc(
      'using namespace std;\nint main() { int x; std::cin >> x; }',
    );
    assert.deepStrictEqual(diagnostics, []);
    assert.strictEqual(ast.body[0].kind, 'Using');
    const cin = ast.body[1].body.statements[1];
    assert.strictEqual(cin.kind, 'Cin');
    assert.strictEqual(cin.targets[0].name, 'x');
  });

  it('every node carries a source range', () => {
    const { ast } = parseSrc('int main() { return 1; }');
    const seen = [];
    (function walk(n) {
      if (!n || typeof n !== 'object') return;
      if (n.kind && n.loc) seen.push(n);
      for (const v of Object.values(n)) {
        if (Array.isArray(v)) v.forEach(walk);
        else if (v && typeof v === 'object' && v.kind) walk(v);
      }
    })(ast);
    assert.ok(seen.length >= 5);
    for (const n of seen) {
      assert.ok(n.loc.line >= 1, `${n.kind} has a range`);
      assert.ok(n.loc.endLine >= n.loc.line, `${n.kind} range is ordered`);
    }
  });
});

describe('parser — errors and recovery', () => {
  it('recovers from a missing semicolon and keeps parsing', () => {
    const { ast, diagnostics } = parseSrc('int main() { int a = 1\n int b = 2; b = a; }');
    assert.ok(diagnostics.some((d) => d.code === 'S101'));
    const stmts = ast.body[0].body.statements;
    assert.ok(stmts.some((s) => s.kind === 'VarDecl'));
    assert.ok(stmts.some((s) => s.kind === 'ExprStmt'));
  });

  it('rejects bare statements at global scope', () => {
    const { diagnostics } = parseSrc('a = 1;');
    assert.ok(diagnostics.some((d) => d.code === 'S102'));
  });

  it('hints std::cout for bare cout shifts and rejects prototypes', () => {
    const shifted = parseSrc('int main() { cout << x; }');
    assert.ok(shifted.diagnostics.some((d) => d.code === 'S106' && /std::cout/.test(d.message)));
    const proto = parseSrc('int f(int x);');
    assert.ok(proto.diagnostics.some((d) => d.code === 'S106'));
  });

  it('rejects break/continue outside loops and array indexing', () => {
    const bc = parseSrc('int main() { break; }');
    assert.ok(bc.diagnostics.some((d) => d.code === 'S105'));
    const arr = parseSrc('int main() { x = a[0]; }');
    assert.ok(arr.diagnostics.some((d) => d.code === 'S106' && /array/.test(d.message)));
  });

  it('returns a partial AST (not a crash) for broken input', () => {
    const { ast, diagnostics } = parseSrc('int main() { if (a { b = ; } }');
    assert.ok(diagnostics.length > 0);
    assert.strictEqual(ast.kind, 'Program');
    assert.strictEqual(ast.body[0].kind, 'FunctionDef');
  });
});
