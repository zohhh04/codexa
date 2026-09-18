/**
 * Codexa AI — hand-written C++ lexer (Phase 3).
 *
 * Maximal-munch scanner producing real tokens with 1-based source positions.
 * Whitespace is skipped (newlines still tracked). Everything else the lexer
 * cannot classify becomes an INVALID token with an error diagnostic —
 * nothing is silently dropped.
 *
 * Known v1 limits (reported, never faked):
 * - Digraphs / trigraphs are tokenized as their individual characters.
 * - Universal-character-names (\\uXXXX) inside identifiers are not decoded.
 */
const {
  TokenType,
  KEYWORDS,
  THREE_CHAR_OPS,
  TWO_CHAR_OPS,
  ONE_CHAR_OPS,
  DELIMITERS,
  VALID_ESCAPES,
} = require('./tokens');

const INT_SUFFIX = '([uU]([lL]{1,2})?|[lL]{1,2}[uU]?)?';
const INT_BIN = new RegExp(`^0[bB][01]+${INT_SUFFIX}$`);
const INT_HEX = new RegExp(`^0[xX][0-9a-fA-F]+${INT_SUFFIX}$`);
const INT_DEC = new RegExp(`^[0-9]+${INT_SUFFIX}$`);
const FLOAT = new RegExp(
  '^(([0-9]+\\.[0-9]*)|(\\.[0-9]+)|([0-9]+))([eE][+-]?[0-9]+)?[fFlL]?$',
);

function isAlpha(ch) {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
}
function isDigit(ch) {
  return ch >= '0' && ch <= '9';
}
function isAlphaNum(ch) {
  return isAlpha(ch) || isDigit(ch);
}

class Lexer {
  constructor(source) {
    this.src = String(source ?? '');
    this.pos = 0;
    this.line = 1;
    this.col = 1;
    this.tokens = [];
    this.diagnostics = [];
    this.atLineStart = true;
  }

  run() {
    while (!this.eof()) {
      const ch = this.peek();
      if (ch === ' ' || ch === '\t' || ch === '\r') {
        this.advance();
        continue;
      }
      if (ch === '\n') {
        this.advance(); // advance() already moves to line+1, col 1
        this.atLineStart = true;
        continue;
      }
      // Preprocessor directive: '#' as first non-blank char of a line.
      if (ch === '#' && this.atLineStart) {
        this.scanPreprocessor();
        continue;
      }
      this.atLineStart = false;

      // Raw strings must be checked before the generic word scanner,
      // otherwise the leading R would lex as an identifier.
      if (ch === 'R' && this.peek(1) === '"') this.scanRawString();
      else if (isAlpha(ch)) this.scanWord();
      else if (isDigit(ch) || (ch === '.' && isDigit(this.peek(1)))) this.scanNumber();
      else if (ch === '"') this.scanString();
      else if (ch === "'") this.scanChar();
      else if (ch === '/' && (this.peek(1) === '/' || this.peek(1) === '*')) this.scanComment();
      else if (!this.scanOperatorOrDelimiter()) this.scanInvalid();
    }
    return { tokens: this.tokens, diagnostics: this.diagnostics };
  }

  // ---- primitives -------------------------------------------------------
  eof() {
    return this.pos >= this.src.length;
  }
  peek(offset = 0) {
    return this.src[this.pos + offset] ?? '';
  }
  advance(n = 1) {
    for (let i = 0; i < n; i += 1) {
      if (this.src[this.pos] === '\n') {
        this.line += 1;
        this.col = 1;
      } else {
        this.col += 1;
      }
      this.pos += 1;
    }
  }
  mark() {
    return { line: this.line, col: this.col, pos: this.pos };
  }
  sliceFrom(m) {
    return this.src.slice(m.pos, this.pos);
  }
  emit(type, value, start, end = null) {
    const e = end ?? { line: this.line, col: this.col };
    this.tokens.push({
      type,
      value,
      line: start.line,
      column: start.col,
      endLine: e.line,
      endColumn: e.col,
    });
  }
  diagnose(severity, code, message, start, end = null) {
    const e = end ?? { line: this.line, col: this.col };
    this.diagnostics.push({
      phase: 'lexical',
      source: 'codexa',
      severity,
      code,
      message,
      line: start.line,
      column: start.col,
      endLine: e.line,
      endColumn: e.col,
    });
  }

  // ---- scanners ---------------------------------------------------------
  scanWord() {
    const start = this.mark();
    while (isAlphaNum(this.peek())) this.advance();
    const value = this.sliceFrom(start);
    let type = TokenType.IDENTIFIER;
    if (value === 'true' || value === 'false') type = TokenType.BOOLEAN_LITERAL;
    else if (value === 'nullptr') type = TokenType.NULLPTR_LITERAL;
    else if (KEYWORDS.has(value)) type = TokenType.KEYWORD;
    this.emit(type, value, start);
  }

  scanNumber() {
    const start = this.mark();
    let prev = '';
    while (!this.eof()) {
      const ch = this.peek();
      if (/[0-9a-zA-Z_.']/.test(ch)) {
        this.advance();
        prev = ch;
      } else if ((ch === '+' || ch === '-') && (prev === 'e' || prev === 'E')) {
        this.advance();
        prev = ch;
      } else break;
    }
    const raw = this.sliceFrom(start);
    // Strip digit separators (1_000) and quote separators before validating.
    // A separator only counts between valid digit characters: 1__2 stays invalid.
    const body = raw
      .replace(/'/g, '')
      .replace(/(?<=[0-9a-fA-F])_(?=[0-9a-fA-F])/g, '');
    const end = { line: this.line, col: this.col };

    if (FLOAT.test(body) && (body.includes('.') || /[eE]/.test(body))) {
      this.emit(TokenType.FLOAT_LITERAL, raw, start, end);
      return;
    }
    if (INT_BIN.test(body) || INT_HEX.test(body) || INT_DEC.test(body)) {
      if (/^0[0-9]/.test(body) && /[89]/.test(body)) {
        this.emit(TokenType.INVALID, raw, start, end);
        this.diagnose('error', 'E09', `invalid octal digit in integer literal '${raw}'`, start, end);
        return;
      }
      this.emit(TokenType.INT_LITERAL, raw, start, end);
      return;
    }
    this.emit(TokenType.INVALID, raw, start, end);
    this.diagnose('error', 'E10', `malformed numeric literal '${raw}'`, start, end);
  }

  scanString() {
    const start = this.mark();
    this.advance(); // opening "
    let value = '"';
    let closed = false;
    while (!this.eof()) {
      const ch = this.peek();
      if (ch === '\n') break; // newline terminates: unterminated
      if (ch === '\\') {
        value += ch + this.peek(1);
        const esc = this.peek(1);
        this.advance(2);
        if (esc !== '' && !VALID_ESCAPES.has(esc) && esc !== 'x' && esc !== 'u' && esc !== 'U') {
          this.diagnose(
            'warning', 'W01', `unknown escape sequence '\\${esc}' in string literal`,
            { line: this.line, col: this.col - 2 }, { line: this.line, col: this.col },
          );
        }
        continue;
      }
      if (ch === '"') {
        value += ch;
        this.advance();
        closed = true;
        break;
      }
      value += ch;
      this.advance();
    }
    const end = { line: this.line, col: this.col };
    if (!closed) {
      this.emit(TokenType.INVALID, value, start, end);
      this.diagnose('error', 'E11', 'unterminated string literal', start, end);
      return;
    }
    this.emit(TokenType.STRING_LITERAL, value, start, end);
  }

  scanRawString() {
    const start = this.mark();
    this.advance(2); // R"
    let delim = '';
    while (!this.eof() && this.peek() !== '(' && this.peek() !== ' ' && this.peek() !== '\n' && delim.length <= 16) {
      delim += this.peek();
      this.advance();
    }
    if (this.peek() !== '(') {
      // Not actually a raw string (e.g. identifier R followed by string).
      // Rewind and lex normally: 'R' as identifier, then the string.
      this.pos = start.pos;
      this.line = start.line;
      this.col = start.col;
      this.scanWord();
      return;
    }
    this.advance(); // (
    const terminator = `)${delim}"`;
    const idx = this.src.indexOf(terminator, this.pos);
    if (idx === -1) {
      while (!this.eof()) this.advance();
      const end = { line: this.line, col: this.col };
      this.emit(TokenType.INVALID, this.sliceFrom(start), start, end);
      this.diagnose('error', 'E12', 'unterminated raw string literal', start, end);
      return;
    }
    const endPos = idx + terminator.length;
    while (this.pos < endPos) this.advance();
    this.emit(TokenType.STRING_LITERAL, this.sliceFrom(start), start, { line: this.line, col: this.col });
  }

  scanChar() {
    const start = this.mark();
    this.advance(); // opening '
    let content = '';
    let closed = false;
    let escaped = false;
    while (!this.eof()) {
      const ch = this.peek();
      if (ch === '\n') break;
      if (ch === '\\' && !escaped) {
        escaped = true;
        content += ch + this.peek(1);
        const esc = this.peek(1);
        this.advance(2);
        if (esc !== '' && !VALID_ESCAPES.has(esc) && esc !== 'x' && esc !== 'u' && esc !== 'U') {
          this.diagnose('warning', 'W02', `unknown escape sequence '\\${esc}' in character literal`, start);
        }
        continue;
      }
      if (ch === "'") {
        this.advance();
        closed = true;
        break;
      }
      content += ch;
      this.advance();
    }
    const end = { line: this.line, col: this.col };
    const raw = this.sliceFrom(start);
    if (!closed) {
      this.emit(TokenType.INVALID, raw, start, end);
      this.diagnose('error', 'E13', 'unterminated character literal', start, end);
      return;
    }
    const charCount = escaped ? 1 : [...content].length;
    if (content.length === 0) {
      this.emit(TokenType.INVALID, raw, start, end);
      this.diagnose('error', 'E14', 'empty character literal', start, end);
      return;
    }
    this.emit(TokenType.CHAR_LITERAL, raw, start, end);
    if (charCount > 1) {
      this.diagnose('warning', 'W03', `multi-character character constant ${raw}`, start, end);
    }
  }

  scanComment() {
    const start = this.mark();
    if (this.peek(1) === '/') {
      while (!this.eof() && this.peek() !== '\n') this.advance();
      this.emit(TokenType.COMMENT, this.sliceFrom(start), start, { line: this.line, col: this.col });
      return;
    }
    // block comment
    this.advance(2);
    const closeIdx = this.src.indexOf('*/', this.pos);
    if (closeIdx === -1) {
      while (!this.eof()) this.advance();
      const end = { line: this.line, col: this.col };
      this.emit(TokenType.INVALID, this.sliceFrom(start), start, end);
      this.diagnose('error', 'E15', 'unterminated block comment', start, end);
      return;
    }
    while (this.pos < closeIdx + 2) this.advance();
    this.emit(TokenType.COMMENT, this.sliceFrom(start), start, { line: this.line, col: this.col });
  }

  scanPreprocessor() {
    const start = this.mark();
    while (!this.eof()) {
      if (this.peek() === '\n') break;
      if (this.peek() === '\\' && this.peek(1) === '\n') {
        this.advance(2); // advance() already counts the continued newline
        continue;
      }
      this.advance();
    }
    this.emit(TokenType.PREPROCESSOR, this.sliceFrom(start), start, { line: this.line, col: this.col });
  }

  scanOperatorOrDelimiter() {
    const start = this.mark();
    const three = this.src.slice(this.pos, this.pos + 3);
    const two = this.src.slice(this.pos, this.pos + 2);
    const one = this.peek();
    if (THREE_CHAR_OPS.has(three)) {
      this.advance(3);
      this.emit(TokenType.OPERATOR, three, start);
      return true;
    }
    if (TWO_CHAR_OPS.has(two)) {
      this.advance(2);
      this.emit(TokenType.OPERATOR, two, start);
      return true;
    }
    if (DELIMITERS.has(one)) {
      this.advance();
      this.emit(TokenType.DELIMITER, one, start);
      return true;
    }
    if (ONE_CHAR_OPS.has(one)) {
      this.advance();
      this.emit(TokenType.OPERATOR, one, start);
      return true;
    }
    return false;
  }

  scanInvalid() {
    const start = this.mark();
    const ch = this.peek();
    this.advance();
    const end = { line: this.line, col: this.col };
    const cp = ch.codePointAt(0).toString(16).toUpperCase().padStart(2, '0');
    this.emit(TokenType.INVALID, ch, start, end);
    this.diagnose('error', 'E16', `invalid character '${ch}' (U+${cp})`, start, end);
  }
}

module.exports = { Lexer };
