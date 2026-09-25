# compiler/ — educational C++ subset pipeline

Implemented:

- `lexer/` — Phase 3 ✅: tokens + positions + diagnostics + tests
- `parser/` — Phase 4 ✅: recursive-descent + Pratt expressions, AST with ranges, panic-mode recovery + tests
- `semantic/` — Phase 4 ✅: scopes, symbol tables, E2xx/E3xx/Wxx checks + tests
- `intermediate/` — Phase 5 ✅: three-address code with temporaries, labels, control flow + tests
- `grammar/cpp-subset.md` — Phase 4 ✅: the documented, testable language subset
- `tests/` — `node --test compiler/tests/` (61 tests, all green)

Principle: unsupported constructs are **reported**, never silently mis-compiled.
