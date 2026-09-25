const assert = require('node:assert');
const { describe, it } = require('node:test');
const { buildHistoryEntry, MAX_SOURCE, MAX_DIAGS } = require('../src/services/history/entry');
const {
  generatePracticeQuestion,
  gradePracticeAnswer,
  listConcepts,
  questionCatalog,
} = require('../src/services/practice/questionBank');

describe('Phase 9 — history entries', () => {
  it('builds a light analyze entry and drops a null projectId', () => {
    const entry = buildHistoryEntry({
      kind: 'analyze',
      language: 'cpp',
      sourceCode: 'int main() {}',
      diagnostics: [{ severity: 'error' }],
      stats: { nodes: 5 },
      projectId: null,
    });
    assert.strictEqual(entry.language, 'cpp');
    assert.strictEqual(entry.stats.kind, 'analyze');
    assert.ok(!('projectId' in entry), 'null projectId must be omitted for the Mongo validator');
  });

  it('keeps a truthy projectId and truncates heavy fields', () => {
    const entry = buildHistoryEntry({
      kind: 'run',
      sourceCode: 'x'.repeat(MAX_SOURCE + 100),
      diagnostics: new Array(MAX_DIAGS + 10).fill({ severity: 'note' }),
      stats: {},
      projectId: '507f1f77bcf86cd799439011',
    });
    assert.strictEqual(entry.projectId, '507f1f77bcf86cd799439011');
    assert.ok(entry.sourceCode.length <= MAX_SOURCE + 20);
    assert.strictEqual(entry.diagnostics.length, MAX_DIAGS);
    assert.strictEqual(entry.stats.kind, 'run');
  });
});

describe('Phase 10 — expanded question bank', () => {
  it('covers at least 10 concepts with valid difficulties', () => {
    const concepts = listConcepts();
    assert.ok(concepts.length >= 10, `expected >= 10 concepts, got ${concepts.length}`);
    for (const c of concepts) {
      assert.ok(c.concept);
      assert.ok(['easy', 'medium', 'hard'].includes(c.difficulty));
    }
  });

  it('every catalog entry is gradable', () => {
    for (const [key, q] of Object.entries(questionCatalog)) {
      assert.ok(q.prompt, `${key} needs a prompt`);
      assert.ok(Array.isArray(q.answerKeywords) && q.answerKeywords.length > 0, `${key} needs keywords`);
      const good = gradePracticeAnswer(q, q.answerKeywords.join(' ') + ' explained with examples and details');
      assert.strictEqual(good.correct, true, `${key} should grade its own keywords as correct`);
    }
  });

  it('generates questions for new concepts like recursion and complexity', () => {
    for (const concept of ['recursion', 'pointers', 'complexity']) {
      const q = generatePracticeQuestion(concept);
      assert.strictEqual(q.concept, concept);
      assert.ok(q.prompt.length > 0);
    }
  });
});
