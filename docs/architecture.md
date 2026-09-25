# Codexa AI — Architecture (Phases 1–10 + AI Studio complete)

```
browser (React SPA)
  │  axios → /api/* (Vite proxy in dev)
  ▼
Express (backend/src, :5000)
  ├─ routes/health.js ............ Phase 1 ✅
  ├─ routes/auth.js ............... Phase 9 ✅ (register/login/me/profile/password/delete)
  ├─ routes/compiler.js ........... Phases 3–5 ✅
  ├─ routes/run.js ................ Phase 6 ✅ (sandboxed compile + run, stdin, 5 languages)
  ├─ routes/ai.js ................. Phase 7 ✅ + AI Studio ✅ (generate/explain-code/debug/optimize/testcases/learn/hints)
  ├─ routes/history.js ............ Phase 9 ✅ (auto-recorded, ownership-checked)
  ├─ routes/practice.js ........... Phase 10 ✅ (15 concepts, attempts)
  ├─ routes/problems.js ........... DSA ✅ (15 problems, judge, submissions)
  ├─ routes/dashboard.js .......... Phases 9–10 ✅ (stats: solved, streak, history, practice)
  ├─ routes/toolchain.js .......... ✅ (language availability probe)
  ├─ services/compiler/* .......... lexer → parser → semantic → tac ✅ → sandbox ✅ (+stdin, JS)
  ├─ services/ai/* ................ explain ✅ / fix ✅ / tutor ✅ + codegen/explain/debug/optimize/testcases/judge/learn ✅ (offline-first)
  ├─ services/history/entry.js .... Phase 9 ✅ (light, truncated history entries)
  ├─ services/practice/* .......... questionBank ✅ (15 concepts) + dsaBank ✅ (15 problems)
  └─ middleware/errors.js ......... ✅ centralized 404 + error handler

compiler/ ............ educational C++ subset pipeline (Phases 3–5) ✅ + grammar docs + tests
frontend/src ......... components/ pages/ (Landing, Compiler, AIStudio, Problems, Learn, Practice, Dashboard, Settings, Docs, Auth) layouts/ hooks/ services/ context/ utils/
```

## Key decisions

1. **Correctness first:** UI shows empty states / "lands in Phase N" instead of fabricated output.
2. **Dual-engine contract (arbitrary C++ supported):**
   - *Educational engine* (hand-built lexer → parser → semantic → TAC, Phases 3–5)
     covers the documented C++ subset and powers tokens / AST / symbol table /
     TAC / pipeline visualization.
   - *Clang engine* (sandboxed, Phase 6) accepts **any valid-or-broken C++** —
     full language including classes, templates, pointers, STL — and is the
     authoritative source for diagnostics and execution. Error detection and AI
     explanations work for arbitrary code; only the visualizations are
     subset-limited, and the UI says so wherever that applies.
3. **Compiler independent of AI:** analysis works with the AI provider down (enforced from Phase 4).
4. **Never exec user code in-process:** Phase 6 compiles in a sandboxed child process with
   timeouts, output caps, no shell, and separate capture of stdout/stderr.
5. **User-approved fixes only:** AI diffs require explicit accept; re-analysis runs after accept.
6. **Consistent API envelope:** `{ success: true, data }` / `{ success: false, error: { message } }`.
