/**
 * Codexa AI — generic fallback lexer for Java / Python (and any future language).
 *
 * The hand-written C++ lexer + parser + semantic pipeline is C/C++ specific.
 * For Java and Python we still want honest, useful Tokens / Diagnostics output
 * instead of a 400 error, so this module provides a small dependency-free
 * regex scanner that emits tokens in the SAME shape as the C++ lexer:
 *   { type, value, line, column, endLine, endColumn }
 * plus position-sorted diagnostics (unterminated strings, bad characters).
 *
 * AST / symbols / TAC remain C/C++-only: callers surface a clear INFO
 * diagnostic explaining that, rather than faking a tree.
 */

const JAVA_KEYWORDS = new Set(
  'abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while var record sealed permits yield'.split(
    ' ',
  ),
);

const PYTHON_KEYWORDS = new Set(
  'False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case'.split(
    ' ',
  ),
);

const MULTI_OPS = [
  '>>>',
  '>>=',
  '<<=',
  '**=',
  '//=',
  '->',
  '::',
  '**',
  '//',
  '==',
  '!=',
  '<=',
  '>=',
  '&&',
  '||',
  '++',
  '--',
  '+=',
  '-=',
  '*=',
  '/=',
  '%=',
  '&=',
  '|=',
  '^=',
  '<<',
  '>>',
];

const SINGLE_OPS = new Set('+-*/%=<>&|^!~?:@'.split(''));
const DELIMS = new Set('(){}[];,.:'.split(''));

function isAlpha(ch) {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_';
}
function isDigit(ch) {
  return ch >= '0' && ch <= '9';
}
function isAlphaNum(ch) {
  return isAlpha(ch) || isDigit(ch);
}

function pushToken(tokens, type, value, line, col, endLine, endCol) {
  tokens.push({ type, value, line, column: col, endLine, endColumn: endCol });
}

function tokenizeGeneric(sourceCode, language) {
  const src = String(sourceCode ?? '');
  const keywords = language === 'python' ? PYTHON_KEYWORDS : JAVA_KEYWORDS;
  const tokens = [];
  const diagnostics = [];
  let pos = 0;
  let line = 1;
  let col = 1;

  const peek = (off = 0) => src[pos + off] ?? '';
  const advance = (n = 1) => {
    for (let i = 0; i < n; i++) {
      if (src[pos] === '\n') {
        line += 1;
        col = 1;
      } else {
        col += 1;
      }
      pos += 1;
    }
  };

  const diag = (severity, code, message, sl, sc, el, ec) =>
    diagnostics.push({
      phase: 'lexical',
      source: 'lexer',
      severity,
      code,
      message,
      line: sl,
      column: sc,
      endLine: el,
      endColumn: ec,
    });

  while (pos < src.length) {
    const ch = peek();

    // Whitespace
    if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
      advance();
      continue;
    }

    // Comments
    if (language === 'python' && ch === '#') {
      const sl = line;
      const sc = col;
      let val = '';
      while (pos < src.length && peek() !== '\n') {
        val += peek();
        advance();
      }
      pushToken(tokens, 'COMMENT', val, sl, sc, line, col);
      continue;
    }
    if (language !== 'python' && ch === '/' && (peek(1) === '/' || peek(1) === '*')) {
      const sl = line;
      const sc = col;
      if (peek(1) === '/') {
        let val = '';
        while (pos < src.length && peek() !== '\n') {
          val += peek();
          advance();
        }
        pushToken(tokens, 'COMMENT', val, sl, sc, line, col);
      } else {
        let val = '/*';
        advance(2);
        let closed = false;
        while (pos < src.length) {
          if (peek() === '*' && peek(1) === '/') {
            val += '*/';
            advance(2);
            closed = true;
            break;
          }
          val += peek();
          advance();
        }
        pushToken(tokens, 'COMMENT', val, sl, sc, line, col);
        if (!closed) {
          diag('error', 'E101', 'Unterminated block comment', sl, sc, line, col);
        }
      }
      continue;
    }

    // Strings (single / double / triple for python)
    if (ch === '"' || ch === "'") {
      const sl = line;
      const sc = col;
      const quote = ch;
      const triple = language === 'python' && peek(1) === quote && peek(2) === quote;
      let val = '';
      let closed = false;
      if (triple) {
        val = quote + quote + quote;
        advance(3);
        while (pos < src.length) {
          if (peek() === quote && peek(1) === quote && peek(2) === quote) {
            val += quote + quote + quote;
            advance(3);
            closed = true;
            break;
          }
          val += peek();
          advance();
        }
      } else {
        val = quote;
        advance();
        let escaped = false;
        while (pos < src.length) {
          const c = peek();
          val += c;
          advance();
          if (escaped) {
            escaped = false;
            continue;
          }
          if (c === '\\') {
            escaped = true;
            continue;
          }
          if (c === '\n') break; // unterminated on this line
          if (c === quote) {
            closed = true;
            break;
          }
        }
        if (!closed && !(val.endsWith(quote) && val.length > 1)) {
          // closed flag already false
        }
      }
      pushToken(tokens, 'STRING_LITERAL', val, sl, sc, line, col);
      if (!closed) {
        diag('error', 'E102', 'Unterminated string literal', sl, sc, line, col);
      }
      continue;
    }

    // Numbers
    if (isDigit(ch) || (ch === '.' && isDigit(peek(1)))) {
      const sl = line;
      const sc = col;
      let val = '';
      let isFloat = false;
      while (pos < src.length && (isDigit(peek()) || peek() === '_')) {
        val += peek();
        advance();
      }
      if (peek() === '.' && isDigit(peek(1))) {
        isFloat = true;
        val += '.';
        advance();
        while (pos < src.length && (isDigit(peek()) || peek() === '_')) {
          val += peek();
          advance();
        }
      }
      if (/[eE]/.test(peek()) && /[0-9+-]/.test(peek(1) === '+' || peek(1) === '-' ? peek(2) : peek(1))) {
        isFloat = true;
        val += peek();
        advance();
        if (peek() === '+' || peek() === '-') {
          val += peek();
          advance();
        }
        while (pos < src.length && isDigit(peek())) {
          val += peek();
          advance();
        }
      }
      // identifiers glued to numbers, e.g. 123abc
      if (isAlpha(peek())) {
        const badStartCol = col;
        let bad = val;
        while (pos < src.length && isAlphaNum(peek())) {
          bad += peek();
          advance();
        }
        pushToken(tokens, 'INVALID', bad, sl, sc, line, col);
        diag(
          'error',
          'E103',
          `Invalid numeric literal '${bad}'`,
          sl,
          badStartCol,
          line,
          col,
        );
        continue;
      }
      pushToken(tokens, isFloat ? 'FLOAT_LITERAL' : 'INT_LITERAL', val, sl, sc, line, col);
      continue;
    }

    // Identifiers / keywords / booleans
    if (isAlpha(ch)) {
      const sl = line;
      const sc = col;
      let val = '';
      while (pos < src.length && (isAlphaNum(peek()))) {
        val += peek();
        advance();
      }
      let type = 'IDENTIFIER';
      if (keywords.has(val)) type = 'KEYWORD';
      else if (val === 'true' || val === 'false') type = 'BOOLEAN_LITERAL';
      else if (val === 'null' || val === 'None' || val === 'nil') type = 'NULLPTR_LITERAL';
      pushToken(tokens, type, val, sl, sc, line, col);
      continue;
    }

    // Preprocessor (Java annotations / C-style #) — keep as single token
    if (ch === '#' || (language !== 'python' && ch === '@')) {
      const sl = line;
      const sc = col;
      let val = '';
      while (pos < src.length && peek() !== '\n') {
        val += peek();
        advance();
      }
      pushToken(tokens, 'PREPROCESSOR', val, sl, sc, line, col);
      continue;
    }

    // Multi-char operators
    let matched = false;
    for (const op of MULTI_OPS) {
      if (src.startsWith(op, pos)) {
        pushToken(tokens, 'OPERATOR', op, line, col, line, col + op.length);
        advance(op.length);
        matched = true;
        break;
      }
    }
    if (matched) continue;

    if (SINGLE_OPS.has(ch)) {
      pushToken(tokens, 'OPERATOR', ch, line, col, line, col + 1);
      advance();
      continue;
    }
    if (DELIMS.has(ch)) {
      pushToken(tokens, 'DELIMITER', ch, line, col, line, col + 1);
      advance();
      continue;
    }

    // Anything else is invalid
    pushToken(tokens, 'INVALID', ch, line, col, line, col + 1);
    diag('error', 'E104', `Unexpected character '${ch}'`, line, col, line, col + 1);
    advance();
  }

  diagnostics.sort((a, b) => a.line - b.line || a.column - b.column);
  return { tokens, diagnostics };
}

module.exports = { tokenizeGeneric, JAVA_KEYWORDS, PYTHON_KEYWORDS };
