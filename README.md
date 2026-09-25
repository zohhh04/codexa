# Codexa AI — Phases 1–10 complete + AI Studio & DSA Judge

Intelligent compiler analysis + AI coding tutor (MERN). This build ships **Phases 1–10 and beyond**:
project scaffolding, design system, landing page, IDE shell layout, Express skeleton,
docs, Monaco editor, lexer, parser, semantic analysis, three-address code generation,
sandboxed compile + run (**C, C++, Java, Python, JavaScript** — with stdin), AI-powered
error detective, verification with visual diffs/undo/redo/pipeline views, JWT authentication
with MongoDB project persistence, **auto-recorded analysis history**, a **15-concept practice
system**, an **AI Studio** (code generator, line-by-line explainer, debugger with verified
fixes, optimizer), a **DSA judge** (15 problems, sample/edge/large tests, Accepted → Compilation
Error verdicts), progressive hints, a learning assistant, and a real-data dashboard
(solved, streak, languages, history, practice).

## Architecture

- `frontend/` — React 19 + Vite 8 + Tailwind v4 + React Router (dev server on **port 2000**). Pages: Landing, Compiler
  (IDE shell), AI Studio, Problems, Learn, Practice, Dashboard (real data), Settings (profile, password,
  editor prefs, toolchains), Login/Register, Docs.
- `backend/` — Express 4 API (port 5000). Health, compiler pipeline, sandboxed run, AI services
  (offline-first, LLM-backed when `AI_API_KEY` is set), auth, projects, history, practice,
  problems/judge, dashboard stats, toolchain status.
- `compiler/` — educational C++ subset pipeline: lexer, parser + semantic, three-address code.
- `docs/` — `architecture.md` (module map) and `api.md` (REST contract).

## Prerequisites

- Node.js ≥ 20, npm ≥ 10
- MongoDB 8.x running locally (Windows service `MongoDB`); database `codexa`
  is bootstrapped via `cd backend; npm run db:setup` (collections + validators + indexes,
  including `submissions`)
- Toolchains (optional per language — check with `cd backend; npm run toolchains`):
  Clang/LLVM for C/C++, JDK 17+ for Java, Python 3.10+, Node.js 20+ for JavaScript.
  Windows one-shot install: `cd backend; npm run toolchains:install`.
  Missing toolchains produce a clear error message — output is never faked.
- AI provider (optional) — for LLM-backed generation/explanations. Set `AI_API_KEY` in
  `backend/.env` (OpenAI or any OpenAI-compatible provider). Without a key, AI features
  run on built-in templates/heuristics and say so — responses are never faked.

## Run it

```powershell
# Backend (http://localhost:5000)
cd backend; npm install; npm run dev

# Frontend (http://localhost:2000, proxies /api to backend)
cd frontend; npm install; npm run dev
```

## Verify

```powershell
# From repo root:
node --test "compiler/tests/*.test.js"  # lexer + parser + semantic + TAC
cd backend; npm test                    # 32 tests (health, tokens, ast, run, AI, phase 9–10)
cd ../frontend; npm run build           # production build must succeed

# To enable persistence features, start MongoDB and run:
cd backend; npm run db:setup            # creates collections + indexes
```

## What works

| Action | Behavior |
|---|---|
| Edit code / switch samples / Reset | Works locally, 5 languages |
| Analyze | Full pipeline: tokens, AST, symbols, diagnostics, three-address code (C/C++ full; Java/Python/JS get tokens + honest limits) |
| Run (+ stdin box) | Sandboxed compile + run in 5 languages with output capture |
| AI Studio | Prompt → code, line-by-line explanations + complexity, debugger with verified fixes, optimizer with before/after |
| Problems | 15 DSA problems, Run sample, Submit to judge, generated test cases, progressive hints 1–4 |
| Learn | Concept Q&A with example + practice question |
| Undo/Redo | Toolbar buttons + Ctrl+Z/Y |
| Save (Ctrl+S) | Creates/updates a project in MongoDB (requires sign-in) |
| History | Analyze/Run auto-recorded; shown on Dashboard recent activity |
| Projects sidebar | Lists saved projects, click to load, trash icon to delete |
| Practice | 15 concepts with picker, keyword-graded answers, attempts feed the dashboard |
| Login / Register | Real JWT authentication via backend (requires MongoDB) |
| Dashboard | Solved, success rate, streak, languages, difficulty progress, submissions, history, practice |
| Settings | Profile, password change, theme, editor defaults, toolchain status, delete account |

## Roadmap

See `docs/architecture.md` and the in-app Docs page.
