/**
 * Codexa AI — lexer unit tests (Phase 3).
 * Run: node --test compiler/tests/   (from repo root)
 */
const assert = require('node:assert');
const { describe, it } = require('node:test');
const { tokenize, TokenType } = require('../lexer');

const types = (r) => r.tokens.map((t) => t.type);
const values = (r) => r.tokens.map((t) => t.value);

describe('lexer — valid programs', () => {
  it('tokenizes a minimal statement with exact types + positions', () => {
    const r = tokenize('int a = 5;');
    assert.deepStrictEqual(types(r), [
      TokenType.KEYWORD, TokenType.IDENTIFIER, TokenType.OPERATOR,
      TokenType.INT_LITERAL, TokenType.DELIMITER,
    ]);
    assert.deepStrictEqual(values(r), ['int', 'a', '=', '5', ';']);
    assert.deepStrictEqual(r.diagnostics, []);
    // 'a' starts at line 1, column 5; '5' ends at exclusive column 9.
    assert.deepStrictEqual(
      [r.tokens[1].line, r.tokens[1].column, r.tokens[1].endLine, r.tokens[1].endColumn],
      [1, 5, 1, 6],
    );
    assert.deepStrictEqual(
      [r.tokens[3].line, r.tokens[3].column, r.tokens[3].endLine, r.tokens[3].endColumn],
      [1, 9, 1, 10],
    );
  });

  it('tracks multi-line positions', () => {
    const r = tokenize('int a;\nint b;\n');
    assert.strictEqual(r.tokens[0].line, 1);
    assert.strictEqual(r.tokens[3].line, 2);
    assert.strictEqual(r.tokens[3].column, 1);
    assert.deepStrictEqual(r.diagnostics, []);
  });

  it('tokenizes the TAC-demo statement', () => {
    const r = tokenize('a = b + c * d;');
    assert.deepStrictEqual(values(r), ['a', '=', 'b', '+', 'c', '*', 'd', ';']);
    assert.deepStrictEqual(r.diagnostics, []);
  });

  it('handles multi-char operators and delimiters', () => {
    const r = tokenize('if (a <= b && c != d) { a <<= 1; x = y >> 2; p->q; v[i]; f(...); }');
    assert.deepStrictEqual(r.diagnostics, []);
    const ops = r.tokens.filter((t) => t.type === TokenType.OPERATOR).map((t) => t.value);
    assert.deepStrictEqual(ops, ['<=', '&&', '!=', '<<=', '=', '>>', '->', '...']);
    assert.ok(r.tokens.some((t) => t.type === TokenType.DELIMITER && t.value === '{'));
  });

  it('emits preprocessor directives as whole-line tokens', () => {
    const r = tokenize('#include <iostream>\nint main() {}');
    assert.strictEqual(r.tokens[0].type, TokenType.PREPROCESSOR);
    assert.strictEqual(r.tokens[0].value, '#include <iostream>');
    assert.deepStrictEqual(r.diagnostics, []);
  });

  it('emits line and block comments', () => {
    const r = tokenize('// hi\nint /* mid */ x;');
    assert.deepStrictEqual(types(r), [
      TokenType.COMMENT, TokenType.KEYWORD, TokenType.COMMENT, TokenType.IDENTIFIER, TokenType.DELIMITER,
    ]);
    assert.strictEqual(r.tokens[2].value, '/* mid */');
    assert.deepStrictEqual(r.diagnostics, []);
  });

  it('classifies numeric literal forms', () => {
    const r = tokenize('5 0 0xFF 0b101 0755 3.14 .5 1e3 2.5f 1_000 0xABul');
    assert.deepStrictEqual(types(r), Array(11).fill(TokenType.INT_LITERAL).map((t, i) =>
      i >= 5 && i <= 8 ? TokenType.FLOAT_LITERAL : t));
    assert.deepStrictEqual(r.diagnostics, []);
  });

  it('classifies char, string, boolean and nullptr literals', () => {
    const r = tokenize(`'a' '\\n' "hi \\"q\\"" true false nullptr`);
    assert.deepStrictEqual(
      types(r).slice(0, 3),
      [TokenType.CHAR_LITERAL, TokenType.CHAR_LITERAL, TokenType.STRING_LITERAL],
    );
    assert.deepStrictEqual(
      types(r).slice(3),
      [TokenType.BOOLEAN_LITERAL, TokenType.BOOLEAN_LITERAL, TokenType.NULLPTR_LITERAL],
    );
    assert.deepStrictEqual(r.diagnostics, []);
  });

  it('tokenizes a raw string as one string literal', () => {
    const r = tokenize('R"(a"b\\c)"');
    assert.strictEqual(r.tokens.length, 1);
    assert.strictEqual(r.tokens[0].type, TokenType.STRING_LITERAL);
    assert.deepStrictEqual(r.diagnostics, []);
  });

  it('empty source yields no tokens and no diagnostics', () => {
    const r = tokenize('');
    assert.deepStrictEqual(r.tokens, []);
    assert.deepStrictEqual(r.diagnostics, []);
  });
});

describe('lexer — errors and warnings', () => {
  it('flags invalid characters with code + position', () => {
    const r = tokenize('int @x;');
    const bad = r.tokens.find((t) => t.type === TokenType.INVALID);
    assert.strictEqual(bad.value, '@');
    assert.deepStrictEqual([bad.line, bad.column], [1, 5]);
    assert.strictEqual(r.diagnostics.length, 1);
    assert.match(r.diagnostics[0].code, /E16/);
    assert.strictEqual(r.diagnostics[0].severity, 'error');
    assert.strictEqual(r.diagnostics[0].phase, 'lexical');
  });

  it('flags unterminated string literals', () => {
    const r = tokenize('"abc');
    assert.strictEqual(r.tokens[0].type, TokenType.INVALID);
    assert.ok(r.diagnostics.some((d) => d.code === 'E11'));
  });

  it('flags strings broken by a newline', () => {
    const r = tokenize('"ab\ncd"');
    assert.strictEqual(r.tokens[0].type, TokenType.INVALID);
    assert.ok(r.diagnostics.some((d) => d.code === 'E11'));
    // scanning resumes on the next line
    assert.ok(r.tokens.some((t) => t.value === 'cd'));
  });

  it('flags unterminated block comments', () => {
    const r = tokenize('int a; /* oops');
    assert.strictEqual(r.tokens.at(-1).type, TokenType.INVALID);
    assert.ok(r.diagnostics.some((d) => d.code === 'E15'));
  });

  it('flags malformed numbers and bad octal', () => {
    for (const src of ['123abc', '0x', '1e', '09']) {
      const r = tokenize(src);
      assert.strictEqual(r.tokens[0].type, TokenType.INVALID, src);
      assert.strictEqual(r.diagnostics.length, 1, src);
      assert.strictEqual(r.diagnostics[0].severity, 'error', src);
    }
    assert.ok(tokenize('09').diagnostics.some((d) => d.code === 'E09'));
    assert.ok(tokenize('123abc').diagnostics.some((d) => d.code === 'E10'));
  });

  it('flags empty char literals', () => {
    const r = tokenize("''");
    assert.strictEqual(r.tokens[0].type, TokenType.INVALID);
    assert.ok(r.diagnostics.some((d) => d.code === 'E14'));
  });

  it('warns (not errors) on unknown escapes and multi-char constants', () => {
    const r = tokenize(`"a\\qb" 'ab'`);
    assert.strictEqual(r.tokens[0].type, TokenType.STRING_LITERAL);
    assert.strictEqual(r.tokens[1].type, TokenType.CHAR_LITERAL);
    assert.ok(r.diagnostics.some((d) => d.code === 'W01' && d.severity === 'warning'));
    assert.ok(r.diagnostics.some((d) => d.code === 'W03' && d.severity === 'warning'));
    assert.ok(r.diagnostics.every((d) => d.severity === 'warning'));
  });
});
