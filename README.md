# Codexa AI — Phase 1: Foundation & UI

Intelligent compiler analysis + AI coding tutor (MERN). This build ships **Phase 1 only**:
project scaffolding, design system, landing page, IDE shell layout, Express skeleton,
and docs. Compiler engines (Phases 3–6) and AI (Phase 7) are explicitly marked in the UI.

## Architecture

- `frontend/` — React 19 + Vite 8 + Tailwind v4 + React Router (dev server on **port 2000**). Pages: Landing, Compiler
  (IDE shell), Dashboard (empty until real data), Login/Register (demo session), Docs.
- `backend/` — Express 4 API (port 5000). Phase 1 exposes `GET /api/health` + JSON 404 handler.
  Compiler/AI/history/practice routers arrive with their phases.
- `compiler/` — placeholder; real lexer/parser/semantic/TAC land in Phases 3–5.
- `docs/` — `architecture.md` (module map) and `api.md` (REST contract roadmap).

## Prerequisites

- Node.js ≥ 20, npm ≥ 10
- MongoDB 8.x running locally (Windows service `MongoDB`); database `codexa`
  is bootstrapped via `cd backend; npm run db:setup` (collections + validators + indexes)
- (Later) Clang for Phase 6

## Run it

```powershell
# Backend (http://localhost:5000)
cd backend; npm install; npm run dev

# Frontend (http://localhost:2000, proxies /api to backend)
cd frontend; npm install; npm run dev
```

## Verify Phase 1

```powershell
# From repo root:
node --test "compiler/tests/*.test.js"  # lexer unit tests
cd backend; npm test                    # health + 404 + tokens endpoint
cd ../frontend; npm run build           # production build must succeed
```

## What works vs. what's marked

| Action | Phase 1 behavior |
|---|---|
| Edit code / switch samples / Reset | Works locally |
| Analyze / Run / Save | Shows "not wired yet" status, takes no fake action |
| AI Detective / AST / TAC tabs | Empty states naming their phase |
| Dashboard | Dashes, no mocked numbers |
| Login/Register | Local demo session only (JWT in Phase 9) |

## Roadmap

See `docs/architecture.md` and the in-app Docs page. Next: **Phase 2 — Monaco editor**.
