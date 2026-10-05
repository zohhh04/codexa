# Codexa — Compiler Design Lab

An interactive Compiler Design learning app (MERN). Write code, generate code
with AI, and analyze **your actual code** through every compiler phase — with an
AI tutor beside you.

> Nothing is hardcoded. Change the code, and every result updates.

## Features (8 only)

| # | Feature | What it does |
|---|---------|--------------|
| 1 | Code Editor | Write C, C++, Java or Python — syntax highlighting, line numbers, language selector, samples |
| 2 | Lexical Analysis | Tokenizes your code: keywords, identifiers, operators, literals, separators — token table |
| 3 | Syntax Analysis | Grammar check on your code: line, problem, and plain explanation of each error |
| 4 | Parse Tree / AST | Interactive tree built from your code — click a node to highlight its source |
| 5 | Semantic Analysis | Undeclared variables, type mismatches, scope errors — with line + explanation |
| 6 | Code Optimization | Constant folding, propagation, dead-code removal, common-subexpression fixes — only when they apply |
| 7 | AI Coding Tutor | Ask about your code or compiler concepts — simple hints, beginner-friendly |
| 8 | AI Code Generation | Describe a program → code appears in the editor, ready to analyze and run |

Plus **Run** (sandboxed execution with stdin) so generated or handwritten code can be executed.

## How it works

```
Write code  →  OR generate with AI  →  Analyze
  → Tokens → Syntax → AST → Semantics → Optimize → Run
  → Ask the AI Tutor anything along the way
```

## Tech stack

- **Frontend:** React + Vite + Tailwind CSS + Monaco Editor + React Flow (AST)
- **Backend:** Node.js + Express (REST API)
- **Database:** MongoDB (optional — app runs without it; persistence is out of scope for this build)
- **AI:** OpenAI-compatible API via `AI_API_KEY` (offline templates when no key is set — responses say so)

## Run it

```powershell
# Backend (http://localhost:5000)
cd backend; npm install; npm run dev

# Frontend (http://localhost:2000, proxies /api to backend)
cd frontend; npm install; npm run dev
```

Open http://localhost:2000 → **Open Studio**.

## API (core)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/compiler/tokens` | Lexical analysis `{ sourceCode, language }` |
| POST | `/api/compiler/ast` | Parse + semantic `{ ast, symbols, diagnostics }` |
| POST | `/api/compiler/intermediate-code` | Full pipeline + diagnostics |
| POST | `/api/compiler/optimize` | Optimizations for the actual code |
| POST | `/api/run` | Sandboxed compile + run `{ sourceCode, language, stdin }` |
| POST | `/api/ai/tutor` | Tutor Q&A `{ question, sourceCode }` |
| POST | `/api/ai/generate` | Code generation `{ prompt, language }` |
| GET  | `/api/ai/status` | Whether an LLM key is configured |
| GET  | `/api/health` | Health check |

Languages: `c`, `cpp`, `java`, `python`.

## Verify

```powershell
node --test "compiler/tests/*.test.js"
cd backend; npm test
cd ../frontend; npm run build
```
