# compiler/ — educational C++ subset pipeline

Real implementation lands incrementally:

- `lexer/` — Phase 3: tokens + positions + token table
- `parser/` — Phase 4: grammar + AST
- `semantic/` — Phase 4: symbol table + type/scope checks
- `intermediate/` — Phase 5: three-address code
- `grammar/cpp-subset.md` — Phase 4: the documented, testable language subset
- `tests/` — lexer/parser/semantic/TAC tests + Clang regression programs

Principle: unsupported constructs are **reported**, never silently mis-compiled.
