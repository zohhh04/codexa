const assert = require('node:assert');
const { describe, it } = require('node:test');
const { createApp } = require('../src/app');

async function postAst(port, body) {
  const res = await fetch(`http://localhost:${port}/api/compiler/ast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

describe('Phase 4 — POST /api/compiler/ast', () => {
  it('analyzes hello world: AST + symbols, zero diagnostics', async () => {
    const app = createApp();
    const server = app.listen(0);
    await new Promise((r) => server.on('listening', r));
    try {
      const port = server.address().port;
      const { status, json } = await postAst(port, {
        sourceCode: '#include <iostream>\nint main() { std::cout << "hi"; return 0; }',
      });
      assert.strictEqual(status, 200);
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.ast.kind, 'Program');
      assert.strictEqual(json.data.ast.body[0].name, 'main');
      assert.ok(json.data.symbols.some((s) => s.kind === 'global'));
      assert.deepStrictEqual(json.data.diagnostics, []);
      assert.ok(json.data.stats.nodes > 5);
    } finally {
      server.close();
    }
  });

  it('reports semantic errors with positions and skips nothing silently', async () => {
    const app = createApp();
    const server = app.listen(0);
    await new Promise((r) => server.on('listening', r));
    try {
      const port = server.address().port;
      const { status, json } = await postAst(port, {
        sourceCode: 'int main() { x = 1; return 0; }',
      });
      assert.strictEqual(status, 200);
      assert.strictEqual(json.data.stats.errors, 1);
      assert.strictEqual(json.data.diagnostics[0].code, 'E202');
      assert.strictEqual(json.data.diagnostics[0].line, 1);
    } finally {
      server.close();
    }
  });

  it('returns partial AST + syntax errors and skips semantic on broken code', async () => {
    const app = createApp();
    const server = app.listen(0);
    await new Promise((r) => server.on('listening', r));
    try {
      const port = server.address().port;
      const { status, json } = await postAst(port, {
        sourceCode: 'int main() { int a = 1\n return a; }',
      });
      assert.strictEqual(status, 200);
      assert.strictEqual(json.data.ast.kind, 'Program');
      assert.ok(json.data.diagnostics.some((d) => d.phase === 'syntax'));
      assert.strictEqual(json.data.stats.semanticSkipped, true);
    } finally {
      server.close();
    }
  });

  it('rejects empty source with 400', async () => {
    const app = createApp();
    const server = app.listen(0);
    await new Promise((r) => server.on('listening', r));
    try {
      const port = server.address().port;
      const { status, json } = await postAst(port, { sourceCode: '' });
      assert.strictEqual(status, 400);
      assert.strictEqual(json.success, false);
    } finally {
      server.close();
    }
  });
});
