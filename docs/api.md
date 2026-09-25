# Codexa AI — API contract

Envelope: `{ success: true, data }` on success, `{ success: false, error: { message, details? } }` on failure.

| Method + path | Phase | Notes |
|---|---|---|
| `GET /api/health` | 1 ✅ | Liveness probe |
| `POST /api/auth/register` | 9 ✅ | zod-validated, bcrypt hash, JWT |
| `POST /api/auth/login` | 9 ✅ | |
| `GET /api/auth/me` | 9 ✅ | Bearer JWT |
| `PATCH /api/auth/profile` | 9 ✅ | Rename display name |
| `PUT /api/auth/password` | 9 ✅ | Current + new password |
| `DELETE /api/auth/account` | 9 ✅ | Deletes user + projects + history + attempts + submissions |
| `POST /api/compiler/tokens` | 3 ✅ | Validated (zod), stats + diagnostics |
| `POST /api/compiler/ast` | 4 ✅ | AST + symbols + combined diagnostics |
| `POST /api/compiler/intermediate-code` | 5 ✅ | Full pipeline + TAC generation |
| `POST /api/run` | 6 ✅ | Sandboxed, stdin, C/C++/Java/Python/JS |
| `POST /api/ai/explain` | 7 ✅ | Rate-limited, schema-validated |
| `POST /api/ai/fix` | 7 ✅ | Proposes diff, never applies |
| `POST /api/ai/tutor` | 7 ✅ | |
| `POST /api/ai/generate` | AI ✅ | Prompt → code (offline-first) |
| `POST /api/ai/explain-code` | AI ✅ | Line-by-line + complexity |
| `POST /api/ai/debug` | AI ✅ | Real diagnostics + verified fix |
| `POST /api/ai/optimize` | AI ✅ | Issues + before/after complexity |
| `POST /api/ai/testcases` | AI ✅ | Sample / edge / large cases |
| `POST /api/ai/learn` | AI ✅ | Concept Q&A + practice |
| `POST /api/ai/hints` | AI ✅ | Progressive hints 1–4 |
| `GET/POST /api/projects`, `GET/PUT/DELETE /api/projects/:id` | 9 ✅ | Ownership-checked |
| `GET/POST /api/history`, `GET/DELETE /api/history/:id` | 9 ✅ | Auto-recorded by Analyze/Run, ownership-checked |
| `GET /api/practice`, `GET /api/practice/concepts`, `POST /api/practice/generate`, `POST /api/practice/submit` | 10 ✅ | 15 concepts, stored attempts |
| `GET /api/problems`, `GET /api/problems/:id` | DSA ✅ | 15 judge problems, filters |
| `POST /api/problems/:id/submit` | DSA ✅ | Judge + saved submission (auth) |
| `POST /api/judge` | DSA ✅ | One-off judge, unsaved (auth) |
| `GET /api/dashboard/stats` | 9–10 ✅ | Solved, streak, languages, history, practice |
| `GET /api/toolchain/status` | ✅ | C/C++/Java/Python/JS availability |

Payload limits (256kb JSON; stricter per-route limits for source/stdin).
Validation: zod (server); AI responses schema-validated.
