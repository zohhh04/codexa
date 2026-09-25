const assert = require('node:assert');
const { describe, it } = require('node:test');
const { generatePracticeQuestion, gradePracticeAnswer } = require('../src/services/practice/questionBank');

describe('Phase 10 — practice questions', () => {
  it('returns a question with the expected fields', () => {
    const question = generatePracticeQuestion();

    assert.ok(question.id);
    assert.ok(question.prompt);
    assert.ok(question.concept);
    assert.ok(['easy', 'medium', 'hard'].includes(question.difficulty));
    assert.ok(Array.isArray(question.answerKeywords));
    assert.ok(question.answerKeywords.length > 0);
  });

  it('accepts an answer containing the expected concept keywords', () => {
    const question = generatePracticeQuestion('variables');
    const result = gradePracticeAnswer(question, 'Use a variable to store the value, declare it with a type, and initialize it.');

    assert.strictEqual(result.correct, true);
    assert.ok(result.score > 0);
    assert.ok(result.feedback.length > 0);
  });

  it('flags weak or unrelated answers as incorrect', () => {
    const question = generatePracticeQuestion('loops');
    const result = gradePracticeAnswer(question, 'I think this is confusing.');

    assert.strictEqual(result.correct, false);
    assert.ok(result.score >= 0);
  });
});
