# Codexa AI — API contract roadmap

Envelope: `{ success: true, data }` on success, `{ success: false, error: { message, details? } }` on failure.

| Method + path | Phase | Notes |
|---|---|---|
| `GET /api/health` | 1 ✅ | Liveness probe |
| `POST /api/auth/register` | 9 | zod-validated, bcrypt hash, JWT |
| `POST /api/auth/login` | 9 | |
| `GET /api/auth/me` | 9 | Bearer JWT |
| `POST /api/analyze` | 4–6 | Full pipeline + Clang |
| `POST /api/run` | 6 | Sandboxed, time/mem/output limits |
| `POST /api/compiler/tokens` | 3 ✅ | Validated (zod), stats + diagnostics |
| `POST /api/compiler/ast` | 4 | |
| `POST /api/compiler/intermediate-code` | 5 | |
| `POST /api/ai/explain` | 7 | Rate-limited, schema-validated |
| `POST /api/ai/fix` | 7 | Proposes diff, never applies |
| `POST /api/ai/tutor` | 7/10 | |
| `GET/POST /api/history`, `GET/DELETE /api/history/:id` | 9 | Ownership-checked |
| `GET /api/practice`, `POST /api/practice/generate`, `POST /api/practice/submit` | 10 | Stored attempts |

Payload limits (256kb JSON in Phase 1; stricter per-route limits from Phase 3).
Validation: zod (server) from Phase 3; AI responses schema-validated in Phase 7.
