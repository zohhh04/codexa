/**
 * Codexa AI — lexer token definitions (Phase 3).
 *
 * Token shape: { type, value, line, column, endLine, endColumn }
 * Positions are 1-based. [line, column] is the inclusive start,
 * [endLine, endColumn] is the exclusive end (Monaco-range convention).
 *
 * Diagnostic shape:
 * { phase: 'lexical', source: 'codexa', severity, code, message,
 *   line, column, endLine, endColumn }
 */
const TokenType = {
  KEYWORD: 'KEYWORD',
  IDENTIFIER: 'IDENTIFIER',
  INT_LITERAL: 'INT_LITERAL',
  FLOAT_LITERAL: 'FLOAT_LITERAL',
  CHAR_LITERAL: 'CHAR_LITERAL',
  STRING_LITERAL: 'STRING_LITERAL',
  BOOLEAN_LITERAL: 'BOOLEAN_LITERAL',
  NULLPTR_LITERAL: 'NULLPTR_LITERAL',
  OPERATOR: 'OPERATOR',
  DELIMITER: 'DELIMITER',
  PREPROCESSOR: 'PREPROCESSOR',
  COMMENT: 'COMMENT',
  INVALID: 'INVALID',
};

// Full ISO C++ keyword set (incl. alternative operator spellings).
// true/false/nullptr are classified as literals, not keywords.
const KEYWORDS = new Set(
  ('alignas alignof and and_eq asm auto bitand bitor bool break case catch ' +
    'char char8_t char16_t char32_t class compl concept const consteval constexpr ' +
    'constinit const_cast continue co_await co_return co_yield decltype default ' +
    'delete do double dynamic_cast else enum explicit export extern float for ' +
    'friend goto if inline int long mutable namespace new noexcept not not_eq ' +
    'operator or or_eq private protected public register reinterpret_cast ' +
    'requires return short signed sizeof static static_assert static_cast struct ' +
    'switch template this thread_local throw try typedef typeid typename union ' +
    'unsigned using virtual void volatile wchar_t while xor xor_eq')
    .split(' '),
);

const THREE_CHAR_OPS = new Set(['>>=', '<<=', '...', '->*']);
const TWO_CHAR_OPS = new Set([
  '::', '.*', '->', '++', '--', '<<', '>>', '<=', '>=', '==', '!=',
  '&&', '||', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '##',
]);
const ONE_CHAR_OPS = new Set('+ - * / % = & | ^ ~ ! < > ? : . #'.split(' '));
const DELIMITERS = new Set(['(', ')', '{', '}', '[', ']', ';', ',']);

const VALID_ESCAPES = new Set(
  ['n', 't', 'r', '0', '\\', "'", '"', 'a', 'b', 'f', 'v', '?'],
);

module.exports = {
  TokenType,
  KEYWORDS,
  THREE_CHAR_OPS,
  TWO_CHAR_OPS,
  ONE_CHAR_OPS,
  DELIMITERS,
  VALID_ESCAPES,
};
