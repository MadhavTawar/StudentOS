# StudentOS Institute Knowledge RAG: Project Audit

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
|---|---|
| Existing database has no migration history | Add only new tables initially; document and test any necessary additive migration before rollout. Never reset the local database. |
| Staff role misconfiguration | Make student the only registration role; bootstrap admin through an explicit server-side allowlist and audit all grants/revocations. |
| Stale vector chunks reveal archived/replaced content | Check document and version state in the relational database before passing chunks to the model or returning them. |
| Parser resource exhaustion or malformed files | Enforce size, content/signature, page/complexity limits and bounded processing; return clear errors. |
| Embedding/vector dependencies or model unavailable | Keep dependencies behind a small adapter, surface readiness/process errors, and avoid publishing until indexing succeeds. |
| Prompt injection or model-invented policy claims | Treat source text as data, constrain generation to supplied evidence, validate every citation server-side, and test adversarial documents. |
| Large feature spans API, persistence, model, and UI | Deliver in phases with isolated tests after each boundary; do not represent unimplemented phases as complete. |

## Audit conclusion

The repository has suitable foundations for an MVP: authenticated FastAPI endpoints, SQLAlchemy persistence, an AI provider abstraction, in-memory backend tests, and a protected React shell. The essential missing foundations are institute roles, document/version lifecycle, safe extraction, local embeddings/vector persistence, and relationally-authorized retrieval. Implementing these as additive modules and tables is compatible with the current architecture; the absence of an existing migration workflow and of the required parser/vector packages must be addressed explicitly before production use.
