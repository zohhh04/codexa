const assert = require('node:assert');
const { describe, it } = require('node:test');
const { createApp } = require('../src/app');

describe('Phase 1 — health endpoint', () => {
  it('GET /api/health returns { success: true }', async () => {
    const app = createApp();
    const server = app.listen(0);
    await new Promise((r) => server.on('listening', r));
    try {
      const port = server.address().port;
      const res = await fetch(`http://localhost:${port}/api/health`);
      assert.strictEqual(res.status, 200);
      const body = await res.json();
      assert.strictEqual(body.success, true);
      assert.strictEqual(body.data.status, 'up');
    } finally {
      server.close();
    }
  });

  it('unknown /api route returns 404 JSON', async () => {
    const app = createApp();
    const server = app.listen(0);
    await new Promise((r) => server.on('listening', r));
    try {
      const port = server.address().port;
      const res = await fetch(`http://localhost:${port}/api/nope`);
      assert.strictEqual(res.status, 404);
      const body = await res.json();
      assert.strictEqual(body.success, false);
    } finally {
      server.close();
    }
  });
});
