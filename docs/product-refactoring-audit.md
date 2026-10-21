# StudentOS Product Refactoring Audit

**Audit date:** 2026-10-21  
**Scope:** Phase 0 of the personal-first product simplification workflow.

## Evidence labels

- **Verified** means confirmed in the current source, route registration, model, or test.
- **Assumption / direction** means a product interpretation from the requested direction, not a claim about existing behavior.

No application code, data, API contract, or database schema was changed for this audit.

## Current application surfaces

### Frontend routes

Verified in `frontend/src/App.tsx`:

| Route | Current page |
|---|---|
| `/` | Marketing home |
| `/login`, `/register` | Authentication |
| `/oauth/callback` | Gmail OAuth callback |
| `/join` | Workspace invitation acceptance |
| `/app` | Study desk / dashboard |
| `/app/tasks` | Coursework tasks |
| `/app/deadlines` | Calendar / deadlines |
| `/app/inbox` | Gmail inbox |
| `/app/assistant` | Study companion |
| `/app/knowledge` | Shared workspace library and knowledge Q&A |
| `/app/knowledge/manage` | Knowledge document management |
| `/app/reminders` | Reminders and notifications |
| `/app/settings` | Preferences and account settings |
| `/app/workspaces` | Workspace and member management |
| `/app/billing` | Plan and billing foundation |

The sidebar currently exposes separate Coursework and Calendar links, separate Shared library and conditional Library manager links, a separate Reminders link, and a Workspaces link. The dashboard has task and deadline previews plus links to the separate task and deadline pages. No frontend test runner or frontend test files are configured; `frontend/package.json` currently defines `lint` and `build`, but not `test`.

### Backend API route groups

Verified in `backend/app/api/v1/router.py`; all groups are mounted under `/api/v1`:

| Group | Relevant endpoints |
|---|---|
| Authentication | `/auth` |
| Dashboard | `/dashboard` |
| Tasks | `/tasks` |
| Deadlines | `/deadlines` |
| Gmail | `/gmail` |
| AI | `/ai` |
| Reminders and notifications | `/reminders` |
| Preferences | `/preferences` |
| Knowledge | `/knowledge` |
| Workspaces | `/workspaces` |

The planner consolidation is a frontend navigation/presentation change unless later evidence identifies an API need. The task and deadline API groups and their models are distinct.

## Product overlaps and dependencies

### Planner: tasks and deadlines

**Verified current behavior**

- `TasksPage` uses the task API for create, edit, delete, toggle, search/filter, and sorting. The task service scopes records by `user_id`.
- `DeadlinesPage` uses the deadline API for create, edit, delete, filters, duplicate warnings, and task association. The deadline service scopes records by `user_id`.
- The `Task` and `Deadline` models are separate. A deadline may optionally reference a task through `task_id`; no schema merge is needed for a unified view.
- Reminder records can optionally reference either a task or a deadline. These relations are already represented in `Reminder`.
- Backend coverage includes task CRUD/isolation/stats tests and deadline create/list/duplicate-detection tests. There are no frontend interaction tests.

**Dependencies for a unified Planner**

- Frontend routes and navigation: `frontend/src/App.tsx`, `frontend/src/components/layout/Sidebar.tsx`.
- Existing UI and state behavior: `frontend/src/pages/TasksPage.tsx`, `frontend/src/pages/DeadlinesPage.tsx`.
- Dashboard links/previews: `frontend/src/pages/DashboardPage.tsx`.
- API and authorization: `backend/app/api/v1/endpoints/tasks.py`, `backend/app/api/v1/endpoints/deadlines.py`, `backend/app/services/task_service.py`, `backend/app/services/deadline_service.py`.
- Models: `backend/app/models/task.py`, `backend/app/models/deadline.py`, `backend/app/models/reminder.py`.

**Assumption / direction:** A single Planner destination can host Tasks and Calendar/Deadlines views while preserving user-owned task and deadline records and their existing separate APIs. The workspace selector does not make tasks/deadlines shared: their current ownership is per user, not per workspace.

### Knowledge: Explore, Ask, and Manage

**Verified current behavior**

- `/app/knowledge` lists published resources and provides document Q&A. `/app/knowledge/manage` provides upload, version replacement, publish, archive, and download actions.
- The frontend hides the management navigation link when the access response says the current user cannot manage documents. This is presentation only.
- Backend management endpoints independently call `require_document_manager`; that helper requires the current workspace membership role to be `owner` or `admin`. The selected workspace is resolved server-side from membership, with an omitted workspace header defaulting to the user's personal workspace.
- Q&A requires the selected/current workspace. Retrieval verifies the workspace and both document and version are published in SQL before using chunks; it attaches citations from the authorized document/version. Archived or unpublished content is not returned as answer evidence.
- Tests cover member denial on a management endpoint, personal/group workspace scoping, published library and Q&A behavior, citations, archival exclusion, and replacement-version publication.
- The `KnowledgeDocument` model is workspace-scoped and has version/chunk/audit models. The library currently presents workspace resources, not a combined view explicitly distinguishing personal from group resources.

**Dependencies for one Knowledge Hub**

- Frontend routes/navigation/pages: `frontend/src/App.tsx`, `frontend/src/components/layout/Sidebar.tsx`, `frontend/src/pages/KnowledgePage.tsx`, `frontend/src/pages/KnowledgeAdminPage.tsx`, and their CSS files.
- API permissions and retrieval: `backend/app/api/v1/endpoints/knowledge.py`, `backend/app/api/workspace_deps.py`, `backend/app/services/knowledge_service.py`, `backend/app/services/knowledge_vector_store.py`.
- Models and authorization: `backend/app/models/knowledge.py`, `backend/app/models/workspace.py`, `backend/app/services/workspace_service.py`.
- Existing backend coverage: `backend/app/tests/test_knowledge.py`.

**Risk / wording:** The document-processing error string in `knowledge_service.py` still says “Institute document processing failed,” although the product direction is student-owned resources and optional study groups. Avoid presenting student uploads as official institute material; review and replace misleading user-facing copy during the relevant phase.

### Assistant and knowledge Q&A

**Verified current behavior**

- `POST /api/v1/ai/assistant/chat` calls `AIService.chat_with_assistant`, which supplies up to ten tasks and five upcoming deadlines for the authenticated user to the configured AI provider. It does not call knowledge retrieval or return knowledge citations.
- `POST /api/v1/knowledge/chat` is a separate endpoint. It requires a current workspace resolved through membership, filters evidence to published documents and versions in that workspace, and returns citations or an insufficient-evidence response.
- Existing AI tests cover email candidate approval, missing deadline dates, provider errors, mocked Groq output, evidence validation, missing provider keys, and prompt-injection handling. Knowledge tests cover workspace-scoped retrieval and citations. The current tests do not establish a unified chat's cross-workspace behavior or student-confirmed study-plan write flow.

**Dependencies for a unified companion**

- Frontend: `frontend/src/pages/AssistantPage.tsx`, `frontend/src/pages/KnowledgePage.tsx`, `frontend/src/lib/api.ts`, `frontend/src/types/`.
- Routes/services: `backend/app/api/v1/endpoints/ai.py`, `backend/app/api/v1/endpoints/knowledge.py`, `backend/app/services/ai_service.py`, `backend/app/services/knowledge_service.py`, provider implementations in `ai_service.py`.
- Authorization: current-user ownership for task/deadline context; workspace membership and published-document filtering for knowledge context. Both checks must remain server-side if context is combined.
- Tests: `backend/app/tests/test_ai.py`, `backend/app/tests/test_knowledge.py`.

**Risk:** Knowledge text and user prompts are untrusted. The current knowledge service checks instruction-like content and the provider treats retrieved content as untrusted data. A combined assistant must retain equivalent protections and validated citations and must not create records merely because a model suggests a plan.

### Reminders

**Verified current behavior**

- Reminders have their own `/app/reminders` page and `/api/v1/reminders` API. They can reference a task or deadline and have a single existing background scheduler started from the application lifespan.
- The reminder service and notification endpoints use the authenticated user's records. This is a separate surface from task/deadline CRUD, even though reminders may be linked to those records.
- Relevant implementation: `frontend/src/pages/RemindersPage.tsx`, `backend/app/api/v1/endpoints/reminders.py`, `backend/app/services/reminder_service.py`, `backend/app/models/reminder.py`, `backend/app/main.py`.

**Assumption / direction:** Reminders may be surfaced from the Planner or proposal review as an optional action, but their current service and scheduler should be reused; no second scheduler or notification engine is warranted.

### Workspaces and billing

**Verified current behavior**

- Registration creates a personal workspace with an owner membership and a free plan record. If no workspace header is supplied, the backend resolves the user's personal workspace.
- Users can create non-personal workspaces, create one-use invitations, join invited workspaces, and switch the active workspace in the frontend. The workspace service currently labels a created non-personal workspace as `workspace_type="organization"`; the model and membership roles are persisted.
- The UI and API use “Workspaces” terminology. No faculty/institute account is required for ordinary registration or personal-workspace use.
- The billing page explicitly says no payment provider is connected and no charge will be made; it is a foundation, not active payments.
- Relevant files: `frontend/src/components/layout/Sidebar.tsx`, `frontend/src/pages/WorkspacesPage.tsx`, `frontend/src/pages/JoinWorkspacePage.tsx`, `frontend/src/pages/BillingPage.tsx`, `backend/app/api/v1/endpoints/workspaces.py`, `backend/app/services/workspace_service.py`, `backend/app/models/workspace.py`.
- Knowledge permissions are workspace-based. Gmail, tasks, deadlines, and reminders are user-owned in their current models/services; workspace membership must not grant access to another member's private records.

**Assumption / direction:** “Study groups” is a clearer optional UI concept for shared workspaces, but renaming persisted `workspace_type` values or changing membership/deletion policy is not implied. Preserve the personal workspace default and existing access rules unless a future phase requires a separately approved data or authorization change.

## Gmail proposal-to-planner flow

**Verified current behavior**

- Inbox email extraction creates `AIExtractionCandidate` proposal rows; approval or modification through the review endpoint is required before a task or deadline is created. Rejecting a proposal creates no task/deadline.
- Candidate review checks `validation_status == "pending_review"` and rejects a second review with 409. Existing tests verify approval creates a record and a second approval does not create another.
- Extraction stores a new candidate each time. `source_email_id` is indexed but is not unique, and no current test verifies idempotency when the same email is extracted again.
- The task/deadline services store approved records in the same records read by the planner pages. No automatic reminder creation is visible in the existing candidate-review flow.
- Relevant files: `frontend/src/pages/InboxPage.tsx`, `frontend/src/pages/AssistantPage.tsx` (pending-proposal presentation), `backend/app/api/v1/endpoints/ai.py`, `backend/app/services/ai_service.py`, `backend/app/models/ai_candidate.py`, `backend/app/tests/test_ai.py`.

**Phase 3 test gaps to address:** repeated extraction of the same message, duplicate detection across title/date, rejection side effects, review failure messages, and immediate visibility of approved records in Planner. Any schema constraint or data migration must be designed to preserve existing candidate records and reviewed state.

## Test and verification gaps

### Verified baseline

| Check | Command | Result |
|---|---|---|
| Backend tests | `python -m pytest -o pythonpath=. -q backend/app/tests` | **56 passed**, 1 third-party protobuf deprecation warning, 133.23 seconds |
| Frontend lint | From `frontend`: `npm run lint` | **Passed**, no lint warnings reported |
| TypeScript check | From `frontend`: `npm exec -- tsc --noEmit -p tsconfig.app.json` | **Passed**, no diagnostics |
| Frontend production build (includes `tsc -b`) | From `frontend`: `npm run build` | **Passed**, Vite 8.3.4; 1,962 modules transformed |

Frontend commands must run from the `frontend` directory. There is no configured frontend test framework; do not introduce one without product-owner approval.

### Coverage gaps confirmed by current test inventory

- No frontend unit, component, or browser test suite is configured.
- Planner behavior is covered at the backend API/service level, not through a combined Planner navigation or view.
- Knowledge has meaningful permission and retrieval coverage, but a combined Explore/Ask/Manage interface does not exist to test.
- There is no single assistant test covering combined task/deadline and workspace-authorized knowledge context, citations, missing evidence, provider failure, and write confirmation.
- Candidate tests cover human approval and duplicate review, but not repeated extraction idempotency or linked reminder choice.
- Workspace tests cover personal workspace creation, invitations, and a member's lack of document-management permission; they do not prove every UI navigation simplification or every privacy case requested for leaving a group.

## Risks and guardrails

1. **Keep ownership domains distinct.** Planner task/deadline data and Gmail/reminder data are user-scoped; knowledge data is workspace-scoped. A shared UI must not silently change ownership or access.
2. **Do not merge Task and Deadline models.** Their APIs and relations are separate; a deadline may optionally reference a task.
3. **Keep backend authorization authoritative.** Hiding Manage or group controls in React does not protect direct API calls.
4. **Treat email and documents as untrusted.** Retain sanitization, injection checks, source validation, and citation validation when composing AI context.
5. **No implicit AI writes.** Existing candidate review is the explicit approval boundary. Study-plan suggestions need an equivalent confirmation boundary before writes.
6. **No new scheduler/payment service.** Existing reminders use one scheduler; billing currently has no connected provider.
7. **Avoid destructive data changes.** No schema change is needed for a frontend-only consolidation. If later work requires one, add an Alembic revision, preserve existing data, and test on fresh and copied databases. Ask before destructive migrations, authorization changes, integration removal, or major architecture changes.
8. **Use accurate source language.** Student uploads and shared student resources are not official institute material.

## Likely files by phase

These are likely touchpoints, not a commitment that every file will change.

| Phase | Likely frontend files | Likely backend/tests/docs |
|---|---|---|
| 1 — Academic Planner | `App.tsx`, `components/layout/Sidebar.tsx`, `DashboardPage.tsx`, `TasksPage.tsx`, `DeadlinesPage.tsx`; possibly new shared Planner components | Existing task/deadline APIs and services should remain unchanged; `test_tasks.py`, `test_deadlines.py` for regressions |
| 2 — Knowledge Hub | `App.tsx`, `components/layout/Sidebar.tsx`, `KnowledgePage.tsx`, `KnowledgeAdminPage.tsx`, `KnowledgePage.css`, `KnowledgeAdminPage.css`; possibly shared tab/view components | `knowledge.py`, `knowledge_service.py`, workspace dependencies only if an authorization/retrieval gap is found; `test_knowledge.py`; correct misleading user-facing wording |
| 3 — Gmail proposal flow | `InboxPage.tsx`, `AssistantPage.tsx` | `ai.py`, `ai_service.py`, possibly `ai_candidate.py` and a migration only if needed; `test_ai.py`, and reminder service/tests only if offering reminder creation |
| 4 — Unified AI companion | `AssistantPage.tsx`, `KnowledgePage.tsx`, `api.ts`, `types/` | `ai.py`, `ai_service.py`, `knowledge_service.py`, possibly schemas; `test_ai.py`, `test_knowledge.py`, new authorization/confirmation cases |
| 5 — Optional study groups and cleanup | `Sidebar.tsx`, `WorkspacesPage.tsx`, `JoinWorkspacePage.tsx`, `SettingsPage.tsx`, `BillingPage.tsx`, and navigation call sites | `workspace_service.py` or endpoints only if required by verified privacy gaps; workspace/knowledge tests; update affected product/security docs |

## Assumptions for later phases

- Phase 1 should treat Planner as a frontend presentation over the existing separate task and deadline APIs. Tasks and deadlines remain per-user, even while the active workspace is a study group.
- Phase 2 Explore should label personal versus group knowledge by actual workspace identity and membership rather than by document title or user-provided description.
- Phase 4 should use the selected workspace only for knowledge retrieval. Task/deadline context remains restricted to the authenticated user's own records.
- Phase 5 should not rename or delete persisted workspace data as part of a UI terminology change.
- No frontend testing framework is added unless separately approved.
