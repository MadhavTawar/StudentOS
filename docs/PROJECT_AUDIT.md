# StudentOS Project Audit and Verification

## Current verification snapshot — 2026-10-23

This section records checks performed on 2026-10-23 after the reference-driven UI work. The remainder preserves earlier product findings as historical evidence and is not a description of the current implementation.

### Verification evidence

| Check | Result | Evidence |
| --- | --- | --- |
| Backend test suite | **PASS** | `./run_tests.ps1` — **61 passed, 1 warning, 71.40s**. The warning is the Starlette/httpx `TestClient` deprecation notice. Test fixtures use in-memory SQLite. |
| Frontend lint | **PASS** | `npm run lint` — exit code 0 with no warnings after correcting the two warnings found during implementation. |
| TypeScript and production build | **PASS** | `npm run build` — `tsc -b` and Vite production build passed; 1,962 modules transformed. |
| Development frontend and public responsive smoke | **PASS** | Vite served the app on port 5173. `/app` redirected to `/login` when its `/api/v1/auth/me` request could not reach the backend. At 390, 768, 1280, and 1440px, the login page had no horizontal overflow and exposed one accessible email field and Sign In button. |
| Public keyboard/focus and reduced-motion smoke | **PASS** | On `/login`, keyboard traversal reached email, password, Sign In, and Create account; focus indicators were visible. Under `prefers-reduced-motion: reduce`, the page entrance animation resolved to `0.00001s`. This does not establish accessibility of authenticated pages. |
| Authenticated browser workflows | **NOT VERIFIED** | The API at `127.0.0.1:8000` refused connections and no safe development credentials/test data were available. Planner, goals, knowledge, AI, email review, workspace permissions, and authenticated responsive behavior were not exercised in the browser. |
| Backend development-server startup | **NOT RUN** | The backend lifespan calls `Base.metadata.create_all()` and startup migration helpers against the configured database. No isolated development database was established, so the service was not started to avoid modifying the user's configured database. See [`main.py`](../backend/app/main.py). |
| TypeScript runtime-validation skill runner | **NOT RUN** | The session's tool search did not expose the skill's `typescript_validate_runtime` tool. Its existing plan's build/server checks were run directly; no standalone result artifact was generated. |
| Git working tree | **PARTIAL** | The branch remains dirty with pre-existing UI changes plus this run's changes. `git diff --check` reports CRLF-related trailing whitespace in the already-modified [`Sidebar.tsx`](../frontend/src/components/layout/Sidebar.tsx); line endings were not normalized. No reset, commit, push, or deployment was performed. |

### Current architecture and security status

- The application now includes additive Alembic revisions for AI candidate date metadata and goals/milestones. Startup compatibility handling remains for legacy knowledge ownership/vector metadata; no destructive reset was performed during this audit.
- Planner behavior is implemented through [`PlannerPage.tsx`](../frontend/src/pages/PlannerPage.tsx); its deadline view now presents an interactive month grid and selected-day tasks using the existing user-owned task/deadline APIs in [`DeadlinesPage.tsx`](../frontend/src/pages/DeadlinesPage.tsx). Dashboard priority and task/deadline backend tests pass; these new frontend calendar interactions were not authenticated-browser-tested.
- Goals and milestones are implemented through [`goals.py`](../backend/app/api/v1/endpoints/goals.py), [`goal_service.py`](../backend/app/services/goal_service.py), and [`test_goals.py`](../backend/app/tests/test_goals.py). Milestones can link to planner tasks and progress is computed from completion state.
- Email proposals require review before task/deadline creation. Ambiguous dates require explicit confirmation, duplicate extraction is covered, and review authorization is tested in [`test_ai.py`](../backend/app/tests/test_ai.py).
- Knowledge retrieval is workspace-scoped. Published document/version rows are revalidated before model input and citations are returned from authorized chunks. Workspace membership, manager denial, replacement publication, archive exclusion, prompt-injection rejection, and local vector-store workspace matching are covered in [`test_knowledge.py`](../backend/app/tests/test_knowledge.py).
- Authentication uses signed session records and supports bearer or HttpOnly cookie authentication. Registration, login, logout/revocation, expiry, origin checks, account deletion, and deactivated/unauthenticated access are covered in [`test_auth.py`](../backend/app/tests/test_auth.py) and [`test_security.py`](../backend/app/tests/test_security.py).
- Workspace authorization is verified by membership on the `X-Workspace-ID` boundary. Personal data remains user-scoped while knowledge documents are workspace-scoped. The test suite covers invitations, member management denial, selected-workspace retrieval, and cross-user task/goal isolation.

### Current UI redesign phase audit

| Phase | Status | Current evidence and limitation |
| --- | --- | --- |
| 1 — Application shell | **PARTIAL** | Route-aware horizontal study navigation, active-workspace selection, account controls, and a workspace sidebar are implemented in [`Layout.tsx`](../frontend/src/components/layout/Layout.tsx), [`Navbar.tsx`](../frontend/src/components/layout/Navbar.tsx), and [`layout.css`](../frontend/src/layout.css). Build/lint pass; protected navigation, workspace switching, and drawer behavior were not browser-tested. |
| 2 — Main dashboard | **PARTIAL** | [`DashboardPage.tsx`](../frontend/src/pages/DashboardPage.tsx) now pairs existing task priorities with a month calendar whose event markers and selected-day list use dashboard API data. No authenticated UI interaction/data test was available. |
| 3 — Study planner | **PARTIAL** | [`DeadlinesPage.tsx`](../frontend/src/pages/DeadlinesPage.tsx) now includes month/date navigation, task completion, and selected-day deadlines/tasks; the existing task/deadline APIs and URL view state remain. Backend coverage passes, but the new calendar UI was not browser-tested. |
| 4 — Knowledge Hub and AI workspace | **PARTIAL** | [`KnowledgePage.tsx`](../frontend/src/pages/KnowledgePage.tsx) now has document selection, authorized PDF/image preview where the response content type supports it, citation-to-document navigation, and mobile panel tabs. The general assistant is explicitly distinguished from citation-backed Knowledge Q&A in [`AssistantPage.tsx`](../frontend/src/pages/AssistantPage.tsx). These authenticated flows remain browser-unverified. |
| 5 — Remaining pages, themes, responsive polish | **PARTIAL** | Existing page layouts remain; a light/dark preference selector and dark token overrides were added in [`SettingsPage.tsx`](../frontend/src/pages/SettingsPage.tsx) and [`index.css`](../frontend/src/index.css). Public login responsive smoke passed at four widths; authenticated page layouts, theme persistence, and complete keyboard traversal were not tested. |
| 6 — Final verification and documentation | **PARTIAL** | Backend tests, lint, TypeScript/build, Vite startup, public login responsive smoke, and this audit update passed. Protected workflows remain blocked by the unavailable backend service and credentials; there is no frontend test runner configured. |

### Historical product roadmap audit

The following table is preserved from the earlier product audit. Its phase names and statuses describe the pre-redesign product roadmap, not the current UI redesign phases above.

| Phase | Status | Current evidence and limitation |
| --- | --- | --- |
| 1 — Academic Planner | **PARTIAL** | Backend task/deadline/dashboard tests and production build pass. No frontend interaction/browser test verifies the Planner toggle and CRUD flows end-to-end. |
| 2 — Knowledge Hub | **PARTIAL** | Workspace authorization, document lifecycle, RAG citations, archive/replacement behavior, and injection handling pass in backend tests. Authenticated responsive management/Q&A UI flows are not browser-tested. The earlier Sidebar lint/access-state observation is historical; the current `npm run lint` passes without warnings. |
| 3 — Gmail proposal flow | **PARTIAL** | Backend tests cover extraction, approval, rejection/validation boundaries, ambiguity confirmation, duplicate extraction, provider failures, and injection resistance. Inbox UI interaction and immediate visual planner updates are not browser-tested. |
| 4 — Unified AI companion | **FAIL** | The assistant and knowledge Q&A remain separate frontend pages and backend endpoints; no combined context/citation/write-confirmation flow is implemented. |
| 5 — Optional study groups and cleanup | **PARTIAL** | Workspace membership/invitation and authorization tests pass, but responsive workspace UI flows, account privacy behavior in the browser, and all navigation terminology paths are not end-to-end tested. |

### Missing or insufficient tests

- No frontend unit, component, or browser test suite is configured; frontend claims are limited to lint, TypeScript/build, static smoke, and source inspection.
- Planner, Goals, Inbox approval, Knowledge Q&A, workspace switching, and responsive authenticated layouts lack browser-level interaction tests.
- RAG tests use a deterministic in-memory vector-store double for most cases; the local Chroma/embedding path is only covered by a narrow workspace-matching smoke test, not a full end-to-end ingestion and retrieval run.
- No test verifies every accessible page at mobile and desktop breakpoints, keyboard traversal through the protected shell, or screen-reader announcements during async loading/errors.
- The backend suite does not establish production PostgreSQL behavior, multi-process rate limiting, real Google OAuth, or real external AI provider availability.

## Historical audit — pre-RAG implementation baseline

The following sections were written before institute/workspace knowledge retrieval was implemented. Their statements about missing tables, routes, dependencies, roles, and retrieval are historical findings and must not be read as current-state claims.

## Scope and evidence

This audit records the repository state before adding institute document retrieval. It is based on the FastAPI routes, SQLAlchemy models, auth dependencies, AI service, frontend routes, declared backend requirements, the selected Python environment, and the current test fixtures. It does not inspect or modify `.env` values or user records in `studentos.db`.

## Existing architecture

- **Application shape:** One FastAPI application with versioned routes under `/api/v1`; route registration lives in `backend/app/api/v1/router.py`.
- **Persistence:** SQLAlchemy ORM with SQLite as the local default and a PostgreSQL configuration path. `backend/app/main.py` calls `Base.metadata.create_all()` on startup. Tests use an in-memory SQLite database and `Base.metadata.create_all()`/`drop_all()`.
- **Migration status:** Alembic is declared as a dependency, but there is no `backend/alembic.ini`, migration environment, or revision directory. There is no established schema migration workflow. `create_all()` creates missing tables but does not evolve existing tables.
- **Authentication:** `get_current_user` resolves a signed token from the authorization header or HttpOnly session cookie, fetches the active `User`, and rejects unauthenticated/deactivated accounts.
- **Authorization:** Existing business records are scoped by `user_id`. `User` has no role field or role relation, and there are no institute-wide document or staff-management routes. Registration creates ordinary users.
- **AI integration:** `AIService` selects the offline rule-based provider or Groq provider from configuration. Existing chat receives the authenticated user's task/deadline context; it has no institute document retrieval or citation contract.
- **Frontend:** A React/TypeScript SPA with protected pages inside `Layout`, a shared API client, and a study-oriented sidebar. No institute knowledge/library page or role-aware route currently exists.
- **Testing:** Backend tests use FastAPI `TestClient`, dependency overrides, and isolated in-memory SQLite. The AI tests already mock provider calls, providing a pattern for deterministic RAG tests.

## Dependency and runtime findings

`backend/requirements.txt` currently declares FastAPI, SQLAlchemy, Alembic, HTTP clients, multipart upload support, and the existing application dependencies. The selected `.venv` imports do not include a PDF or DOCX parser, Chroma, or a sentence-embedding package. Therefore, document ingestion and semantic retrieval are not available in the current environment yet.

Adding parser/vector/embedding dependencies must be an explicit manifest change, followed by installation and focused validation. The local embedding model may require a one-time model download; it must not require sending institute document text to a hosted embedding service. Provider failures and missing local model/dependency conditions must be surfaced as service errors rather than returning fabricated answers.

## Security and data boundaries

1. **Role enforcement belongs on the backend.** Hiding links in the SPA is not authorization. Each management endpoint must verify a configured institute administrator or an assigned document-manager role.
2. **No self-promotion.** Public registration must create a student only. Administrator bootstrap must require a one-time server secret and an authenticated operator; do not use an email allowlist because registration does not verify mailbox ownership. Subsequent staff-role assignments must be restricted to administrators and audited.
3. **Institute documents differ from personal data.** The current `user_id` ownership pattern is useful for student-owned data but cannot itself represent institute-wide documents. New institute tables need explicit lifecycle, uploader, current-version, and publication state.
4. **Upload paths and vector indexes are sensitive.** They must be stored outside frontend public/static directories with server-generated identifiers. Client filenames are display metadata only; path construction must not use them.
5. **Relational authorization is authoritative.** A vector index is a retrieval aid, not an access-control database. Search results must be filtered against current published document/version records before text is exposed to generation or returned as citations.
6. **RAG content is untrusted.** Extracted document text must not override system instructions. Model-produced citations must be resolved against retrieved chunk IDs and server-owned excerpts; fabricated or stale citations must be discarded.
7. **SQLite preservation:** New tables can be added without rebuilding or resetting the existing database. Avoid destructive startup behavior and test schema changes using isolated databases. Any future changes to existing tables require explicit additive migration handling.

## Recommended implementation boundaries

- Keep the feature in the current modular monolith: dedicated document and knowledge endpoints/services, SQLAlchemy records, and a provider-independent retrieval service.
- Add institute roles as new relational data or another additive schema change; bootstrap one administrator with a one-time secret and do not add role selection to public registration.
- Model documents, immutable versions, processing/publication state, uploader metadata, chunk references, and append-only audit events separately from student tasks/deadlines.
- Use a replaceable vector-store adapter and a persistent local index under a configurable private data directory. Keep source-file access and authorization in the relational layer.
- Implement processing as a visible lifecycle: validate, extract, chunk, embed/index, then publish only after every required step succeeds. Failed processing must leave the prior current version available and must never publish a partial replacement.
- Return structured answers with validated source references, explicit insufficient-evidence responses, and a transparent conflict response. Keep task/deadline creation behind explicit student confirmation.
- Extend the existing cookie-authenticated API client, protected layout, and sidebar for role-aware navigation while retaining backend authorization as the security boundary.
- Reuse the in-memory SQLite test fixture and mock model/vector/provider boundaries. Add synthetic evaluation data; do not use actual student records or institute documents for tests.

## Main risks and open implementation constraints

| Risk | Required control |
| --- | --- |
| Existing database has no migration history | Add only new tables initially; document and test any necessary additive migration before rollout. Never reset the local database. |
| Staff role misconfiguration | Make student the only registration role; bootstrap admin through an explicit server-side allowlist and audit all grants/revocations. |
| Stale vector chunks reveal archived/replaced content | Check document and version state in the relational database before passing chunks to the model or returning them. |
| Parser resource exhaustion or malformed files | Enforce size, content/signature, page/complexity limits and bounded processing; return clear errors. |
| Embedding/vector dependencies or model unavailable | Keep dependencies behind a small adapter, surface readiness/process errors, and avoid publishing until indexing succeeds. |
| Prompt injection or model-invented policy claims | Treat source text as data, constrain generation to supplied evidence, validate every citation server-side, and test adversarial documents. |
| Large feature spans API, persistence, model, and UI | Deliver in phases with isolated tests after each boundary; do not represent unimplemented phases as complete. |

## Audit conclusion

The repository has suitable foundations for an MVP: authenticated FastAPI endpoints, SQLAlchemy persistence, an AI provider abstraction, in-memory backend tests, and a protected React shell. The essential missing foundations are institute roles, document/version lifecycle, safe extraction, local embeddings/vector persistence, and relationally-authorized retrieval. Implementing these as additive modules and tables is compatible with the current architecture; the absence of an existing migration workflow and of the required parser/vector packages must be addressed explicitly before production use.
