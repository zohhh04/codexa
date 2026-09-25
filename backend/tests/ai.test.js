const assert = require('node:assert');
const { describe, it } = require('node:test');
const { createApp } = require('../src/app');

async function postJson(port, path, body) {
  const res = await fetch(`http://localhost:${port}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

async function getJson(port, path) {
  const res = await fetch(`http://localhost:${port}${path}`);
  return { status: res.status, json: await res.json() };
}

const SAMPLE_DIAG = {
  phase: 'syntax',
  source: 'codexa',
  severity: 'error',
  code: 'S101',
  message: "expected a parameter (type + name)",
  line: 2,
  column: 15,
  endLine: 2,
  endColumn: 16,
};

describe('Phase 7 — AI endpoints', () => {
  describe('GET /api/ai/status', () => {
    it('returns availability status', async () => {
      const app = createApp();
      const server = app.listen(0);
      await new Promise((r) => server.on('listening', r));
      try {
        const { status, json } = await getJson(server.address().port, '/api/ai/status');
        assert.strictEqual(status, 200);
        assert.strictEqual(json.success, true);
        assert.strictEqual(typeof json.data.available, 'boolean');
      } finally {
        server.close();
      }
    });
  });

  describe('POST /api/ai/explain', () => {
    it('returns explanation (or AI-not-configured message)', async () => {
      const app = createApp();
      const server = app.listen(0);
      await new Promise((r) => server.on('listening', r));
      try {
        const { status, json } = await postJson(server.address().port, '/api/ai/explain', {
          diagnostic: SAMPLE_DIAG,
          sourceCode: 'int main() { return 0; }',
          level: 'beginner',
        });
        assert.strictEqual(status, 200);
        assert.strictEqual(json.success, true);
        assert.strictEqual(typeof json.data.explanation, 'string');
        assert.ok(json.data.explanation.length > 0);
        assert.strictEqual(typeof json.data.aiAvailable, 'boolean');
      } finally {
        server.close();
      }
    });

    it('rejects invalid diagnostic with 400', async () => {
      const app = createApp();
      const server = app.listen(0);
      await new Promise((r) => server.on('listening', r));
      try {
        const { status, json } = await postJson(server.address().port, '/api/ai/explain', {
          diagnostic: { phase: 'syntax' }, // missing required fields
          sourceCode: 'int main() { return 0; }',
        });
        assert.strictEqual(status, 400);
        assert.strictEqual(json.success, false);
      } finally {
        server.close();
      }
    });

    it('rejects empty sourceCode with 400', async () => {
      const app = createApp();
      const server = app.listen(0);
      await new Promise((r) => server.on('listening', r));
      try {
        const { status, json } = await postJson(server.address().port, '/api/ai/explain', {
          diagnostic: SAMPLE_DIAG,
          sourceCode: '',
        });
        assert.strictEqual(status, 400);
        assert.strictEqual(json.success, false);
      } finally {
        server.close();
      }
    });
  });

  describe('POST /api/ai/fix', () => {
    it('returns fix proposal (or AI-not-configured message)', async () => {
      const app = createApp();
      const server = app.listen(0);
      await new Promise((r) => server.on('listening', r));
      try {
        const { status, json } = await postJson(server.address().port, '/api/ai/fix', {
          diagnostic: SAMPLE_DIAG,
          sourceCode: 'int main() { return 0; }',
        });
        assert.strictEqual(status, 200);
        assert.strictEqual(json.success, true);
        assert.strictEqual(typeof json.data.description, 'string');
        assert.strictEqual(typeof json.data.aiAvailable, 'boolean');
      } finally {
        server.close();
      }
    });

    it('rejects invalid body with 400', async () => {
      const app = createApp();
      const server = app.listen(0);
      await new Promise((r) => server.on('listening', r));
      try {
        const { status } = await postJson(server.address().port, '/api/ai/fix', {});
        assert.strictEqual(status, 400);
      } finally {
        server.close();
      }
    });
  });

  describe('POST /api/ai/tutor', () => {
    it('returns tutor hint (or AI-not-configured message)', async () => {
      const app = createApp();
      const server = app.listen(0);
      await new Promise((r) => server.on('listening', r));
      try {
        const { status, json } = await postJson(server.address().port, '/api/ai/tutor', {
          question: 'What is a syntax error?',
          sourceCode: 'int main() { return 0; }',
          context: 'analyzing',
        });
        assert.strictEqual(status, 200);
        assert.strictEqual(json.success, true);
        assert.strictEqual(typeof json.data.hint, 'string');
        assert.ok(json.data.hint.length > 0);
        assert.strictEqual(typeof json.data.aiAvailable, 'boolean');
      } finally {
        server.close();
      }
    });

    it('rejects empty question with 400', async () => {
      const app = createApp();
      const server = app.listen(0);
      await new Promise((r) => server.on('listening', r));
      try {
        const { status, json } = await postJson(server.address().port, '/api/ai/tutor', {
          question: '',
        });
        assert.strictEqual(status, 400);
        assert.strictEqual(json.success, false);
      } finally {
        server.close();
      }
    });
  });
});
