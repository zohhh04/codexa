# Codexa AI — lexer (Phase 3)

Hand-written maximal-munch scanner for C++. Produces tokens with 1-based
`[line, column]` (inclusive) → `[endLine, endColumn]` (exclusive) ranges.

## Token types

`KEYWORD` · `IDENTIFIER` · `INT_LITERAL` · `FLOAT_LITERAL` · `CHAR_LITERAL` ·
`STRING_LITERAL` · `BOOLEAN_LITERAL` (`true`/`false`) · `NULLPTR_LITERAL` ·
`OPERATOR` · `DELIMITER` (`(){}[];,`) · `PREPROCESSOR` (whole directive line,
incl. `\`-continuations) · `COMMENT` (`//` and `/* */`) · `INVALID`

Whitespace is skipped; newlines update positions. Anything unclassifiable
becomes `INVALID` **plus** an error diagnostic — never silently dropped.

## Diagnostics

`{ phase: 'lexical', source: 'codexa', severity, code, message, line, column, endLine, endColumn }`

| Code | Meaning | Severity |
|---|---|---|
| E09 | Invalid octal digit (`09`) | error |
| E10 | Malformed numeric literal (`123abc`, `0x`, `1e`) | error |
| E11 | Unterminated string literal | error |
| E12 | Unterminated raw string literal | error |
| E13 | Unterminated character literal | error |
| E14 | Empty character literal (`''`) | error |
| E15 | Unterminated block comment | error |
| E16 | Invalid character (`@`, `` ` ``, …) | error |
| W01/W02 | Unknown escape sequence | warning |
| W03 | Multi-character character constant | warning |

## Known v1 limits

- Digraphs/trigraphs lex as individual characters.
- `\uXXXX` in identifiers is not decoded.
- Raw strings with >16-char delimiters fall back to normal lexing.

## Run tests

```powershell
node --test compiler/tests/
```
