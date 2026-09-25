const assert = require('node:assert');
const { describe, it } = require('node:test');
const { createApp } = require('../src/app');

async function postRun(port, body) {
  const res = await fetch(`http://localhost:${port}/api/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

describe('Phase 6 — POST /api/run', () => {
  it('returns compile + run result for valid code (or Clang-missing error)', async () => {
    const app = createApp();
    const server = app.listen(0);
    await new Promise((r) => server.on('listening', r));
    try {
      const port = server.address().port;
      const { status, json } = await postRun(port, {
        sourceCode: '#include <iostream>\nint main() { std::cout << "hello"; return 0; }',
      });
      assert.strictEqual(status, 200);
      assert.strictEqual(json.success, true);
      assert.ok(json.data.compile, 'should have compile result');
      assert.ok(json.data.run, 'should have run result');
      assert.ok(typeof json.data.compile.success === 'boolean');
      assert.ok(Array.isArray(json.data.compile.diagnostics));
      assert.ok(typeof json.data.compile.elapsedMs === 'number');
      assert.ok(typeof json.data.run.stdout === 'string');
      assert.ok(typeof json.data.run.stderr === 'string');
      assert.ok(typeof json.data.run.exitCode === 'number');
      assert.ok(typeof json.data.run.timedOut === 'boolean');
    } finally {
      server.close();
    }
  });

  it('reports Clang-missing error when clang++ is unavailable', async () => {
    const app = createApp();
    const server = app.listen(0);
    await new Promise((r) => server.on('listening', r));
    try {
      const port = server.address().port;
      // Point to a non-existent binary
      const orig = process.env.CLANG_PATH;
      process.env.CLANG_PATH = '/nonexistent/clang++';
      try {
        const { status, json } = await postRun(port, { sourceCode: 'int main() { return 0; }' });
        assert.strictEqual(status, 200);
        assert.strictEqual(json.success, true);
        assert.strictEqual(json.data.compile.success, false);
        assert.ok(json.data.compile.diagnostics.length > 0);
        assert.strictEqual(json.data.compile.diagnostics[0].code, 'CLANG_MISSING');
      } finally {
        if (orig !== undefined) process.env.CLANG_PATH = orig;
        else delete process.env.CLANG_PATH;
      }
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
      const { status, json } = await postRun(port, { sourceCode: '' });
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
      const missing = await postRun(port, {});
      assert.strictEqual(missing.status, 400);
      const lang = await postRun(port, { sourceCode: 'int a;', language: 'rust' });
      assert.strictEqual(lang.status, 400);
    } finally {
      server.close();
    }
  });
});
