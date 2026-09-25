const assert = require('node:assert');
const { describe, it } = require('node:test');
const { createApp } = require('../src/app');

async function postTokens(port, body) {
  const res = await fetch(`http://localhost:${port}/api/compiler/tokens`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

describe('Phase 3 — POST /api/compiler/tokens', () => {
  it('tokenizes valid code with stats', async () => {
    const app = createApp();
    const server = app.listen(0);
    await new Promise((r) => server.on('listening', r));
    try {
      const port = server.address().port;
      const { status, json } = await postTokens(port, { sourceCode: 'int a = 5;' });
      assert.strictEqual(status, 200);
      assert.strictEqual(json.success, true);
      assert.deepStrictEqual(
        json.data.tokens.map((t) => t.type),
        ['KEYWORD', 'IDENTIFIER', 'OPERATOR', 'INT_LITERAL', 'DELIMITER'],
      );
      assert.strictEqual(json.data.stats.total, 5);
      assert.strictEqual(json.data.stats.errors, 0);
      assert.ok(typeof json.data.stats.elapsedMs === 'number');
      assert.ok(json.data.tokens[0].line === 1 && json.data.tokens[0].column === 1);
    } finally {
      server.close();
    }
  });

  it('returns lexer diagnostics for bad code (still 200)', async () => {
    const app = createApp();
    const server = app.listen(0);
    await new Promise((r) => server.on('listening', r));
    try {
      const port = server.address().port;
      const { status, json } = await postTokens(port, { sourceCode: 'int @x;' });
      assert.strictEqual(status, 200);
      assert.strictEqual(json.data.stats.errors, 1);
      assert.strictEqual(json.data.diagnostics[0].phase, 'lexical');
      assert.ok(json.data.tokens.some((t) => t.type === 'INVALID'));
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
      const { status, json } = await postTokens(port, { sourceCode: '' });
      assert.strictEqual(status, 400);
      assert.strictEqual(json.success, false);
    } finally {
      server.close();
    }
  });

  it('rejects missing body and unsupported language with 400', async () => {
    const app = createApp();
    const server = app.listen(0);
    await new Promise((r) => server.on('listening', r));
    try {
      const port = server.address().port;
      const missing = await postTokens(port, {});
      assert.strictEqual(missing.status, 400);
      const lang = await postTokens(port, { sourceCode: 'int a;', language: 'rust' });
      assert.strictEqual(lang.status, 400);
    } finally {
      server.close();
    }
  });
});
