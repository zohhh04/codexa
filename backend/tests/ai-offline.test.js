const assert = require('node:assert');
const { describe, it } = require('node:test');

// Deterministic: never touch the network even if backend/.env holds a key.
process.env.CODEXA_FORCE_OFFLINE = '1';

const { getTutorHint } = require('../src/services/ai/tutorService');
const { generateCode } = require('../src/services/ai/codegenService');
const { getProvider } = require('../src/services/ai/client');

describe('AI offline behavior', () => {
  describe('tutor explains without pasting code', () => {
    it('walkthrough has line references but no code blocks', async () => {
      const code = 'a, b = map(int, input().split())\nprint(a + b)\n';
      const r = await getTutorHint({ question: 'How does my code work?', sourceCode: code, language: 'python', diagnostics: [] });
      assert.ok(r.hint.length > 0);
      assert.ok(!r.hint.includes('`'), 'hint must not paste code');
      assert.ok(/line 1/i.test(r.hint), 'hint cites line numbers');
      assert.strictEqual(typeof r.speakable, 'string');
      assert.ok(r.speakable.length > 0);
      assert.ok(!r.speakable.includes('`'));
    });

    it('error answer cites the real diagnostic line without code dumps', async () => {
      const code = 'int main() {\nint a = 1\nreturn 0;\n}\n';
      const r = await getTutorHint({
        question: 'What are my errors?',
        sourceCode: code,
        language: 'cpp',
        diagnostics: [{ phase: 'syntax', severity: 'error', code: 'SYN_SEMI', message: 'Missing semicolon', line: 2, column: 10 }],
      });
      assert.ok(r.hint.includes('Line 2'));
      assert.ok(!r.hint.includes('`'), 'hint must not paste code');
    });
  });

  describe('offline code generator takes input', () => {
    it('add-two reads input in every language', async () => {
      const py = await generateCode({ prompt: 'add two numbers', language: 'python' });
      assert.ok(py.code.includes('input('));
      const cpp = await generateCode({ prompt: 'add two numbers', language: 'cpp' });
      assert.ok(cpp.code.includes('cin >>'));
      const java = await generateCode({ prompt: 'add two numbers', language: 'java' });
      assert.ok(java.code.includes('Scanner'));
      const c = await generateCode({ prompt: 'add two numbers', language: 'c' });
      assert.ok(c.code.includes('scanf'));
    });

    it('largest-of-three routes to the simple template, not search', async () => {
      const r = await generateCode({ prompt: 'find largest of three numbers', language: 'python' });
      assert.ok(r.code.includes('max('));
      assert.ok(!r.code.includes('index'));
    });
  });

  describe('gemini auto-detection', () => {
    it('AIza keys use the free gemini endpoint', () => {
      // Isolate from backend/.env (which may hold a real key): clear the
      // config snapshot so only the test env feeds getProvider.
      const config = require('../src/config/env');
      const savedCfg = { key: config.aiApiKey, base: config.aiBaseUrl, model: config.aiModel };
      const prevKey = process.env.AI_API_KEY;
      const prevBase = process.env.AI_BASE_URL;
      const prevModel = process.env.AI_MODEL;
      config.aiApiKey = '';
      config.aiBaseUrl = '';
      config.aiModel = '';
      process.env.AI_API_KEY = 'AIza-test-key';
      delete process.env.AI_BASE_URL;
      delete process.env.AI_MODEL;
      delete process.env.CODEXA_FORCE_OFFLINE;
      try {
        const p = getProvider();
        assert.strictEqual(p.provider, 'gemini');
        assert.ok(p.baseUrl.includes('googleapis'));
        assert.strictEqual(p.model, 'gemini-2.0-flash');
      } finally {
        process.env.CODEXA_FORCE_OFFLINE = '1';
        config.aiApiKey = savedCfg.key;
        config.aiBaseUrl = savedCfg.base;
        config.aiModel = savedCfg.model;
        if (prevKey === undefined) delete process.env.AI_API_KEY;
        else process.env.AI_API_KEY = prevKey;
        if (prevBase === undefined) delete process.env.AI_BASE_URL;
        else process.env.AI_BASE_URL = prevBase;
        if (prevModel === undefined) delete process.env.AI_MODEL;
        else process.env.AI_MODEL = prevModel;
      }
    });
  });
});
