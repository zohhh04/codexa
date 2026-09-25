const assert = require('node:assert');
const { describe, it } = require('node:test');
const { normalizeEmail } = require('../src/utils/normalizeEmail');

describe('Auth normalization', () => {
  it('trims and lowercases email addresses for credential checks', () => {
    assert.strictEqual(normalizeEmail('  Ada@Example.COM  '), 'ada@example.com');
    assert.strictEqual(normalizeEmail('user+tag@TEST.io'), 'user+tag@test.io');
  });
});
